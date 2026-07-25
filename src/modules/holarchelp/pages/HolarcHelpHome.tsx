import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import logo from "@/assets/holarc-help-logo.png";

type Coords = { lat: number; lng: number };

export default function HolarcHelpHome() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const navigate = useNavigate();
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);

  const [permDenied, setPermDenied] = useState(false);
  const [hasEmergency, setHasEmergency] = useState<boolean | null>(null);
  const channelRef = useRef<any>(null);

  type AckKey = "a" | "b" | "c";
  // Default ticked â€” patient can untick if they want, but SOS should be one-tap by default.
  const [ack, setAck] = useState<Record<AckKey, boolean>>({ a: true, b: true, c: true });
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
        if (data?.id) setActiveIncidentId(data.id);
      });
  }, [user]);

  const triggerSOS = async () => {
    if (!user || triggering) return;
    if (activeIncidentId) {
      navigate(`/patient/holarchelp/incident/${activeIncidentId}`);
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

      if (hasEmergency === false) {
        toast.message("SOS sent. Add an emergency contact later so we can also notify someone you trust.");
      }

      // Fire-and-forget dispatch + in-app notification to emergency contacts
      supabase.functions.invoke("dispatch-sos", { body: { incident_id: (incident as any).id } })
        .catch((e) => console.warn("dispatch-sos failed", e));
      supabase.functions.invoke("share-incident-with-contacts", {
        body: { incident_id: (incident as any).id, tracking_token: (incident as any).tracking_token },
      }).catch((e) => console.warn("share-incident-with-contacts failed", e));

      // Route patient straight to the live incident page where they see the
      // list of available ambulances/hospitals to choose from.
      navigate(`/patient/holarchelp/incident/${(incident as any).id}?fresh=1`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not trigger SOS");
    } finally {
      setTriggering(false);
    }
  };

  const handleSosClick = () => {
    if (triggering) return;
    if (!activeIncidentId && !allAck) {
      toast.error("Please acknowledge all three statements above to enable SOS.");
      return;
    }
    if ("vibrate" in navigator) navigator.vibrate?.([80, 60, 120]);
    if (activeIncidentId) {
      navigate(`/patient/holarchelp/incident/${activeIncidentId}`);
    } else {
      triggerSOS();
    }
  };

  // ============ RENDER ============
  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-md flex-col px-5">
      {/* Header */}
      <div className="flex justify-center pt-6">
        <img src={logo} alt="Holarc Help" className="h-24 w-auto" />
      </div>

      {/* Title */}
      <div className="mt-8 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("sos.emergencyAssistance")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("sos.helpAlerted")}</p>
      </div>

      {/* SOS acknowledgements */}
      {!activeIncidentId && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {t("sos.ackHeading")}
          </p>
          {[
            { k: "a" as const, label: t("sos.ackA") },
            { k: "b" as const, label: t("sos.ackB") },
            { k: "c" as const, label: t("sos.ackC") },
          ].map((item) => (
            <label key={item.k} htmlFor={`sos-ack-${item.k}`} className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                id={`sos-ack-${item.k}`}
                checked={ack[item.k]}
                onCheckedChange={(v) => setAckField(item.k, v === true)}
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed text-foreground">{item.label}</span>
            </label>
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-1 flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* Ambient glow */}
          <span
            aria-hidden
            className="absolute inset-0 -m-6 rounded-full bg-red-500/20 blur-2xl"
          />
          <span aria-hidden className="absolute inset-0 -m-1 animate-ping rounded-full bg-red-500/25" style={{ animationDuration: "2.6s" }} />

          <button
            type="button"
            onClick={handleSosClick}
            onContextMenu={(e) => e.preventDefault()}
            disabled={triggering || (!activeIncidentId && !allAck)}
            aria-label="Tap for help"
            className={`relative z-10 flex h-52 w-52 select-none flex-col items-center justify-center rounded-full font-black text-white transition active:scale-[.98] touch-none ${(!activeIncidentId && !allAck) ? "opacity-50 cursor-not-allowed" : ""}`}
            style={{
              background: "radial-gradient(circle at 30% 25%, hsl(354,90%,62%) 0%, hsl(354,84%,52%) 45%, hsl(0,80%,38%) 100%)",
              boxShadow: "0 24px 60px -14px hsl(0 80% 40% / 0.55), inset 0 -10px 30px hsl(0 80% 25% / 0.35), inset 0 6px 14px hsl(0 100% 80% / 0.3)",
            }}
          >
            {triggering ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : (
              <>
                <span className="text-3xl tracking-[0.18em]">{t("sos.sosLabel")}</span>
                <span className="mt-1 text-sm font-bold uppercase tracking-[0.32em] opacity-90">{t("sos.tapForHelp")}</span>
              </>
            )}
          </button>
        </div>

        {/* What happens when you tap SOS â€” static notice, no spinners */}
        <p className="mt-6 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
          {t("sos.footerCaption")}
        </p>

        {/* Active SOS â€” surfaced directly under the hint */}
        {activeIncidentId && (
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
                <p className="text-sm font-bold uppercase tracking-wider text-red-700">Active SOS in progress</p>
                <p className="text-sm font-semibold text-red-900">Tap to resume live tracking</p>
              </div>
            </div>
            <span className="text-red-700">â†’</span>
          </button>
        )}

        {/* Inline alert pills */}
        {permDenied && (
          <div className="mt-4 flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900">
            <MapPin className="h-3.5 w-3.5" /> Location off â€” enable to send SOS
          </div>
        )}
        {hasEmergency === false && (
          <button
            onClick={() => navigate("/patient/details?section=health")}
            className="mt-4 text-sm font-semibold text-amber-700 underline-offset-4 hover:underline"
          >
            Add someone we can notify first
          </button>
        )}
      </div>

      {/* Secondary actions */}
      <div className="mb-8 mt-6 flex flex-col items-center gap-2">
        <button
          onClick={() => navigate("/patient/holarchelp/contacts")}
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t("sos.manageContacts")}
        </button>
        <button
          onClick={() => navigate("/patient/holarchelp/incidents")}
          className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline"
        >
          {t("sos.viewHistory")}
        </button>
      </div>
    </div>
  );
}

