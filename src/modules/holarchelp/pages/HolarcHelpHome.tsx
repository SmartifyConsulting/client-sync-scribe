import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Loader2, MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { SeverityPicker, type SeverityResult } from "../components/SeverityPicker";
import { SosVoiceNoteDialog } from "../components/SosVoiceNoteDialog";
// DoctorSosChooser removed — patient SOS is always self.
import logo from "@/assets/holarc-help-logo.png";

type Coords = { lat: number; lng: number };

export default function HolarcHelpHome() {
  const { user } = useAuth();
  
  const navigate = useNavigate();
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  
  const [permDenied, setPermDenied] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [helpOnTheWay, setHelpOnTheWay] = useState(false);
  const [severityOpen, setSeverityOpen] = useState(false);
  const [voiceNoteOpen, setVoiceNoteOpen] = useState(false);
  const [hasEmergency, setHasEmergency] = useState<boolean | null>(null);
  const [contactsNotified, setContactsNotified] = useState(false);
  const [providerAssigned, setProviderAssigned] = useState(false);
  const [cancelSecondsLeft, setCancelSecondsLeft] = useState(10);
  const channelRef = useRef<any>(null);

  type AckKey = "a" | "b" | "c";
  // Always require fresh acknowledgement each session — never persisted.
  const [ack, setAck] = useState<Record<AckKey, boolean>>({ a: false, b: false, c: false });
  const allAck = ack.a && ack.b && ack.c;
  const setAckField = (k: AckKey, v: boolean) => {
    setAck((prev) => ({ ...prev, [k]: v }));
  };

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
    supabase.from("holarchelp_incidents" as any).select("id, assigned_provider_id, accepted_at, created_at")
      .eq("user_id", user.id).in("status", ["open", "assigned", "en_route", "arrived", "patient_collected", "at_hospital", "reopened"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }: any) => {
        if (data?.id) {
          // Track active incident so user can resume — but don't trap them on this page.
          const ageMs = Date.now() - new Date(data.created_at).getTime();
          setActiveIncidentId(data.id);
          if (ageMs > 30_000) {
            // Older incident: just surface a Resume banner, leave user free to navigate.
            return;
          }
          setIncidentId(data.id);
          if (data.assigned_provider_id || data.accepted_at) {
            setHelpOnTheWay(true);
            setProviderAssigned(true);
          }
        }
      });
  }, [user, navigate]);

  // Safety timeouts so confirmation spinners can never hang
  useEffect(() => {
    if (!incidentId) return;
    const t1 = setTimeout(() => setContactsNotified(true), 8000);
    const t2 = setTimeout(() => setProviderAssigned((v) => v || false) /* noop */, 0);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [incidentId]);

  const [searchTimedOut, setSearchTimedOut] = useState(false);
  useEffect(() => {
    if (!incidentId || providerAssigned) return;
    setSearchTimedOut(false);
    const t = setTimeout(() => setSearchTimedOut(true), 30000);
    return () => clearTimeout(t);
  }, [incidentId, providerAssigned]);

  // Realtime subscription for the active incident
  useEffect(() => {
    if (!incidentId) return;
    const ch = supabase
      .channel(`incident-${incidentId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "holarchelp_incidents", filter: `id=eq.${incidentId}` },
        (payload: any) => {
          const row = payload.new;
          if (row.assigned_provider_id || row.accepted_at) {
            setHelpOnTheWay(true);
            setProviderAssigned(true);
          }
          if (row.status && ["completed", "cancelled"].includes(row.status)) {
            setIncidentId(null);
            setHelpOnTheWay(false);
            setCoords(null);
            setActiveIncidentId(null);
            setProviderAssigned(false);
            setContactsNotified(false);
          }
        })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [incidentId]);

  // Cancel countdown after triggering
  useEffect(() => {
    if (!incidentId || helpOnTheWay) return;
    setCancelSecondsLeft(10);
    const t = setInterval(() => {
      setCancelSecondsLeft((s) => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [incidentId, helpOnTheWay]);

  const triggerSOS = async () => {
    if (!user || triggering) return;
    if (activeIncidentId) {
      navigate(`/patient/holarchelp/incident/${activeIncidentId}`);
      return;
    }
    if (hasEmergency === false) {
      toast.error("Add someone we can notify first.");
      navigate("/patient/details?section=health");
      return;
    }
    setTriggering(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => {
        if (!("geolocation" in navigator)) return rej(new Error("Geolocation not supported"));
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 });
      }).catch((e: any) => {
        if (e?.code === 1) setPermDenied(true);
        return null;
      });
      if (!pos) { setTriggering(false); return; }
      setPermDenied(false);
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });

      let coverage: "public" | "private" = "public";
      try {
        const { data: pat } = await supabase
          .from("patients").select("medical_aid")
          .eq("patient_user_id", user.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (pat?.medical_aid && String(pat.medical_aid).trim() !== "") coverage = "private";
      } catch { /* default public */ }

      const { data: incident, error } = await supabase
        .from("holarchelp_incidents" as any)
        .insert({ user_id: user.id, status: "open", coverage, severity: "critical" } as any)
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
      supabase.functions.invoke("dispatch-sos", { body: { incident_id: (incident as any).id } })
        .catch((e) => console.warn("dispatch-sos failed", e));
      supabase.functions.invoke("share-incident-with-contacts", {
        body: { incident_id: (incident as any).id, tracking_token: (incident as any).tracking_token },
      }).then(() => setContactsNotified(true)).catch((e) => console.warn("share-incident-with-contacts failed", e));
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
    supabase.functions.invoke("share-incident-with-contacts", {
      body: { incident_id: incidentId },
    }).catch((e) => console.warn("share-incident-with-contacts (severity) failed", e));
  };

  const cancelAlert = async () => {
    if (!incidentId) return;
    await supabase.from("holarchelp_incidents" as any)
      .update({ status: "cancelled", resolved_at: new Date().toISOString() } as any).eq("id", incidentId);
    toast.success("Alert cancelled");
  };

  // ============ HOLD-TO-TRIGGER ============
  const startHold = () => {
    if (triggering) return;
    if (!activeIncidentId && !allAck) {
      toast.error("Please acknowledge all three statements above to enable SOS.");
      return;
    }
    if ("vibrate" in navigator) navigator.vibrate?.(30);
    holdStartRef.current = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - holdStartRef.current) / HOLD_MS);
      setHoldProgress(p);
      if (p >= 1) {
        if ("vibrate" in navigator) navigator.vibrate?.([80, 60, 120]);
        cancelHold();
        if (activeIncidentId) {
          navigate(`/patient/holarchelp/incident/${activeIncidentId}`);
        } else {
          // Patient SOS is always for self — no chooser prompt.
          triggerSOS();
        }
        return;
      }
      holdTimerRef.current = requestAnimationFrame(tick);
    };
    holdTimerRef.current = requestAnimationFrame(tick);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) cancelAnimationFrame(holdTimerRef.current);
    holdTimerRef.current = null;
    setHoldProgress(0);
  };

  // ============ RENDER ============

  // Confirmation state — after trigger
  if (incidentId) {
    const steps = [
      { label: "Location shared", done: !!coords },
      { label: "Contacts notified", done: contactsNotified },
      {
        label: providerAssigned
          ? "Responder assigned"
          : searchTimedOut
            ? "Still searching — open live tracking"
            : "Searching for nearby providers",
        done: providerAssigned,
        stopSpin: searchTimedOut && !providerAssigned,
      },
    ];
    return (
      <div className="mx-auto max-w-md px-5 py-10">
        <SosVoiceNoteDialog
          open={voiceNoteOpen}
          incidentId={incidentId}
          onClose={() => { setVoiceNoteOpen(false); setSeverityOpen(true); }}
        />
        <SeverityPicker open={severityOpen} onSubmit={finishSeverity} onSkip={() => finishSeverity(null)} />

        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 animate-scale-in">
            <Check className="h-10 w-10 text-white" strokeWidth={3} />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Help is on the way</h1>
          <p className="mt-2 text-sm text-muted-foreground">Notifying your emergency contacts and nearby responders</p>
        </div>

        <ul className="mt-8 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
              {s.done ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-4 w-4 text-emerald-700" strokeWidth={3} />
                </span>
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Loader2 className={`h-4 w-4 text-muted-foreground ${s.stopSpin ? "" : "animate-spin"}`} />
                </span>
              )}
              <span className={`text-sm font-semibold ${s.done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 space-y-3">
          <Button
            className="w-full h-12 rounded-2xl"
            onClick={() => navigate(`/patient/holarchelp/incident/${incidentId}`)}
          >
            View live tracking →
          </Button>
          {cancelSecondsLeft > 0 && !helpOnTheWay && (
            <Button variant="outline" className="w-full h-12 rounded-2xl" onClick={cancelAlert}>
              Cancel alert ({cancelSecondsLeft}s)
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Landing state
  const ringR = 114;
  const ringC = 2 * Math.PI * ringR;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-md flex-col px-5">
      {/* Patient SOS is self-only; chooser removed */}

      {/* Active SOS resume banner moved below the hold button */}

      {/* Header */}
      <div className="flex justify-center pt-6">
        <img src={logo} alt="Holarc Help" className="h-24 w-auto" />
      </div>

      {/* Title */}
      <div className="mt-8 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Emergency Assistance</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Help will be alerted instantly</p>
      </div>

      {/* CTA */}
      {/* SOS acknowledgements */}
      {!activeIncidentId && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Before using SOS, please acknowledge:
          </p>
          {[
          { k: "a" as const, label: "SOS support is provided on a best-effort basis and cannot guarantee emergency response." },
            { k: "b" as const, label: "SOS depends on network, device status, location access, and third-party responders." },
            { k: "c" as const, label: "SOS requires location permissions, battery power, and internet or cellular connectivity." },
          ].map((item) => (
            <label key={item.k} htmlFor={`sos-ack-${item.k}`} className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                id={`sos-ack-${item.k}`}
                checked={ack[item.k]}
                onCheckedChange={(v) => setAckField(item.k, v === true)}
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed text-foreground">{item.label}</span>
            </label>
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-1 flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* Ambient glow — intensifies during hold */}
          <span
            aria-hidden
            className="absolute inset-0 -m-6 rounded-full bg-red-500/20 blur-2xl transition-opacity"
            style={{ opacity: 0.6 + holdProgress * 0.4 }}
          />
          {holdProgress === 0 && (
            <span aria-hidden className="absolute inset-0 -m-1 animate-ping rounded-full bg-red-500/25" style={{ animationDuration: "2.6s" }} />
          )}

          {/* Progress ring — thicker, glowing white */}
          <svg className="absolute -rotate-90" width={280} height={280} aria-hidden>
            <circle cx={140} cy={140} r={ringR} stroke="hsl(0 0% 100% / 0.25)" strokeWidth={14} fill="none" />
            <circle
              cx={140} cy={140} r={ringR}
              stroke="white" strokeWidth={14} fill="none" strokeLinecap="round"
              strokeDasharray={ringC}
              strokeDashoffset={ringC * (1 - holdProgress)}
              style={{
                transition: holdProgress === 0 ? "stroke-dashoffset .25s ease-out" : "none",
                filter: "drop-shadow(0 0 10px rgba(255,255,255,0.95)) drop-shadow(0 0 4px rgba(255,255,255,0.6))",
              }}
            />
          </svg>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              try { (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId); } catch {}
              startHold();
            }}
            onPointerUp={cancelHold}
            onPointerCancel={cancelHold}
            onContextMenu={(e) => e.preventDefault()}
            disabled={triggering || (!activeIncidentId && !allAck)}
            aria-label="Hold for help"
            className={`relative z-10 flex h-52 w-52 select-none flex-col items-center justify-center rounded-full font-black text-white transition active:scale-[.98] touch-none ${(!activeIncidentId && !allAck) ? "opacity-50 cursor-not-allowed" : ""}`}
            style={{
              background: "radial-gradient(circle at 30% 25%, hsl(354,90%,62%) 0%, hsl(354,84%,52%) 45%, hsl(0,80%,38%) 100%)",
              boxShadow: "0 24px 60px -14px hsl(0 80% 40% / 0.55), inset 0 -10px 30px hsl(0 80% 25% / 0.35), inset 0 6px 14px hsl(0 100% 80% / 0.3)",
            }}
          >
            {triggering ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : holdProgress > 0 ? (
              <>
                <span className="text-3xl tracking-[0.18em]">HOLD</span>
                <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.28em] opacity-95">
                  Activating… {Math.round(holdProgress * 100)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-3xl tracking-[0.18em]">HOLD</span>
                <span className="mt-1 text-xs font-bold uppercase tracking-[0.32em] opacity-90">For Help</span>
              </>
            )}
          </button>
        </div>

        {/* Hint */}
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Press &amp; hold for 1 second
        </p>

        {/* Active SOS — surfaced directly under the hint */}
        {activeIncidentId && !incidentId && (
          <button
            onClick={() => navigate(`/patient/holarchelp/incident/${activeIncidentId}`)}
            className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-red-500/60 bg-red-50 px-4 py-3 text-left shadow-sm transition hover:bg-red-100 dark:bg-red-950/20"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-700">Active SOS in progress</p>
                <p className="text-sm font-semibold text-red-900">Tap to resume live tracking</p>
              </div>
            </div>
            <span className="text-red-700">→</span>
          </button>
        )}

        {/* Inline alert pills */}
        {permDenied && (
          <div className="mt-4 flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
            <MapPin className="h-3.5 w-3.5" /> Location off — enable to send SOS
          </div>
        )}
        {hasEmergency === false && (
          <button
            onClick={() => navigate("/patient/details?section=health")}
            className="mt-4 text-xs font-semibold text-amber-700 underline-offset-4 hover:underline"
          >
            Add someone we can notify first
          </button>
        )}
      </div>

      {/* Secondary actions */}
      <div className="mb-8 mt-6 flex flex-col items-center gap-2">
        <button
          onClick={() => navigate("/patient/details?section=health")}
          className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          + Add someone we can notify
        </button>
        <button
          onClick={() => navigate("/patient/holarchelp/contacts")}
          className="text-xs text-muted-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
        >
          Set preferred responders
        </button>
      </div>
    </div>
  );
}
