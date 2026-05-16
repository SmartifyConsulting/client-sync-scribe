import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertCircle, Ambulance, Clock, Hospital, Activity, CheckCircle2 } from "lucide-react";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { EtaCountdown } from "../../components/EtaCountdown";

type Inbound = {
  id: string; status: string; severity: string | null;
  created_at: string; eta_minutes: number | null; last_eta_update: string | null;
  assigned_provider_id: string | null; destination_hospital_id: string;
  hospital_admission_status: string | null; triage_priority: string | null;
  conscious: boolean | null; breathing: boolean | null;
};

const sevColor = (s: string | null) =>
  s === "critical" ? "bg-red-500/10 text-red-700 border-red-500/30"
  : s === "high" ? "bg-orange-500/10 text-orange-700 border-orange-500/30"
  : "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

export default function HospitalDashboard() {
  const { providerId } = useProviderAccess();
  const navigate = useNavigate();
  const [inbound, setInbound] = useState<Inbound[]>([]);
  const [hospital, setHospital] = useState<any | null>(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [admittedToday, setAdmittedToday] = useState(0);
  const [crewNames, setCrewNames] = useState<Record<string,string>>({});

  const load = async () => {
    if (!providerId) return;
    const { data: hosp } = await supabase.from("holarchelp_hospitals" as any)
      .select("*").eq("id", providerId).maybeSingle();
    setHospital(hosp);
    const r: any = hosp;
    setProfileIncomplete(!r || !r.registration_number || !r.address || !r.contact_phone || !(Array.isArray(r.services) ? r.services.length > 0 : !!r.services));

    const { data } = await supabase.from("holarchelp_incidents" as any)
      .select("*")
      .eq("destination_hospital_id", providerId)
      .in("status", ["assigned","en_route","arrived","patient_collected","en_route_to_hospital","at_hospital"])
      .order("created_at", { ascending: false }).limit(100);
    const rows = ((data as any) ?? []) as Inbound[];
    setInbound(rows);

    const ambIds = Array.from(new Set(rows.map(r => r.assigned_provider_id).filter(Boolean))) as string[];
    if (ambIds.length) {
      const { data: amb } = await supabase.from("holarchelp_ambulance_providers" as any)
        .select("id, company_name").in("id", ambIds);
      const map: Record<string,string> = {};
      ((amb as any) ?? []).forEach((a: any) => { map[a.id] = a.company_name; });
      setCrewNames(map);
    }

    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const { count } = await supabase.from("holarchelp_incidents" as any)
      .select("id", { count: "exact", head: true })
      .eq("destination_hospital_id", providerId)
      .gte("admitted_at", todayStart.toISOString());
    setAdmittedToday(count ?? 0);
  };

  useEffect(() => {
    load();
    if (!providerId) return;
    const ch = supabase.channel(`hosp-dash-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents", filter: `destination_hospital_id=eq.${providerId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const updateCapacity = async (patch: Partial<{ er_capacity_status: string; er_beds_available: number | null; accepting_patients: boolean }>) => {
    if (!providerId) return;
    const { error } = await supabase.from("holarchelp_hospitals" as any).update(patch as any).eq("id", providerId);
    if (error) return toast.error(error.message);
    setHospital((h: any) => ({ ...(h ?? {}), ...patch }));
  };

  const incoming = inbound.filter(i => ["assigned","en_route","arrived","patient_collected","en_route_to_hospital"].includes(i.status));
  const arrived = inbound.filter(i => i.status === "at_hospital");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hospital ER</p>
        <h1 className="text-2xl font-extrabold">{hospital?.name ?? "Emergency department"}</h1>
      </div>

      {profileIncomplete && (
        <ProfileCompletionBanner
          title="Complete your hospital profile"
          message="Add your registration number, physical address, primary contact phone and the services you offer so dispatch can route incidents to you correctly."
          onComplete={() => navigate("/provider/profile")}
          storageKey="holarc_provider_hospital_banner_dismissed"
        />
      )}

      <div className="rounded-2xl border bg-card p-3 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ER capacity</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">Capacity status</Label>
            <Select value={hospital?.er_capacity_status ?? "green"} onValueChange={(v) => updateCapacity({ er_capacity_status: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="green">🟢 Green — full capacity</SelectItem>
                <SelectItem value="yellow">🟡 Yellow — busy</SelectItem>
                <SelectItem value="red">🔴 Red — diversion</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">ER beds available</Label>
            <Input type="number" value={hospital?.er_beds_available ?? ""}
                   onChange={(e) => updateCapacity({ er_beds_available: e.target.value === "" ? null : Number(e.target.value) })}
                   className="rounded-xl" />
          </div>
          <div className="flex items-end gap-2">
            <Switch checked={!!hospital?.accepting_patients} onCheckedChange={(v) => updateCapacity({ accepting_patients: v })} />
            <span className="text-xs">{hospital?.accepting_patients ? "Accepting patients" : "Not accepting"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KPI icon={AlertCircle} label="Incoming" value={incoming.length} tone="text-sos" />
        <KPI icon={Clock} label="Awaiting arrival" value={incoming.filter(i => i.status === "en_route_to_hospital").length} tone="text-orange-600" />
        <KPI icon={Activity} label="At hospital" value={arrived.length} tone="text-primary" />
        <KPI icon={CheckCircle2} label="Admitted today" value={admittedToday} tone="text-green-600" />
      </div>

      <Section title="Incoming patients" empty="No incoming patients right now.">
        {incoming.map((i) => (
          <Link key={i.id} to={`/provider/incident/${i.id}`}
                className="block rounded-xl border bg-card p-3 transition hover:border-primary/40 hover:bg-primary/5">
            <div className="flex items-start gap-2">
              <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${sevColor(i.severity)}`}>
                {(i.severity ?? "").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  <Ambulance className="inline h-3.5 w-3.5 text-red-600" /> {crewNames[i.assigned_provider_id ?? ""] ?? "Ambulance"} · {i.status.replace(/_/g," ")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {i.conscious === false && "Unconscious · "}
                  {i.breathing === false && "Not breathing · "}
                  Triggered {ago(i.created_at)} · Incident {i.id.slice(0,8)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {i.eta_minutes != null
                  ? <><p className="text-xl font-extrabold tabular-nums"><EtaCountdown etaMinutes={i.eta_minutes} lastUpdate={i.last_eta_update} /></p>
                      <p className="text-[10px] uppercase text-muted-foreground">ETA</p></>
                  : <p className="text-[10px] uppercase text-muted-foreground">No ETA yet</p>}
              </div>
            </div>
          </Link>
        ))}
      </Section>

      <Section title="At hospital — triage / admission" empty="No patients at hospital.">
        {arrived.map((i) => (
          <Link key={i.id} to={`/provider/incident/${i.id}`}
                className="flex items-center gap-2 rounded-xl border bg-card p-3 transition hover:border-primary/40 hover:bg-primary/5">
            <Hospital className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Incident {i.id.slice(0,8)}</p>
              <p className="text-[11px] text-muted-foreground">{i.hospital_admission_status ?? "awaiting triage"} · priority {i.triage_priority ?? "—"}</p>
            </div>
            <Button asChild size="sm" variant="outline"><span>Open</span></Button>
          </Link>
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
