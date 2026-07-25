import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { EtaCountdown } from "../../../components/EtaCountdown";
import { Ambulance, ChevronRight, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

type Row = {
  id: string; status: string; severity: string | null;
  created_at: string; eta_minutes: number | null; last_eta_update: string | null;
  assigned_provider_id: string | null;
  incident_type?: string | null; user_id?: string | null;
  conscious: boolean | null; breathing: boolean | null;
};

const sevTone = (s: string | null) =>
  s === "critical" ? "bg-destructive/15 text-destructive border-destructive/40"
  : s === "high" ? "bg-warning/15 text-warning border-warning/40"
  : s === "moderate" ? "bg-warning/15 text-warning border-warning/40"
  : "bg-muted text-muted-foreground border-border";

const statusTone = (s: string) =>
  s === "en_route_to_hospital" ? "bg-primary/10 text-primary border-primary/30"
  : s === "at_hospital" ? "bg-success/10 text-success border-success/30"
  : s === "arrived" || s === "patient_collected" ? "bg-warning/10 text-warning border-warning/30"
  : "bg-muted text-muted-foreground border-border";

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
};

export default function HospitalOpsDashboard() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [crews, setCrews] = useState<Record<string,string>>({});
  const [patients, setPatients] = useState<Record<string,string>>({});

  const load = async () => {
    if (!providerId) return;
    const { data } = await supabase.from("holarchelp_incidents" as any)
      .select("*")
      .eq("destination_hospital_id", providerId)
      .in("status", ["assigned","en_route","arrived","patient_collected","en_route_to_hospital","at_hospital"])
      .order("created_at", { ascending: false }).limit(200);
    const list = ((data as any) ?? []) as Row[];
    setRows(list);

    const ambIds = Array.from(new Set(list.map(r => r.assigned_provider_id).filter(Boolean))) as string[];
    const userIds = Array.from(new Set(list.map(r => r.user_id).filter(Boolean))) as string[];
    if (ambIds.length) {
      const { data: amb } = await supabase.from("holarchelp_ambulance_providers" as any)
        .select("id, company_name").in("id", ambIds);
      const m: Record<string,string> = {};
      ((amb as any) ?? []).forEach((a: any) => { m[a.id] = a.company_name; });
      setCrews(m);
    }
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles" as any)
        .select("id, full_name").in("id", userIds);
      const m: Record<string,string> = {};
      ((profs as any) ?? []).forEach((p: any) => { m[p.id] = p.full_name; });
      setPatients(m);
    }
  };

  useEffect(() => {
    load();
    if (!providerId) return;
    const ch = supabase.channel(`hosp-queue-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents", filter: `destination_hospital_id=eq.${providerId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <h1 className="text-2xl font-extrabold leading-tight">{t("hospital.liveQueue")}</h1>
        <span className="rounded-full border bg-card px-2.5 py-1 text-sm font-semibold">{rows.length} {t("hospital.active")}</span>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-sm uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">{t("common.patient")}</th>
              <th className="px-3 py-2 text-left">{t("hospital.severity")}</th>
              <th className="px-3 py-2 text-left">{t("ambulance.incident")}</th>
              <th className="px-3 py-2 text-left">{t("hospital.er")}</th>
              <th className="px-3 py-2 text-right">{t("hospital.eta")}</th>
              <th className="px-3 py-2 text-left">{t("common.status")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className="transition hover:bg-muted/40">
                <td className="px-3 py-2">
                  <p className="font-semibold">{r.user_id ? (patients[r.user_id] ?? `${t("common.patient")} ${r.id.slice(0,6)}`) : `${t("ambulance.incident")} ${r.id.slice(0,6)}`}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.conscious === false && <span className="text-destructive font-semibold">{t("ambulance.unconscious")} Â· </span>}
                    {r.breathing === false && <span className="text-destructive font-semibold">{t("ambulance.notBreathing")} Â· </span>}
                    {t("ambulance.triggered")} {ago(r.created_at)} {t("common.ago")}
                  </p>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full border px-1.5 py-0.5 text-sm font-bold ${sevTone(r.severity)}`}>
                    {(r.severity ?? "â€”").toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm">{r.incident_type ?? t("ambulance.emergency")}</td>
                <td className="px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-1"><Ambulance className="h-3.5 w-3.5 text-destructive" />
                    {crews[r.assigned_provider_id ?? ""] ?? "â€”"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  {r.eta_minutes != null
                    ? <span className="text-base font-extrabold tabular-nums"><EtaCountdown etaMinutes={r.eta_minutes} lastUpdate={r.last_eta_update} /></span>
                    : <span className="text-sm uppercase text-muted-foreground">â€”</span>}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full border px-1.5 py-0.5 text-sm font-semibold ${statusTone(r.status)}`}>
                    {r.status.replace(/_/g," ")}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link to={`/provider/hospital/incident/${r.id}`} className="inline-flex items-center gap-1 rounded-lg border bg-background px-2 py-1 text-sm font-semibold hover:bg-muted">
                    {t("common.open")} <ChevronRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                  <AlertTriangle className="mx-auto mb-1 h-4 w-4 opacity-50" />
                  {t("hospital.noActive")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

