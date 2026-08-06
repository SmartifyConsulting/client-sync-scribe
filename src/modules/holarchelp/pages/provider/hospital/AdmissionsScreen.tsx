import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { CheckCircle2, ClipboardList, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InpatientsScreen from "./InpatientsScreen";

type Row = {
  id: string; status: string; severity: string | null;
  hospital_admission_status: string | null;
  triage_priority: string | null;
  admitted_at: string | null; completed_at: string | null;
  triage_bay: string | null; triage_nurse: string | null;
};

const ago = (iso: string | null) => {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
};

const statusLabel = (status: string | null | undefined, t: (key: string, options?: any) => string) =>
  t(`admissionStatus.${status ?? "incoming"}`, { defaultValue: (status ?? "incoming").replace(/_/g, " ") });

export default function AdmissionsScreen() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "inpatients" ? "inpatients" : "admissions";

  useEffect(() => {
    const load = async () => {
      if (!providerId) return;
      const { data } = await supabase.from("holarchelp_incidents" as any)
        .select("*").eq("destination_hospital_id", providerId)
        .in("status", ["at_hospital","completed"])
        .order("admitted_at", { ascending: false, nullsFirst: false }).limit(80);
      setRows(((data as any) ?? []) as Row[]);
    };
    load();
    if (!providerId) return;
    const ch = supabase.channel(`hosp-adm-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents", filter: `destination_hospital_id=eq.${providerId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [providerId]);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("provider.hospitalEmergencyOperations")}</p>
        <h1 className="text-2xl font-extrabold">{t("admissions.title")}</h1>
      </header>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="admissions" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
            <ClipboardList className="h-3.5 w-3.5" /> {t("admissions.title")}
          </TabsTrigger>
          <TabsTrigger value="inpatients" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Users className="h-3.5 w-3.5" /> Inpatients
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admissions" className="mt-4">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">{t("ambulance.incident")}</th>
                  <th className="px-3 py-2 text-left">{t("admissions.admission")}</th>
                  <th className="px-3 py-2 text-left">{t("admissions.priority")}</th>
                  <th className="px-3 py-2 text-left">{t("admissions.bayNurse")}</th>
                  <th className="px-3 py-2 text-left">{t("admissions.admitted")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <Link to={`/provider/hospital/incident/${r.id}`} className="font-semibold text-primary hover:underline">
                        #{r.id.slice(0,8)}
                      </Link>
                      <p className="text-xs text-muted-foreground">{statusLabel(r.status, t)}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full border bg-background px-1.5 py-0.5 text-xs font-semibold">
                        {r.hospital_admission_status === "admitted" && <CheckCircle2 className="h-3 w-3 text-success" />}
                        {statusLabel(r.hospital_admission_status, t)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{r.triage_priority ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.triage_bay ?? "—"}{r.triage_nurse ? ` · ${r.triage_nurse}` : ""}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{ago(r.admitted_at ?? r.completed_at)} {t("common.ago")}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">{t("admissions.noAdmissions")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="inpatients" className="mt-4">
          <InpatientsScreen />
        </TabsContent>
      </Tabs>
    </div>
  );
}
