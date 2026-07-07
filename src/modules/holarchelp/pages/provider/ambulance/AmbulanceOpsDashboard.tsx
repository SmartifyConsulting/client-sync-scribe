import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronRight, Siren, Activity, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/userMessage";

type Row = {
  id: string; status: string; severity: string | null;
  created_at: string; assigned_provider_id: string | null;
  eta_minutes: number | null; conscious: boolean | null; breathing: boolean | null;
  incident_type?: string | null;
  incident_number?: string | null;
  latitude?: number | null; longitude?: number | null;
};

const sevTone = (s: string | null) =>
  s === "critical" ? "bg-destructive/15 text-destructive border-destructive/40"
  : s === "high" ? "bg-warning/15 text-warning border-warning/40"
  : s === "moderate" ? "bg-warning/15 text-warning border-warning/40"
  : "bg-muted text-muted-foreground border-border";

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
};

export default function AmbulanceOpsDashboard() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const { data } = await supabase.from("holarchelp_incidents" as any)
      .select("*")
      .in("status", ["open","reopened","assigned","en_route","arrived","patient_collected","en_route_to_hospital","at_hospital"])
      .order("created_at", { ascending: false }).limit(150);
    setRows(((data as any) ?? []) as Row[]);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("amb-ops-dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const accept = async (id: string) => {
    if (!providerId) return;
    const { error } = await supabase.rpc("holarchelp_accept_incident" as any, { _incident_id: id, _provider_id: providerId });
    if (error) return toast.error(error.message === "Incident already taken" ? t("ambulance.anotherCrewAccepted") : error.message);
    toast.success(t("ambulance.incidentLocked"));
    navigate(`/provider/ambulance/incident/${id}`);
  };

  const mine = rows.filter(r => r.assigned_provider_id === providerId);
  const open = rows.filter(r => !r.assigned_provider_id);
  const others = rows.filter(r => r.assigned_provider_id && r.assigned_provider_id !== providerId);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("provider.emergencyResponseDispatch")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">{t("ambulance.liveSosFeed")}</h1>
        </div>
        <div className="flex gap-1.5">
          <KPI icon={Siren} label={t("ambulance.open")} value={open.length} tone="text-sos" />
          <KPI icon={Activity} label={t("ambulance.myActive")} value={mine.length} tone="text-primary" />
          <KPI icon={Clock} label={t("ambulance.otherCrews")} value={others.length} tone="text-muted-foreground" />
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">{t("ambulance.priority")}</th>
              <th className="px-3 py-2 text-left">{t("ambulance.incident")}</th>
              <th className="px-3 py-2 text-left">{t("common.patient")}</th>
              <th className="px-3 py-2 text-left">{t("ambulance.triggered")}</th>
              <th className="px-3 py-2 text-left">{t("ambulance.response")}</th>
              <th className="px-3 py-2 text-right">{t("ambulance.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => {
              const isMine = r.assigned_provider_id === providerId;
              const isOpen = !r.assigned_provider_id;
              return (
                <tr key={r.id} className={isMine ? "bg-primary/5" : "hover:bg-muted/40"}>
                  <td className="px-3 py-2">
                    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${sevTone(r.severity)}`}>
                      {(r.severity ?? "—").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <p className="text-xs font-bold">{r.incident_type ?? t("ambulance.emergency")}</p>
                    <p className="text-[10px] text-muted-foreground">#{r.id.slice(0,8)}</p>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.conscious === false && <span className="text-destructive font-semibold">{t("ambulance.unconscious")} · </span>}
                    {r.breathing === false && <span className="text-destructive font-semibold">{t("ambulance.notBreathing")} · </span>}
                    {r.conscious !== false && r.breathing !== false && <span className="text-muted-foreground">{t("ambulance.stableSigns")}</span>}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">{ago(r.created_at)} {t("common.ago")}</td>
                  <td className="px-3 py-2 text-xs">
                    {isMine
                      ? <span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{t("ambulance.you")} · {r.status.replace(/_/g," ")}</span>
                      : isOpen
                        ? <span className="rounded-full border border-sos/40 bg-sos/10 px-1.5 py-0.5 text-[10px] font-bold text-sos">{t("status.unassigned")}</span>
                        : <span className="rounded-full border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{t("ambulance.otherCrew")} · {r.status.replace(/_/g," ")}</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isOpen
                      ? <Button size="sm" onClick={() => accept(r.id)} className="h-7">{t("ambulance.accept")}</Button>
                      : <Link to={`/provider/ambulance/incident/${r.id}`} className="inline-flex items-center gap-1 rounded-lg border bg-background px-2 py-1 text-[11px] font-semibold hover:bg-muted">
                           {t("common.open")} <ChevronRight className="h-3 w-3" />
                        </Link>}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={6} className="p-8 text-center text-xs text-muted-foreground">{t("ambulance.noActiveSos")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const KPI = ({ icon: Icon, label, value, tone }: any) => (
  <div className="rounded-xl border bg-card px-3 py-1.5">
    <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground"><Icon className={`h-3 w-3 ${tone}`} />{label}</div>
    <p className="text-base font-extrabold leading-none">{value}</p>
  </div>
);
