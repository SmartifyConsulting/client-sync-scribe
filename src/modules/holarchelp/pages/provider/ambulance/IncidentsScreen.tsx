import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Input } from "@/components/ui/input";
import { Loader2, Siren, Search } from "lucide-react";
import { IncidentNumberBadge } from "@/components/IncidentNumberBadge";
import {
  IncidentCard, Timeline, StatusBadge, severityTone, emsAgo, emsSeverityRank,
  type EmsTimelineItem,
} from "../../../components/ems";

type Incident = {
  id: string;
  incident_number: string | null;
  severity: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  completed_at: string | null;
  notes: string | null;
  user_id: string | null;
  triggered_by_user_id: string | null;
  assigned_ambulance_id: string | null;
  destination_hospital_id: string | null;
};

const COLS =
  "id, incident_number, severity, status, created_at, resolved_at, completed_at, notes, user_id, triggered_by_user_id, assigned_ambulance_id, destination_hospital_id";

export default function IncidentsScreen() {
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [vehicles, setVehicles] = useState<Record<string, string>>({});
  const [hospitals, setHospitals] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<EmsTimelineItem[]>([]);

  useEffect(() => {
    if (!providerId) return;
    let cancelled = false;
    const load = async () => {
      const [{ data: incs }, { data: vehs }, { data: hosps }] = await Promise.all([
        supabase.from("holarchelp_incidents" as any)
          .select(COLS)
          .eq("assigned_provider_id", providerId)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("ambulances" as any).select("id, vehicle_code").eq("provider_id", providerId),
        supabase.from("holarchelp_hospitals" as any).select("id, name").eq("status", "approved"),
      ]);
      if (cancelled) return;
      const list = (((incs as any) ?? []) as Incident[]);
      setRows(list);
      setVehicles(Object.fromEntries(((vehs as any[]) ?? []).map((v) => [v.id, v.vehicle_code])));
      setHospitals(Object.fromEntries(((hosps as any[]) ?? []).map((h) => [h.id, h.name])));
      const userIds = Array.from(new Set(list.flatMap((i) => [i.user_id, i.triggered_by_user_id]).filter(Boolean) as string[]));
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        if (!cancelled) setNames(Object.fromEntries(((profs as any[]) ?? []).map((p) => [p.id, p.full_name])));
      }
      setLoading(false);
    };
    load();
    const ch = supabase.channel(`incidents-page-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [providerId]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) { setEvents([]); return; }
    let cancelled = false;
    supabase.from("holarchelp_incident_events" as any)
      .select("id, event_type, created_at, actor_user_id")
      .eq("incident_id", selected.id)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (cancelled) return;
        setEvents(((data as any[]) ?? []).map((e) => ({
          id: e.id,
          label: String(e.event_type ?? "event").replace(/_/g, " "),
          at: e.created_at,
        })));
      });
    return () => { cancelled = true; };
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? rows.filter((r) =>
          (r.incident_number ?? "").toLowerCase().includes(q) ||
          (r.status ?? "").toLowerCase().includes(q) ||
          (r.severity ?? "").toLowerCase().includes(q))
      : rows;
    return [...list].sort((a, b) => {
      const openA = ["open", "reopened", "assigned", "en_route", "arrived"].includes(a.status) ? 0 : 1;
      const openB = ["open", "reopened", "assigned", "en_route", "arrived"].includes(b.status) ? 0 : 1;
      if (openA !== openB) return openA - openB;
      return (emsSeverityRank[a.severity ?? ""] ?? 9) - (emsSeverityRank[b.severity ?? ""] ?? 9);
    });
  }, [rows, search]);

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold">
            <Siren className="h-5 w-5 text-primary" /> Incidents
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">What is happening with this emergency?</p>
        </div>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search reference, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1fr_2.2fr]">
          <section className="rounded-xl border bg-card p-2">
            <h2 className="px-1 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Incidents · {filtered.length}
            </h2>
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No incidents recorded.</p>
            ) : (
              <div className="max-h-[70vh] space-y-1.5 overflow-y-auto">
                {filtered.map((i) => (
                  <IncidentCard
                    key={i.id}
                    incident={{
                      ...i,
                      patient_name: i.user_id ? names[i.user_id] ?? null : null,
                      caller_name: i.triggered_by_user_id ? names[i.triggered_by_user_id] ?? null : null,
                    }}
                    selected={selectedId === i.id}
                    onClick={() => setSelectedId(i.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-card p-3">
            {!selected ? (
              <p className="py-16 text-center text-xs text-muted-foreground">
                Select an incident to view its full record.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <IncidentNumberBadge
                    number={selected.incident_number ?? `INC-${selected.id.slice(0, 8)}`}
                    size="md"
                    label="Reference #"
                  />
                  <div className="flex items-center gap-1">
                    <StatusBadge tone={severityTone(selected.severity)}>{selected.severity ?? "high"}</StatusBadge>
                    <StatusBadge tone="muted">{String(selected.status).replace(/_/g, " ")}</StatusBadge>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 md:grid-cols-3">
                  <Field label="Patient" value={selected.user_id ? names[selected.user_id] ?? "Unknown" : "Unknown"} />
                  <Field label="Caller" value={selected.triggered_by_user_id ? names[selected.triggered_by_user_id] ?? "Self" : "Self"} />
                  <Field label="Vehicle" value={selected.assigned_ambulance_id ? vehicles[selected.assigned_ambulance_id] ?? "Assigned" : "Not assigned"} />
                  <Field label="Hospital" value={selected.destination_hospital_id ? hospitals[selected.destination_hospital_id] ?? "Set" : "Not set"} />
                  <Field label="Raised" value={`${new Date(selected.created_at).toLocaleString()} (${emsAgo(selected.created_at)} ago)`} />
                  <Field
                    label="Outcome"
                    value={
                      selected.completed_at ? `Completed ${emsAgo(selected.completed_at)} ago`
                      : selected.resolved_at ? `Resolved ${emsAgo(selected.resolved_at)} ago`
                      : "In progress"
                    }
                  />
                </dl>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</p>
                  <p className="mt-1 rounded-lg border bg-muted/30 p-2 text-xs italic">
                    {selected.notes ? `"${selected.notes}"` : "No notes captured."}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Timeline &amp; audit trail
                  </p>
                  <Timeline items={events} />
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-xs">{value}</dd>
    </div>
  );
}
