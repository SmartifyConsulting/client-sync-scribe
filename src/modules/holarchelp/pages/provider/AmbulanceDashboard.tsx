import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProviderAccess } from "../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, Activity, CheckCircle2, Clock, Ambulance } from "lucide-react";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";

type Incident = {
  id: string; status: string; severity: string | null;
  conscious: boolean | null; breathing: boolean | null;
  created_at: string; assigned_provider_id: string | null;
  accepted_at?: string | null; eta_minutes?: number | null;
  destination_hospital_id?: string | null;
};

const sevColor = (s: string | null) =>
  s === "critical" ? "bg-red-500/10 text-red-700 border-red-500/30"
  : s === "high" ? "bg-orange-500/10 text-orange-700 border-orange-500/30"
  : s === "moderate" ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
  : "bg-muted text-muted-foreground border-border";

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

export default function AmbulanceDashboard() {
  const { user } = useAuth();
  const { providerId } = useProviderAccess();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("holarchelp_incidents" as any)
      .select("*").in("status", ["open","assigned","en_route","arrived","patient_collected","en_route_to_hospital","at_hospital","reopened"])
      .order("created_at", { ascending: false }).limit(100);
    setIncidents(((data as any) ?? []) as Incident[]);
    setLoading(false);

    if (providerId) {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const { count } = await supabase.from("holarchelp_incidents" as any)
        .select("id", { count: "exact", head: true })
        .eq("assigned_provider_id", providerId)
        .eq("status","completed")
        .gte("completed_at", todayStart.toISOString());
      setCompletedToday(count ?? 0);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("amb-dispatch")
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incident_offers" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  useEffect(() => {
    if (!providerId) return;
    (async () => {
      const { data } = await supabase.from("holarchelp_ambulance_providers" as any)
        .select("registration_number, base_address, contact_phone, fleet_size")
        .eq("id", providerId).maybeSingle();
      const r: any = data;
      setProfileIncomplete(!r || !r.registration_number || !r.base_address || !r.contact_phone || !r.fleet_size);
    })();
  }, [providerId]);

  const accept = async (incidentId: string) => {
    if (!providerId || !user) return;
    const { error } = await supabase.rpc("holarchelp_accept_incident" as any, { _incident_id: incidentId, _provider_id: providerId });
    if (error) {
      toast.error(error.message === "Incident already taken" ? "Another responder accepted first" : error.message);
      load(); return;
    }
    toast.success("Incident locked — you are the responder");
    navigate(`/provider/incident/${incidentId}`);
  };

  const decline = async (incidentId: string) => {
    if (!providerId) return;
    const reason = window.prompt("Reason for declining?") || "Not available";
    await supabase.from("holarchelp_incident_offers" as any).upsert({
      incident_id: incidentId, provider_id: providerId, response: "declined",
      responded_at: new Date().toISOString(),
    } as any, { onConflict: "incident_id,provider_id" });
    await supabase.from("holarchelp_incident_cancellations" as any).insert({
      incident_id: incidentId, provider_id: providerId, reason_code: "declined", reason_text: reason,
    } as any);
    toast.success("Declined");
  };

  const myActive = incidents.filter((i) => i.assigned_provider_id === providerId);
  const open = incidents.filter((i) => !i.assigned_provider_id && (i.status === "open" || i.status === "reopened"));
  const lockedByOthers = incidents.filter((i) => i.assigned_provider_id && i.assigned_provider_id !== providerId);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ambulance dispatch</p>
        <h1 className="text-2xl font-extrabold">Live SOS feed</h1>
      </div>

      {profileIncomplete && (
        <ProfileCompletionBanner
          title="Complete your service profile"
          message="Add your registration number, base address, dispatch phone and fleet size so we can route SOS calls to you correctly."
          onComplete={() => navigate("/provider/profile")}
          storageKey="holarc_provider_ambulance_banner_dismissed"
        />
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KPI icon={AlertCircle} label="Open SOS" value={open.length} tone="text-sos" />
        <KPI icon={Activity} label="My active" value={myActive.length} tone="text-primary" />
        <KPI icon={Ambulance} label="Other crews" value={lockedByOthers.length} tone="text-muted-foreground" />
        <KPI icon={CheckCircle2} label="Completed today" value={completedToday} tone="text-green-600" />
      </div>

      {myActive[0] && <ActiveMission i={myActive[0]} />}

      <Section title="Open incidents — first to accept locks it" empty={loading ? "Loading…" : "No open SOS in your area right now."}>
        {open.map((i) => (
          <IncidentRow key={i.id} i={i} primary={
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => accept(i.id)}>Accept</Button>
              <Button size="sm" variant="outline" onClick={() => decline(i.id)}>Decline</Button>
            </div>
          } />
        ))}
      </Section>

      <Section title="My active incidents" empty="No active incidents you've accepted.">
        {myActive.map((i) => (
          <IncidentRow key={i.id} i={i} primary={<Button asChild size="sm"><Link to={`/provider/incident/${i.id}`}>Open</Link></Button>} />
        ))}
      </Section>

      <Section title="Locked by other crews" empty="None right now.">
        {lockedByOthers.map((i) => (
          <IncidentRow key={i.id} i={i} primary={
            <div className="text-right text-[11px] text-muted-foreground">
              <p className="font-semibold text-foreground">🚑 Responded</p>
              {i.eta_minutes != null && <p>ETA {i.eta_minutes} min</p>}
            </div>
          } />
        ))}
      </Section>
    </div>
  );
}

const KPI = ({ icon: Icon, label, value, tone }: any) => (
  <div className="rounded-2xl border bg-card p-3">
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon className={`h-3.5 w-3.5 ${tone}`} />{label}</div>
    <p className="mt-1 text-2xl font-extrabold">{value}</p>
  </div>
);

const ActiveMission = ({ i }: { i: Incident }) => (
  <Link to={`/provider/incident/${i.id}`} className="block rounded-2xl border-2 border-primary bg-primary/5 p-4 transition hover:bg-primary/10">
    <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Active mission · open console</p>
    <div className="mt-1 flex items-center justify-between gap-3">
      <div>
        <p className="text-lg font-extrabold">{(i.status ?? "").replace(/_/g," ").toUpperCase()}</p>
        <p className="text-xs text-muted-foreground">Incident {i.id.slice(0,8)} · {ago(i.created_at)}</p>
      </div>
      {i.eta_minutes != null && <div className="text-right">
        <p className="text-2xl font-extrabold tabular-nums">{i.eta_minutes}</p>
        <p className="text-[10px] uppercase text-muted-foreground">min ETA</p>
      </div>}
    </div>
  </Link>
);

const Section = ({ title, empty, children }: any) => {
  const arr = Array.isArray(children) ? children : [children];
  const hasItems = arr.filter(Boolean).length > 0;
  return (
    <section>
      <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {hasItems ? <div className="space-y-1.5">{children}</div>
        : <div className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">{empty}</div>}
    </section>
  );
};

const IncidentRow = ({ i, primary }: { i: Incident; primary: React.ReactNode }) => (
  <div className="flex items-center gap-2 rounded-xl border bg-card p-2.5">
    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${sevColor(i.severity)}`}>
      {(i.severity ?? "unknown").toUpperCase()}
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-semibold">
        {i.conscious === false && "Unconscious · "}
        {i.breathing === false && "Not breathing · "}
        Incident {i.id.slice(0, 8)}
      </p>
      <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" />{ago(i.created_at)} · {i.status.replace(/_/g," ")}</p>
    </div>
    <div className="shrink-0">{primary}</div>
  </div>
);
