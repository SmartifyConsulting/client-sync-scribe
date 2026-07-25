import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

type Row = {
  id: string; status: string; severity: string | null;
  created_at: string; completed_at: string | null;
  destination_hospital_id: string | null;
};

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "â€”";

export default function IncidentHistoryScreen() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [hosp, setHosp] = useState<Record<string,string>>({});

  useEffect(() => {
    const load = async () => {
      if (!providerId) return;
      const { data } = await supabase.from("holarchelp_incidents" as any)
        .select("*").eq("assigned_provider_id", providerId)
        .in("status", ["completed","cancelled"])
        .order("completed_at", { ascending: false, nullsFirst: false }).limit(100);
      const list = ((data as any) ?? []) as Row[];
      setRows(list);
      const ids = Array.from(new Set(list.map(r => r.destination_hospital_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: hs } = await supabase.from("holarchelp_hospitals" as any).select("id, name").in("id", ids);
        const m: Record<string,string> = {};
        ((hs as any) ?? []).forEach((h: any) => { m[h.id] = h.name; });
        setHosp(m);
      }
    };
    load();
  }, [providerId]);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("provider.emergencyResponseDispatch")}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("incidentHistory.title")}</h1>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-sm uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">{t("ambulance.incident")}</th>
              <th className="px-3 py-2 text-left">{t("incidentHistory.outcome")}</th>
              <th className="px-3 py-2 text-left">{t("incidentHistory.destination")}</th>
              <th className="px-3 py-2 text-left">{t("ambulance.triggered")}</th>
              <th className="px-3 py-2 text-left">{t("incidentHistory.closed")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="px-3 py-2 text-sm font-bold">#{r.id.slice(0,8)}</td>
                <td className="px-3 py-2 text-sm">
                  {r.status === "completed"
                    ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" /> {t("status.completed")}</span>
                    : <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" /> {t("status.cancelled")}</span>}
                </td>
                <td className="px-3 py-2 text-sm">{hosp[r.destination_hospital_id ?? ""] ?? "â€”"}</td>
                <td className="px-3 py-2 text-sm text-muted-foreground">{fmt(r.created_at)}</td>
                <td className="px-3 py-2 text-sm text-muted-foreground">{fmt(r.completed_at)}</td>
                <td className="px-3 py-2 text-right">
                  <Link to={`/provider/ambulance/incident/${r.id}`} className="inline-flex items-center gap-1 rounded-lg border bg-background px-2 py-1 text-sm font-semibold hover:bg-muted">
                    {t("common.review")} <ChevronRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">{t("incidentHistory.noClosed")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

