import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LiveMap } from "../components/LiveMap";
import { VoiceNoteAudio } from "../components/VoiceNoteAudio";
import { IncidentTimeline } from "../components/IncidentTimeline";
import { IncidentVoiceNoteRecorder } from "../components/IncidentVoiceNoteRecorder";
import { EtaCountdown } from "../components/EtaCountdown";
import { IncidentPhotos } from "../components/IncidentPhotos";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, MessageCircle, Loader2, AlertTriangle, ArrowLeft, Phone, Bell, History, Share2 } from "lucide-react";
import { toast } from "sonner";
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
  const [responder, setResponder] = useState<{ name: string } | null>(null);
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

  // Fetch responder name when assigned
  useEffect(() => {
    if (!incident?.assigned_provider_id) { setResponder(null); return; }
    supabase.from("holarchelp_ambulance_providers" as any)
      .select("company_name").eq("id", incident.assigned_provider_id).maybeSingle()
      .then(({ data }: any) => setResponder(data ? { name: data.company_name } : null));
  }, [incident?.assigned_provider_id]);

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

  const copy = async () => { await navigator.clipboard.writeText(trackingUrl); toast.success("Tracking link copied"); };

  const resolve = async () => {
    if (!id) return;
    const { error } = await supabase.from("holarchelp_incidents" as any)
      .update({ status: "completed", resolved_at: new Date().toISOString(), completed_at: new Date().toISOString() } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Incident closed");
    navigate("/patient/holarchelp");
  };

  if (!incident) return <div className="p-5 text-muted-foreground">Loading…</div>;

  const ambulancePoint = incident.provider_latitude && incident.provider_longitude
    ? [{ latitude: incident.provider_latitude, longitude: incident.provider_longitude, recorded_at: incident.provider_location_updated_at ?? new Date().toISOString() }]
    : [];

  return (
    <div className="mx-auto max-w-md pb-6">
      {/* Sticky quick-action bar */}
      <div className="sticky top-0 z-30 -mx-4 mb-3 border-b bg-background/95 px-4 py-2 backdrop-blur md:mx-0 md:rounded-b-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Button size="sm" variant="ghost" className="shrink-0 gap-1" onClick={goHome}>
            <ArrowLeft className="h-4 w-4" /> SOS Home
          </Button>
          <Button size="sm" variant="destructive" className="shrink-0 gap-1" onClick={callEmergency}>
            <Phone className="h-4 w-4" /> Call 10177
          </Button>
          <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={shareLink}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={() => navigate("/patient/holarchelp/incidents")}>
            <History className="h-4 w-4" /> History
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
        <div className="mb-3 flex items-center gap-3 rounded-2xl border-2 border-amber-500/40 bg-amber-50 p-3 dark:bg-amber-950/20">
          <Loader2 className="h-5 w-5 animate-spin text-amber-700" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Finding nearest ambulance…</p>
            <p className="text-xs text-amber-700/80">Notified {pendingOffers} responder{pendingOffers === 1 ? "" : "s"}.</p>
          </div>
        </div>
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
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">🚑 Responding</p>
          <p className="mt-0.5 text-base font-extrabold text-emerald-900 dark:text-emerald-100">{responder.name}</p>
          <div className="mt-1 flex items-center gap-4 text-sm text-emerald-900/80 dark:text-emerald-200/80">
            <span>ETA: <EtaCountdown etaMinutes={incident.eta_minutes} lastUpdate={incident.last_eta_update} /></span>
            {incident.accepted_at && (
              <span className="text-xs">Accepted {new Date(incident.accepted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
        </div>
      )}

      <LiveMap points={[...locations.slice(0, 1), ...ambulancePoint]} />

      {(incident.voice_note_transcript || incident.voice_note_audio_url) && (
        <div className="mt-4 rounded-2xl border-2 border-red-600/40 bg-red-50 dark:bg-red-950/20 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Your initial voice note</p>
          {incident.voice_note_transcript && (
            <p className="text-sm whitespace-pre-wrap mb-2">{incident.voice_note_transcript}</p>
          )}
          {incident.voice_note_audio_url && <VoiceNoteAudio path={incident.voice_note_audio_url} />}
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

      <div className="mt-4 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Public tracking link — share with anyone</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Recipients can view your live location and status without signing in.</p>
        <p className="mt-2 break-all text-sm">{trackingUrl}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={copy} variant="outline" size="sm" className="gap-2 rounded-xl"><Copy className="h-4 w-4" /> Copy link</Button>
          <Button onClick={shareLink} variant="outline" size="sm" className="gap-2 rounded-xl"><Share2 className="h-4 w-4" /> Share</Button>
        </div>
      </div>

      {isLive && (
        <Button onClick={resolve} className="mt-6 h-14 w-full gap-2 rounded-2xl bg-primary text-base font-semibold">
          <CheckCircle2 className="h-5 w-5" /> Close incident
        </Button>
      )}
    </div>
  );
}
