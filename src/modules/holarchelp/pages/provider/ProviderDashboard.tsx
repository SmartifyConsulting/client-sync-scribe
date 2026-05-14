import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProviderAccess } from "../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, Activity, CheckCircle2, Clock } from "lucide-react";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";

type Incident = {
  id: string;
  status: string;
  severity: string | null;
  conscious: boolean | null;
  breathing: boolean | null;
  created_at: string;
  assigned_provider_id: string | null;
  accepted_at?: string | null;
  eta_minutes?: number | null;
  full_name?: string | null;
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

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { providerId, providerType } = useProviderAccess();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("holarchelp_incidents" as any)
      .select("*").in("status", ["open", "assigned", "en_route", "arrived", "patient_collected", "at_hospital", "reopened"])
      .order("created_at", { ascending: false }).limit(50);
    setIncidents((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("provider-dispatch")
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incident_offers" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Profile completion check for hospital / ambulance providers
  useEffect(() => {
    if (!providerId || !providerType) return;
    (async () => {
      if (providerType === "hospital") {
        const { data } = await supabase
          .from("holarchelp_hospitals" as any)
          .select("registration_number, address, contact_phone, services")
          .eq("id", providerId)
          .maybeSingle();
        const r: any = data;
        setProfileIncomplete(
          !r ||
          !r.registration_number ||
          !r.address ||
          !r.contact_phone ||
          !(Array.isArray(r.services) ? r.services.length > 0 : !!r.services)
        );
      } else if (providerType === "ambulance") {
        const { data } = await supabase
          .from("holarchelp_ambulance_providers" as any)
          .select("registration_number, base_address, contact_phone, fleet_size")
          .eq("id", providerId)
          .maybeSingle();
        const r: any = data;
        setProfileIncomplete(
          !r ||
          !r.registration_number ||
          !r.base_address ||
          !r.contact_phone ||
          !r.fleet_size
        );
      }
    })();
  }, [providerId, providerType]);


  const accept = async (incidentId: string) => {
    if (!providerId || !user) return;
    const { error } = await supabase.rpc("holarchelp_accept_incident" as any, {
      _incident_id: incidentId, _provider_id: providerId,
    });
    if (error) {
      toast.error(error.message === "Incident already taken" ? "Another responder accepted first" : error.message);
      load();
      return;
    }
    toast.success("Incident locked — you are the responder");
    load();
  };

  const decline = async (incidentId: string) => {
    if (!providerId) return;
    const reason = window.prompt("Reason for declining?") || "Not available";
    await supabase.from("holarchelp_incident_offers" as any).upsert({
      incident_id: incidentId, provider_id: providerId, response: "declined",
      responded_at: new Date().toISOString(),
    } as any, { onConflict: "incident_id,provider_id" });
    await supabase.from("holarchelp_incident_cancellations" as any).insert({
      incident_id: incidentId, provider_id: providerId,
      reason_code: "declined", reason_text: reason,
    } as any);
    toast.success("Declined");
  };

  const myActive = incidents.filter((i) => i.assigned_provider_id === providerId);
  const open = incidents.filter((i) => !i.assigned_provider_id && (i.status === "open" || i.status === "reopened"));
  const lockedByOthers = incidents.filter((i) => i.assigned_provider_id && i.assigned_provider_id !== providerId);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {providerType === "hospital" ? "Hospital" : "Ambulance"} dispatch
        </p>
        <h1 className="text-2xl font-extrabold">Live SOS feed</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard icon={AlertCircle} label="Open SOS" value={open.length} tone="text-sos" />
        <SummaryCard icon={Activity} label="Accepted by us" value={myActive.length} tone="text-primary" />
        <SummaryCard icon={CheckCircle2} label="Locked by others" value={lockedByOthers.length} tone="text-muted-foreground" />
      </div>

      <Section title="Your active incidents" empty="No active incidents you've accepted.">
        {myActive.map((i) => <IncidentCard key={i.id} i={i} primaryAction={
          <Button asChild size="sm"><Link to={`/provider/incident/${i.id}`}>Open</Link></Button>
        } />)}
      </Section>

      <Section title="Open incidents — first to accept locks it" empty={loading ? "Loading…" : "No open SOS in your area right now."}>
        {open.map((i) => (
          <IncidentCard key={i.id} i={i} primaryAction={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => accept(i.id)}>Accept</Button>
              <Button size="sm" variant="outline" onClick={() => decline(i.id)}>Decline</Button>
            </div>
          } />
        ))}
      </Section>

      <Section title="Locked by other responders" empty="None right now.">
        {lockedByOthers.map((i) => (
          <IncidentCard key={i.id} i={i} primaryAction={
            <div className="text-right text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">🚑 Responded</p>
              {i.accepted_at && <p>Accepted {new Date(i.accepted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
              {i.eta_minutes != null && <p>ETA {i.eta_minutes} min</p>}
            </div>
          } />
        ))}
      </Section>
    </div>
  );
}

const SummaryCard = ({ icon: Icon, label, value, tone }: any) => (
  <div className="rounded-2xl border bg-card p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className={`h-4 w-4 ${tone}`} />{label}</div>
    <p className="mt-1 text-2xl font-extrabold">{value}</p>
  </div>
);

const Section = ({ title, empty, children }: { title: string; empty: string; children: any }) => {
  const arr = Array.isArray(children) ? children : [children];
  const hasItems = arr.filter(Boolean).length > 0;
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {hasItems ? <div className="space-y-2">{children}</div>
        : <div className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">{empty}</div>}
    </section>
  );
};

const IncidentCard = ({ i, primaryAction }: { i: Incident; primaryAction: React.ReactNode }) => (
  <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${sevColor(i.severity)}`}>
            {(i.severity ?? "unknown").toUpperCase()}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-4 w-4" />{ago(i.created_at)}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {i.conscious === false && "Unconscious · "}
          {i.breathing === false && "Not breathing · "}
          Incident {i.id.slice(0, 8)}
        </p>
      </div>
      <div className="shrink-0">{primaryAction}</div>
    </div>
  </div>
);
