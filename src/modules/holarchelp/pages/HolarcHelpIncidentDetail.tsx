import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LiveMap } from "../components/LiveMap";
import { VoiceNoteAudio } from "../components/VoiceNoteAudio";
import { IncidentTimeline } from "../components/IncidentTimeline";
import { IncidentVoiceNoteRecorder } from "../components/IncidentVoiceNoteRecorder";
import { EtaCountdown } from "../components/EtaCountdown";
import { IncidentPhotos } from "../components/IncidentPhotos";
import { AvailableResponders } from "../components/AvailableResponders";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageCircle, Loader2, AlertTriangle, ArrowLeft, Phone, History, Share2, FileText, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLocationTracking } from "../hooks/useLocationTracking";
import { useAuth } from "@/hooks/useAuth";
import { buildSosMessage, waLink } from "../lib/whatsapp";
import { getPublicTrackUrl } from "../lib/public-track-url";

type Loc = { latitude: number; longitude: number; recorded_at: string };

export default function HolarcHelpIncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incident, setIncident] = useState<any | null>(null);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [profileName, setProfileName] = useState("Your contact");
  const [responder, setResponder] = useState<{ name: string; kind: "ambulance" | "hospital"; latitude: number | null; longitude: number | null } | null>(null);
  const [autoAssigned, setAutoAssigned] = useState(false);
  const [pendingOffers, setPendingOffers] = useState<number>(0);

  useEffect(() => {
    if (!id) return;
    const refetchIncident = () =>
      supabase.from("holarchelp_incidents" as any).select("*").eq("id", id).maybeSingle()
        .then(({ data }) => setIncident(data));
    refetchIncident();
    supabase.from("holarchelp_locations" as any).select("latitude, longitude, recorded_at")
      .eq("incident_id", id).order("recorded_at", { ascending: false }).limit(200)
      .then(({ data }) => setLocations((data as any) ?? []));
    if (user) {
      supabase.from("holarchelp_emergency_contacts" as any).select("id, name, phone").eq("user_id", user.id)
        .then(({ data }) => setContacts((data as any) ?? []));
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
        .then(({ data }) => { if (data?.full_name) setProfileName(data.full_name); });
    }

    const ch = supabase.channel(`holarchelp-incident-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "holarchelp_locations", filter: `incident_id=eq.${id}` },
        (p) => setLocations((prev) => [p.new as any, ...prev].slice(0, 200)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "holarchelp_incidents", filter: `id=eq.${id}` },
        (p) => setIncident((prev: any) => ({ ...(prev ?? {}), ...(p.new as any) })))
      .subscribe();

    const onFocus = () => refetchIncident();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [id, user]);

  // Fetch responder name (ambulance OR hospital) when assigned, plus detect auto-assignment
  useEffect(() => {
    if (!incident?.assigned_provider_id || !id) { setResponder(null); setAutoAssigned(false); return; }
    const pid = incident.assigned_provider_id;
    (async () => {
      const [{ data: amb }, { data: hosp }, { data: ev }] = await Promise.all([
        supabase.from("holarchelp_ambulance_providers" as any).select("company_name, latitude, longitude").eq("id", pid).maybeSingle(),
        supabase.from("holarchelp_hospitals" as any).select("name, latitude, longitude").eq("id", pid).maybeSingle(),
        supabase.from("holarchelp_incident_events" as any)
          .select("event_type").eq("incident_id", id)
          .in("event_type", ["auto_assigned", "patient_picked", "accepted"])
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if ((amb as any)?.company_name) {
        const a: any = amb;
        setResponder({ name: a.company_name, kind: "ambulance", latitude: a.latitude ?? null, longitude: a.longitude ?? null });
      } else if ((hosp as any)?.name) {
        const h: any = hosp;
        setResponder({ name: h.name, kind: "hospital", latitude: h.latitude ?? null, longitude: h.longitude ?? null });
      } else setResponder(null);
      setAutoAssigned((ev as any)?.event_type === "auto_assigned");
    })();
  }, [incident?.assigned_provider_id, id]);

  // Track pending offers count while open
  useEffect(() => {
    if (!id) return;
    const load = () => supabase.from("holarchelp_incident_offers" as any)
      .select("id", { count: "exact", head: true }).eq("incident_id", id).eq("response", "pending")
      .then(({ count }) => setPendingOffers(count ?? 0));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [id]);

  const liveStatuses = ["open", "assigned", "en_route", "arrived", "patient_collected", "at_hospital", "reopened"];
  const isLive = !!incident && liveStatuses.includes(incident.status);
  useLocationTracking(id ?? null, isLive);

  // Periodic re-dispatch while open and unassigned (idempotent)
  const isUnassignedOpen = isLive && !incident?.assigned_provider_id;
  useEffect(() => {
    if (!id || !isUnassignedOpen) return;
    const tick = () => supabase.functions.invoke("dispatch-sos", { body: { incident_id: id } }).catch(() => {});
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, [id, isUnassignedOpen]);

  // Elapsed seconds since incident created (for "no responders yet" fallback after 90 s)
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!incident?.created_at) return;
    const update = () => setElapsed(Math.floor((Date.now() - new Date(incident.created_at).getTime()) / 1000));
    update();
    const t = setInterval(update, 5000);
    return () => clearInterval(t);
  }, [incident?.created_at]);
  const showNoResponders = isUnassignedOpen && pendingOffers === 0 && elapsed > 90;

  const callEmergency = () => { window.location.href = "tel:10177"; };
  const goHome = () => navigate("/patient/holarchelp");
  const shareLink = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Live emergency tracking", url: trackingUrl }); return; } catch { /* user cancelled */ }
    }
    await navigator.clipboard.writeText(trackingUrl);
    toast.success("Tracking link copied — share it with your contacts");
  };

  const trackingUrl = incident ? getPublicTrackUrl(incident.tracking_token) : "";
  const message = buildSosMessage(profileName, trackingUrl);

  

  const [closeOpen, setCloseOpen] = useState(false);
  const [closureNote, setClosureNote] = useState("");
  const [closing, setClosing] = useState(false);
  const resolve = async () => {
    if (!id) return;
    if (closureNote.trim().length < 10) {
      toast.error("Please add a brief write-up (at least 10 characters).");
      return;
    }
    setClosing(true);
    const { error } = await supabase.from("holarchelp_incidents" as any)
      .update({
        status: "completed",
        resolved_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        notes: closureNote.trim(),
      } as any).eq("id", id);
    setClosing(false);
    if (error) return toast.error(error.message);
    toast.success("Incident closed");
    navigate("/patient/holarchelp");
  };

  if (!incident) return <div className="p-5 text-muted-foreground">Loading…</div>;

  const mapPoints: import("../components/LiveMap").LiveMapPoint[] = [];
  if (locations[0]) {
    mapPoints.push({
      kind: "patient",
      latitude: locations[0].latitude,
      longitude: locations[0].longitude,
      label: profileName,
    });
  }
  // Prefer live provider GPS, otherwise fall back to provider's registered location
  const responderLat = incident.provider_latitude ?? responder?.latitude ?? null;
  const responderLng = incident.provider_longitude ?? responder?.longitude ?? null;
  if (responderLat != null && responderLng != null && responder) {
    mapPoints.push({
      kind: responder.kind,
      latitude: responderLat,
      longitude: responderLng,
      label: responder.name,
    });
  }

  // Straight-line distance + drive-time estimate (~40 km/h average urban)
  let distanceKm: number | null = null;
  let etaEstimateMin: number | null = null;
  if (locations[0] && responderLat != null && responderLng != null) {
    const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
    const a = { lat: locations[0].latitude, lng: locations[0].longitude };
    const b = { lat: responderLat, lng: responderLng };
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    distanceKm = 2 * R * Math.asin(Math.sqrt(x));
    etaEstimateMin = Math.max(1, Math.round((distanceKm / 40) * 60));
  }

  return (
    <div className="mx-auto max-w-md pb-6">
      {/* Sticky quick-action bar */}
      <div className="sticky top-0 z-30 -mx-4 mb-3 border-b bg-background/95 px-4 py-2 backdrop-blur md:mx-0 md:rounded-b-xl">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="shrink-0 gap-1" onClick={goHome}>
            <ArrowLeft className="h-4 w-4" /> SOS Home
          </Button>
          <div className="flex-1" />
          <Button size="icon" variant="destructive" className="h-9 w-9 rounded-full" onClick={callEmergency} aria-label="Call 10177" title="Call 10177">
            <Phone className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={shareLink} aria-label="Share tracking link" title="Share">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={() => navigate("/patient/holarchelp/nearby")} aria-label="Search nearby providers" title="Search nearby">
            <MapPin className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={() => navigate("/patient/holarchelp/incidents")} aria-label="Incident history" title="History">
            <History className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">{isLive ? "Active emergency" : "Incident closed"}</h1>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isLive ? "bg-sos/10 text-sos" : "bg-secondary text-primary"}`}>
          {(incident.status ?? "").toUpperCase().replace(/_/g, " ")}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Started {new Date(incident.created_at).toLocaleString()}</p>

      {showNoResponders && (
        <div className="mb-3 flex items-start gap-3 rounded-2xl border-2 border-red-500/50 bg-red-50 p-3 text-sm dark:bg-red-950/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold text-red-700">No ambulance has accepted yet.</p>
            <p className="text-xs text-red-700/80">We're still searching. Please consider calling an emergency line directly.</p>
            <Button size="sm" variant="destructive" className="mt-2 gap-1" onClick={callEmergency}>
              <Phone className="h-4 w-4" /> Call 10177 now
            </Button>
          </div>
        </div>
      )}

      {incident.status === "open" && !incident.assigned_provider_id && !showNoResponders && (
        <AvailableResponders incidentId={id!} createdAt={incident.created_at} />
      )}

      {incident.status === "reopened" && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl border-2 border-red-500/50 bg-red-50 p-3 text-sm dark:bg-red-950/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
          <div>
            <p className="font-semibold text-red-700">Your responder is unable to continue.</p>
            <p className="text-xs text-red-700/80">Finding the next available ambulance…</p>
          </div>
        </div>
      )}

      {responder && incident.assigned_provider_id && (
        <div className="mb-3 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50 p-4 dark:bg-emerald-950/20">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            {responder.kind === "hospital" ? "🏥 Receiving hospital" : "🚑 Responding"}
            {autoAssigned && <span className="ml-2 rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">AUTO-ASSIGNED</span>}
          </p>
          <p className="mt-0.5 text-base font-extrabold text-emerald-900 dark:text-emerald-100">{responder.name}</p>
          <div className="mt-1 flex items-center gap-4 text-sm text-emerald-900/80 dark:text-emerald-200/80">
            {responder.kind === "ambulance" && (
              <span>ETA: <EtaCountdown etaMinutes={incident.eta_minutes} lastUpdate={incident.last_eta_update} /></span>
            )}
            {incident.accepted_at && (
              <span className="text-xs">Accepted {new Date(incident.accepted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
        </div>
      )}

      <LiveMap points={mapPoints} />

      {(incident.voice_note_transcript || incident.voice_note_audio_url) && (
        <div className="mt-4 rounded-2xl border-2 border-red-600/40 bg-red-50 dark:bg-red-950/20 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Your initial voice note</p>
          {incident.voice_note_transcript && (
            <p className="text-sm whitespace-pre-wrap mb-2">{incident.voice_note_transcript}</p>
          )}
          {incident.voice_note_audio_url && <VoiceNoteAudio path={incident.voice_note_audio_url} />}
        </div>
      )}

      {!isLive && incident.notes && (
        <div className="mt-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50 p-4 dark:bg-emerald-950/20">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            <FileText className="h-3.5 w-3.5" /> Closure summary
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-900 dark:text-emerald-100">{incident.notes}</p>
        </div>
      )}

      <div className="mt-4"><IncidentVoiceNoteRecorder incidentId={id!} providerId={null} /></div>
      <div className="mt-4"><IncidentPhotos incidentId={id!} /></div>
      <div className="mt-4"><IncidentTimeline incidentId={id!} /></div>

      {isLive && contacts.length > 0 && (
        <div className="mt-4 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notify contacts on WhatsApp</p>
          <ul className="mt-3 space-y-2">
            {contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.phone ?? "No number"}</p></div>
                {c.phone && (
                  <Button asChild size="sm" className="gap-1.5 bg-[#25D366] text-white hover:bg-[#1ea952]">
                    <a href={waLink(c.phone, message)} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLive && (
        <Button onClick={() => setCloseOpen(true)} className="mt-6 h-14 w-full gap-2 rounded-2xl bg-primary text-base font-semibold">
          <CheckCircle2 className="h-5 w-5" /> Close incident
        </Button>
      )}

      <Dialog open={closeOpen} onOpenChange={(o) => !closing && setCloseOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close incident</DialogTitle>
            <DialogDescription>
              Add a brief write-up of the last activity or interaction with the patient before closing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="closure-note">Last activity / interaction</Label>
            <Textarea
              id="closure-note"
              value={closureNote}
              onChange={(e) => setClosureNote(e.target.value)}
              placeholder="e.g. Patient handed over to ER team at 14:52, conscious and stable."
              rows={5}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground">{closureNote.trim().length}/10 minimum characters</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCloseOpen(false)} disabled={closing}>Cancel</Button>
            <Button onClick={resolve} disabled={closing || closureNote.trim().length < 10} className="gap-2">
              {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Close incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
