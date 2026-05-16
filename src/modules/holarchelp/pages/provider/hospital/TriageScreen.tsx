import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";

type Row = {
  id: string; status: string; severity: string | null;
  hospital_admission_status: string | null;
  triage_priority: string | null;
  eta_minutes: number | null; created_at: string;
};

const COLUMNS: { key: string; label: string; statuses: string[]; admit?: string }[] = [
  { key: "incoming", label: "Incoming", statuses: ["assigned","en_route","patient_collected","en_route_to_hospital"] },
  { key: "awaiting", label: "Awaiting arrival", statuses: ["arrived"] },
  { key: "arrived", label: "Arrived", statuses: ["at_hospital"], admit: "arrived" },
  { key: "triage", label: "In triage", statuses: ["at_hospital"], admit: "in_triage" },
  { key: "admitted", label: "Admitted", statuses: ["at_hospital","completed"], admit: "admitted" },
];

const sevDot = (s: string | null) =>
  s === "critical" ? "bg-red-500" : s === "high" ? "bg-orange-500" : s === "moderate" ? "bg-yellow-500" : "bg-muted-foreground";

export default function TriageScreen() {
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!providerId) return;
      const { data } = await supabase.from("holarchelp_incidents" as any)
        .select("*").eq("destination_hospital_id", providerId)
        .in("status", ["assigned","en_route","arrived","patient_collected","en_route_to_hospital","at_hospital","completed"])
        .order("created_at", { ascending: false }).limit(150);
      setRows(((data as any) ?? []) as Row[]);
    };
    load();
    if (!providerId) return;
    const ch = supabase.channel(`hosp-triage-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents", filter: `destination_hospital_id=eq.${providerId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [providerId]);

  const bucketize = (col: typeof COLUMNS[number]) => {
    if (col.admit) return rows.filter(r => r.hospital_admission_status === col.admit);
    return rows.filter(r => col.statuses.includes(r.status) && !["arrived","in_triage","admitted"].includes(r.hospital_admission_status ?? ""));
  };

  const advance = async (r: Row, next: string) => {
    const patch: any = { hospital_admission_status: next };
    if (next === "admitted") patch.admitted_at = new Date().toISOString();
    if (next === "in_triage") patch.triage_assigned_at = new Date().toISOString();
    const { error } = await supabase.from("holarchelp_incidents" as any).update(patch).eq("id", r.id);
    if (error) return toast.error(error.message);
    await supabase.from("holarchelp_incident_events" as any).insert({
      incident_id: r.id, event_type: `admission_${next}`, payload: {},
    } as any);
    toast.success(`Moved to ${next.replace(/_/g," ")}`);
  };

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Hospital Emergency Operations</p>
        <h1 className="text-2xl font-extrabold">Triage Board</h1>
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        {COLUMNS.map((col) => {
          const items = bucketize(col);
          return (
            <div key={col.key} className="flex min-h-[300px] flex-col rounded-2xl border bg-card">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{col.label}</p>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">{items.length}</span>
              </div>
              <div className="flex-1 space-y-1.5 overflow-auto p-2">
                {items.map((r) => {
                  const nextKey = col.key === "incoming" ? null : col.key === "awaiting" ? "arrived" : col.key === "arrived" ? "in_triage" : col.key === "triage" ? "admitted" : null;
                  return (
                    <div key={r.id} className="rounded-xl border bg-background p-2 text-xs hover:border-primary/40">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${sevDot(r.severity)}`} />
                        <p className="flex-1 truncate font-semibold">Incident {r.id.slice(0,8)}</p>
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {r.triage_priority ? `Priority ${r.triage_priority}` : "No triage yet"}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1">
                        <Link to={`/provider/hospital/incident/${r.id}`} className="flex-1 truncate rounded-md border bg-card px-1.5 py-1 text-center text-[10px] font-semibold hover:bg-muted">
                          Open
                        </Link>
                        {nextKey && (
                          <button onClick={() => advance(r, nextKey)} className="inline-flex items-center gap-0.5 rounded-md bg-primary px-1.5 py-1 text-[10px] font-bold text-primary-foreground">
                            Advance <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!items.length && <p className="py-6 text-center text-[11px] text-muted-foreground">—</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
