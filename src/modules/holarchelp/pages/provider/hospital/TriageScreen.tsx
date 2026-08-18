import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/userMessage";
import { cn } from "@/lib/utils";

type Row = {
  id: string; status: string; severity: string | null;
  hospital_admission_status: string | null;
  triage_priority: string | null;
  eta_minutes: number | null; created_at: string;
};

const COLUMNS: { key: string; labelKey: string; statuses: string[]; admit?: string; tone: string }[] = [
  { key: "incoming", labelKey: "triageBoard.incoming", statuses: ["assigned","en_route","patient_collected","en_route_to_hospital"], tone: "bg-slate-500/10 text-slate-700" },
  { key: "awaiting", labelKey: "triageBoard.awaiting", statuses: ["arrived"], tone: "bg-amber-500/10 text-amber-700" },
  { key: "arrived", labelKey: "triageBoard.arrived", statuses: ["at_hospital"], admit: "arrived", tone: "bg-blue-500/10 text-blue-700" },
  { key: "triage", labelKey: "triageBoard.inTriage", statuses: ["at_hospital"], admit: "in_triage", tone: "bg-purple-500/10 text-purple-700" },
  { key: "admitted", labelKey: "status.admitted", statuses: ["at_hospital","completed"], admit: "admitted", tone: "bg-green-500/10 text-green-700" },
];

const sevDot = (s: string | null) =>
  s === "critical" ? "bg-destructive" : s === "high" ? "bg-warning" : s === "moderate" ? "bg-warning" : "bg-muted-foreground";

export default function TriageScreen() {
  const { t } = useTranslation();
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
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    await supabase.from("holarchelp_incident_events" as any).insert({
      incident_id: r.id, event_type: `admission_${next}`, payload: {},
    } as any);
    toast.success(t("triageBoard.moved", { status: t(`admissionStatus.${next}`, { defaultValue: next.replace(/_/g," ") }) }));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-foreground">{t("triageBoard.title")}</h1>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        {COLUMNS.map((col) => {
          const items = bucketize(col);
          return (
            <div key={col.key} className="flex min-h-[300px] flex-col rounded-xl border border-neutral-400 bg-card overflow-hidden">
              <div className={cn("flex items-center justify-between px-3 py-2", col.tone)}>
                <p className="text-xs font-bold uppercase tracking-wider">{t(col.labelKey)}</p>
                <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-bold">{items.length}</span>
              </div>
              <div className="flex-1 space-y-1.5 overflow-auto p-2">
                {items.map((r) => {
                  const nextKey = col.key === "incoming" ? null : col.key === "awaiting" ? "arrived" : col.key === "arrived" ? "in_triage" : col.key === "triage" ? "admitted" : null;
                  return (
                    <div key={r.id} className="rounded-xl border bg-background p-2 text-xs hover:border-primary/40">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${sevDot(r.severity)}`} />
                        <p className="flex-1 truncate font-semibold">{t("ambulance.incident")} {r.id.slice(0,8)}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.triage_priority ? `${t("admissions.priority")} ${r.triage_priority}` : t("triageBoard.noTriage")}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1">
                        <Link to={`/provider/hospital/incident/${r.id}`} className="flex-1 truncate rounded-md border bg-card px-1.5 py-1 text-center text-xs font-semibold hover:bg-muted">
                          {t("common.open")}
                        </Link>
                        {nextKey && (
                          <button onClick={() => advance(r, nextKey)} className="inline-flex items-center gap-0.5 rounded-md bg-primary px-1.5 py-1 text-xs font-bold text-primary-foreground">
                            {t("triageBoard.advance")} <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!items.length && <p className="py-6 text-center text-sm text-muted-foreground">—</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
