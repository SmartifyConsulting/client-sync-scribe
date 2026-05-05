import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, Crosshair, Loader2, Shield, Siren } from "lucide-react";
import { SeverityPicker, type SeverityResult } from "../components/SeverityPicker";
import { ProviderMap, type ProviderMarker } from "../components/ProviderMap";
import { SosVoiceNoteDialog } from "../components/SosVoiceNoteDialog";
import hospitalIcon from "@/assets/marker-hospital.png";
import ambulanceIcon from "@/assets/marker-ambulance.png";
import { cn } from "@/lib/utils";

type Coords = { lat: number; lng: number };

const distanceKm = (a: Coords, b: Coords) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

export default function HolarcHelpHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [permDenied, setPermDenied] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [providers, setProviders] = useState<(ProviderMarker & { _d: number; accepting: boolean; tier?: string; distanceKm?: number })[]>([]);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [helpOnTheWay, setHelpOnTheWay] = useState(false);
  const [severityOpen, setSeverityOpen] = useState(false);
  const [voiceNoteOpen, setVoiceNoteOpen] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [hasEmergency, setHasEmergency] = useState<boolean | null>(null);
  const [incidentCoverage, setIncidentCoverage] = useState<"public" | "private">("public");
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("patients" as any)
      .select("emergency_contact_name, emergency_contact_phone, emergency_contacts, next_of_kin_name, next_of_kin_phone")
      .eq("patient_user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }: any) => {
        const ecList = Array.isArray(data?.emergency_contacts) ? data.emergency_contacts : [];
        const hasEC = !!(data?.emergency_contact_name && data?.emergency_contact_phone) || ecList.length > 0;
        const hasNok = !!(data?.next_of_kin_name && data?.next_of_kin_phone);
        setHasEmergency(hasEC || hasNok);
      });
    supabase.from("holarchelp_incidents" as any).select("id, assigned_provider_id, accepted_at")
      .eq("user_id", user.id).eq("status", "active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }: any) => {
        if (data?.id) {
          setIncidentId(data.id);
          setActiveIncidentId(data.id);
          if (data.assigned_provider_id || data.accepted_at) setHelpOnTheWay(true);
        }
      });
  }, [user]);

  // Realtime subscription for the active incident
  useEffect(() => {
    if (!incidentId) return;
    const ch = supabase
      .channel(`incident-${incidentId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "holarchelp_incidents", filter: `id=eq.${incidentId}` },
        (payload: any) => {
          const row = payload.new;
          if (row.assigned_provider_id || row.accepted_at) setHelpOnTheWay(true);
          if (row.status && row.status !== "active") {
            setIncidentId(null);
            setHelpOnTheWay(false);
            setCoords(null);
            setProviders([]);
            setActiveIncidentId(null);
          }
        })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [incidentId]);

  // Load providers when coords available
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    (async () => {
      const [{ data: hs }, { data: as_ }] = await Promise.all([
        supabase.from("holarchelp_hospitals" as any)
          .select("id, name, latitude, longitude, city, status, accepting_patients, tier, ownership")
          .eq("status", "approved").not("latitude", "is", null).not("longitude", "is", null),
        supabase.from("holarchelp_ambulance_providers" as any)
          .select("id, company_name, latitude, longitude, city, status, accepting_patients, tier, ownership")
          .eq("status", "approved").not("latitude", "is", null).not("longitude", "is", null),
      ]);
      if (cancelled) return;
      const isPublicOnly = incidentCoverage === "public";
      const list = [
        ...((hs as any[]) ?? [])
          .filter((h) => !isPublicOnly || String(h.ownership ?? "").toLowerCase() === "public")
          .map((h) => ({ id: h.id, name: h.name, latitude: h.latitude, longitude: h.longitude, type: "hospital" as const, subtitle: h.city ?? undefined, accepting: h.accepting_patients !== false, tier: h.tier ?? undefined })),
        ...((as_ as any[]) ?? [])
          .filter((a) => !isPublicOnly || String(a.ownership ?? "").toLowerCase() === "public")
          .map((a) => ({ id: a.id, name: a.company_name, latitude: a.latitude, longitude: a.longitude, type: "ambulance" as const, subtitle: a.city ?? undefined, accepting: a.accepting_patients !== false, tier: a.tier ?? undefined })),
      ];
      const sorted = list
        .map((p) => {
          const d = distanceKm(coords, { lat: p.latitude, lng: p.longitude });
          return { ...p, _d: d, distanceKm: d };
        })
        .sort((a, b) => {
          if (a.accepting !== b.accepting) return a.accepting ? -1 : 1;
          return a._d - b._d;
        }).slice(0, 10);
      setProviders(sorted);
    })();
    return () => { cancelled = true; };
  }, [coords?.lat, coords?.lng, incidentCoverage]);

  const triggerSOS = async () => {
    if (!user || triggering) return;
    if (activeIncidentId) {
      navigate(`/patient/holarchelp/incident/${activeIncidentId}`);
      return;
    }
    if (hasEmergency === false) {
      toast.error("Add an Emergency Contact first — they will be notified when you trigger SOS.");
      navigate("/patient/details?section=health");
      return;
    }
    setTriggering(true);
    try {
      // Get location (required)
      const pos = await new Promise<GeolocationPosition>((res, rej) => {
        if (!("geolocation" in navigator)) return rej(new Error("Geolocation not supported"));
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 });
      }).catch((e: any) => {
        if (e?.code === 1) setPermDenied(true);
        return null;
      });
      if (!pos) {
        setTriggering(false);
        return;
      }
      setPermDenied(false);
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });

      // Determine coverage based on patient medical aid (no aid → public-only routing)
      let coverage: "public" | "private" = "public";
      try {
        const { data: pat } = await supabase
          .from("patients")
          .select("medical_aid")
          .eq("patient_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (pat?.medical_aid && String(pat.medical_aid).trim() !== "") coverage = "private";
      } catch { /* default public */ }

      const { data: incident, error } = await supabase
        .from("holarchelp_incidents" as any)
        .insert({ user_id: user.id, status: "active", coverage } as any)
        .select("id, tracking_token").single();
      if (error || !incident) throw error ?? new Error("Failed to create incident");

      await supabase.from("holarchelp_locations" as any).insert({
        incident_id: (incident as any).id,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });

      if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
      setIncidentId((incident as any).id);
      setActiveIncidentId((incident as any).id);
      // Fire-and-forget: notify emergency contacts (and any opt-in NOK / share recipients) with live tracking link
      supabase.functions.invoke("share-incident-with-contacts", {
        body: { incident_id: (incident as any).id, tracking_token: (incident as any).tracking_token },
      }).catch((e) => console.warn("share-incident-with-contacts failed", e));
      setVoiceNoteOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not trigger SOS");
    } finally {
      setTriggering(false);
    }
  };

  const finishSeverity = async (severity: SeverityResult | null) => {
    setSeverityOpen(false);
    if (!incidentId || !severity) return;
    await supabase.from("holarchelp_incidents" as any).update({
      severity: severity.severity,
      conscious: severity.conscious,
      breathing: severity.breathing,
    } as any).eq("id", incidentId);
    // Re-notify contacts now that severity is known so per-contact severity thresholds apply
    supabase.functions.invoke("share-incident-with-contacts", {
      body: { incident_id: incidentId },
    }).catch((e) => console.warn("share-incident-with-contacts (severity) failed", e));
  };

  const requestProvider = async (p: ProviderMarker & { _d: number }) => {
    if (!incidentId || requesting) return;
    setRequesting(p.id);
    try {
      const { error: upErr } = await supabase.from("holarchelp_incidents" as any).update({
        assigned_provider_id: p.id,
        accepted_at: new Date().toISOString(),
      } as any).eq("id", incidentId);
      if (upErr) throw upErr;
      await supabase.from("holarchelp_incident_offers" as any).insert({
        incident_id: incidentId, provider_id: p.id, response: "accepted",
        responded_at: new Date().toISOString(), distance_km: p._d,
      });
      setHelpOnTheWay(true);
      toast.success(`Request sent to ${p.name}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not request provider");
    } finally {
      setRequesting(null);
    }
  };

  // ============ RENDER ============

  if (helpOnTheWay && incidentId) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <button
          onClick={() => navigate(`/patient/holarchelp/incident/${incidentId}`)}
          className="inline-flex flex-col items-center justify-center gap-3 rounded-3xl bg-emerald-500 hover:bg-emerald-600 transition-colors px-10 py-10 text-white shadow-2xl active:scale-95"
        >
          <Shield className="h-16 w-16" />
          <p className="text-2xl font-extrabold tracking-tight">Help is on the way.</p>
          <p className="text-xs opacity-90">Tap to view live status</p>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <SeverityPicker open={severityOpen} onSubmit={finishSeverity} onSkip={() => finishSeverity(null)} />
      <SosVoiceNoteDialog
        open={voiceNoteOpen}
        incidentId={incidentId}
        onClose={() => { setVoiceNoteOpen(false); setSeverityOpen(true); }}
      />

      {hasEmergency === false && (
        <Card className="mb-4 border-amber-500/40 bg-amber-50">
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" /> Add an Emergency Contact to enable SOS
            </div>
            <p className="text-amber-900/80 text-xs">
              Your Emergency Contact will be notified by default when you trigger an SOS. You can also opt your Next of Kin in.
            </p>
            <Button size="sm" className="mt-1" onClick={() => navigate("/patient/details?section=health")}>
              Add Emergency Contact
            </Button>
          </CardContent>
        </Card>
      )}

      {permDenied && (
        <Card className="mb-4 border-amber-500/40 bg-amber-50">
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" /> Location access required
            </div>
            <p className="text-amber-900/80 text-xs">
              SOS needs your location to find the closest emergency services. Enable it for this site:
            </p>
            <ul className="list-disc pl-5 text-xs text-amber-900/80 space-y-0.5">
              <li>Tap the lock/info icon in the address bar</li>
              <li>Find <strong>Location</strong> permission and set to <strong>Allow</strong></li>
              <li>Reload this page and try again</li>
            </ul>
            <Button size="sm" onClick={triggerSOS} className="mt-1">Try again</Button>
          </CardContent>
        </Card>
      )}

      {coords && incidentId && !helpOnTheWay ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
            <Siren className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">SOS active — pick a provider or wait for one to accept</p>
              <p className="opacity-80">Your live location is being shared.</p>
            </div>
          </div>
          <ProviderMap center={coords} providers={providers} height={260} />
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><img src={hospitalIcon} alt="" className="h-4 w-4" /> Hospital</span>
            <span className="flex items-center gap-1.5"><img src={ambulanceIcon} alt="" className="h-4 w-4" /> Ambulance</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nearest providers</p>
            {providers.map((p) => {
              const dimmed = !p.accepting;
              return (
                <div key={p.id} className={cn("flex items-center gap-3 rounded-xl border bg-card p-3", dimmed && "opacity-50 grayscale")}>
                  <img src={p.type === "hospital" ? hospitalIcon : ambulanceIcon} alt="" className="h-9 w-9 object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {p.type} {p.subtitle && `· ${p.subtitle}`} · {p._d.toFixed(1)} km
                      {dimmed && <span className="ml-1 text-red-600 font-semibold">· Full capacity</span>}
                    </p>
                  </div>
                  <Button size="sm" disabled={!!requesting || dimmed} onClick={() => requestProvider(p)}>
                    {requesting === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : dimmed ? "Full" : "Request"}
                  </Button>
                </div>
              );
            })}
            {providers.length === 0 && (
              <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                No approved providers nearby. Waiting for someone to respond…
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          {activeIncidentId && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-red-700">Active emergency</p>
                <p className="text-muted-foreground">Tap to view live tracking.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate(`/patient/holarchelp/incident/${activeIncidentId}`)}>View</Button>
            </div>
          )}

          <div className="mt-4 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Tap to send</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">SOS</h1>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={triggerSOS}
              disabled={triggering}
              className="relative flex h-60 w-60 items-center justify-center rounded-full text-3xl font-extrabold tracking-[0.2em] text-white transition active:scale-95 shadow-2xl"
              style={{ background: "linear-gradient(135deg, hsl(354,84%,54%), hsl(0,75%,42%))" }}
              aria-label="Send SOS"
            >
              {triggering ? "SENDING…" : "SOS"}
            </button>
          </div>

          <div className="mt-10 grid gap-3">
            <Button variant="outline" className="h-14 justify-start gap-3 rounded-2xl text-base" onClick={() => navigate("/patient/holarchelp/nearby")}>
              <Crosshair className="h-5 w-5 text-primary" /> Find nearby provider
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
