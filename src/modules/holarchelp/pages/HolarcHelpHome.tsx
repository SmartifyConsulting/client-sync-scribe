import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin, Phone, AlertCircle, UserPlus, Crosshair } from "lucide-react";
import { SeverityPicker, type SeverityResult } from "../components/SeverityPicker";

const HOLD_MS = 1500;

export default function HolarcHelpHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [contactCount, setContactCount] = useState<number | null>(null);
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [triggering, setTriggering] = useState(false);
  const [severityOpen, setSeverityOpen] = useState(false);
  const [pending, setPending] = useState<{ id: string; tracking_token: string } | null>(null);
  const startedAt = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("holarchelp_incidents" as any).select("id")
      .eq("user_id", user.id).eq("status", "active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }: any) => setActiveIncidentId(data?.id ?? null));
    supabase.from("holarchelp_emergency_contacts" as any).select("id", { count: "exact", head: true })
      .eq("user_id", user.id).then(({ count }) => setContactCount(count ?? 0));
  }, [user]);

  const noContacts = contactCount === 0;

  const triggerSOS = async () => {
    if (!user || triggering) return;
    if (noContacts) {
      toast.error("Add at least one emergency contact before using SOS");
      navigate("/patient/holarchelp/contacts");
      return;
    }
    setTriggering(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => {
        if (!("geolocation" in navigator)) return rej(new Error("Geolocation not supported"));
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 });
      }).catch(() => null);

      const { data: incident, error } = await supabase
        .from("holarchelp_incidents" as any)
        .insert({ user_id: user.id, status: "active" } as any)
        .select("id, tracking_token").single();
      if (error || !incident) throw error ?? new Error("Failed to create incident");

      if (pos) {
        await supabase.from("holarchelp_locations" as any).insert({
          incident_id: (incident as any).id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      }

      if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
      setPending({ id: (incident as any).id, tracking_token: (incident as any).tracking_token });
      setSeverityOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not trigger SOS");
    } finally {
      setTriggering(false);
    }
  };

  const finishDispatch = async (severity: SeverityResult | null) => {
    if (!pending) return;
    setSeverityOpen(false);
    const { id } = pending;
    if (severity) {
      await supabase.from("holarchelp_incidents" as any).update({
        severity: severity.severity,
        conscious: severity.conscious,
        breathing: severity.breathing,
      } as any).eq("id", id);
    }
    toast.success("Emergency alert created. Notifying contacts…");
    setPending(null);
    navigate(`/patient/holarchelp/incident/${id}`);
  };

  const startHold = () => {
    if (noContacts) {
      toast.error("Add at least one emergency contact before using SOS");
      navigate("/patient/holarchelp/contacts");
      return;
    }
    if (activeIncidentId) {
      navigate(`/patient/holarchelp/incident/${activeIncidentId}`);
      return;
    }
    setHolding(true);
    startedAt.current = performance.now();
    const tick = (t: number) => {
      const elapsed = t - (startedAt.current ?? t);
      const p = Math.min(1, elapsed / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        cancelHold();
        triggerSOS();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  const cancelHold = () => {
    setHolding(false);
    setProgress(0);
    startedAt.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const shareLocation = () => {
    if (!("geolocation" in navigator)) return toast.error("GPS not supported");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
      try {
        if (navigator.share) await navigator.share({ title: "My location", url });
        else { await navigator.clipboard.writeText(url); toast.success("Location copied to clipboard"); }
      } catch {}
    }, () => toast.error("Couldn't get GPS — please allow location access"));
  };

  const enableLocation = () => {
    if (!("geolocation" in navigator)) return toast.error("GPS not supported on this device");
    navigator.geolocation.getCurrentPosition(
      () => toast.success("Location access enabled"),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location blocked — enable it in your browser site settings");
        } else {
          toast.error("Couldn't get location. Try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="mx-auto max-w-md">
      <SeverityPicker open={severityOpen} onSubmit={finishDispatch} onSkip={() => finishDispatch(null)} />

      {noContacts && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Add an emergency contact</p>
            <p className="text-muted-foreground">SOS is disabled until you have at least one contact.</p>
          </div>
          <Button size="sm" onClick={() => navigate("/patient/holarchelp/contacts")}>Add</Button>
        </div>
      )}

      {activeIncidentId && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-sos/40 bg-sos/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-sos" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-sos">Active emergency</p>
            <p className="text-muted-foreground">Your live location is being shared.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate(`/patient/holarchelp/incident/${activeIncidentId}`)}>View</Button>
        </div>
      )}

      <div className="mt-4 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Press and hold</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">to send SOS</h1>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onPointerDown={startHold} onPointerUp={cancelHold} onPointerLeave={cancelHold} onPointerCancel={cancelHold}
          disabled={triggering}
          className="relative flex h-60 w-60 items-center justify-center rounded-full text-3xl font-extrabold tracking-[0.2em] text-sos-foreground transition active:scale-95"
          style={{ background: "var(--gradient-sos)" }}
          aria-label="Hold to send SOS"
        >
          {triggering ? "SENDING…" : activeIncidentId ? "ACTIVE" : "SOS"}
          {holding && (
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="white" strokeWidth="4" strokeOpacity="0.9"
                strokeDasharray={`${progress * 289} 289`} strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      <div className="mt-10 grid gap-3">
        <Button variant="outline" className="h-14 justify-start gap-3 rounded-2xl text-base" onClick={enableLocation}>
          <Crosshair className="h-5 w-5 text-primary" /> Enable location access
        </Button>
        <Button variant="outline" className="h-14 justify-start gap-3 rounded-2xl text-base" onClick={shareLocation}>
          <MapPin className="h-5 w-5 text-primary" /> Share my location
        </Button>
        <Button variant="outline" className="h-14 justify-start gap-3 rounded-2xl text-base" onClick={() => navigate("/patient/holarchelp/contacts")}>
          <Phone className="h-5 w-5 text-primary" /> Manage emergency contacts
        </Button>
      </div>
    </div>
  );
}
