import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Siren, AlertTriangle, Clock, PlayCircle, Pause } from "lucide-react";
import { ParamedicAcceptDialog } from "../../../components/ParamedicAcceptDialog";
import { StartShiftDialog } from "../../../components/StartShiftDialog";
import { useParamedicShift } from "../../../hooks/useParamedicShift";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useTranslation } from "react-i18next";

type Row = {
  id: string; status: string; severity: string | null;
  conscious: boolean | null; breathing: boolean | null;
  created_at: string; notes?: string | null; incident_type?: string | null;
  incident_number?: string | null;
};

const sevBig = (s: string | null) =>
  s === "critical" ? "border-destructive/60 bg-destructive/10"
  : s === "high" ? "border-warning/60 bg-warning/10"
  : "border-warning/40 bg-warning/5";

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s} seconds`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)}h`;
};

export default function IncomingSosScreen() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  const { shift } = useParamedicShift();
  const [rows, setRows] = useState<Row[]>([]);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [dispatcherOnDuty, setDispatcherOnDuty] = useState(false);

  useEffect(() => {
    if (!providerId) return;
    supabase.from("holarchelp_ambulance_providers" as any)
      .select("dispatcher_on_duty").eq("id", providerId).maybeSingle()
      .then(({ data }) => setDispatcherOnDuty(!!(data as any)?.dispatcher_on_duty));
    const ch = supabase.channel(`amb-prov-${providerId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "holarchelp_ambulance_providers", filter: `id=eq.${providerId}` },
        (p) => setDispatcherOnDuty(!!(p.new as any).dispatcher_on_duty))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [providerId]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("holarchelp_incidents" as any)
        .select("*").is("assigned_paramedic_user_id", null)
        .in("status", ["open","reopened"])
        .order("created_at", { ascending: true }).limit(40);
      const order: Record<string, number> = { critical: 0, high: 1, moderate: 2 };
      setRows((((data as any) ?? []) as Row[]).sort((a,b) => (order[a.severity ?? ""] ?? 9) - (order[b.severity ?? ""] ?? 9)));
    };
    load();
    const ch = supabase.channel("amb-incoming")
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);


  const isOffShift = !shift;
  const isBusy = shift?.status === "busy";

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("incomingSos.title")}</h1>
        <p className="text-xs text-muted-foreground">{t("incomingSos.subtitle")}</p>
      </header>

      {dispatcherOnDuty && !isOffShift && (
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-3 text-xs text-foreground">
          <span className="font-bold text-primary">Dispatcher on duty.</span> A controller is assigning units —
          you will be paged on your phone when you're picked. You can still self-accept below if it's urgent.
        </div>
      )}

      {isOffShift && (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-8 text-center">
          <PlayCircle className="mx-auto mb-2 h-7 w-7 text-primary" />
          <p className="text-base font-bold">{t("incomingSos.offShiftTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("incomingSos.offShiftBody")}</p>
          <Button className="mt-3" onClick={() => setStartOpen(true)}>{t("provider.startShift")}</Button>
          <StartShiftDialog providerId={providerId} open={startOpen} onOpenChange={setStartOpen} />
        </div>
      )}

      {!isOffShift && isBusy && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <Pause className="mx-auto mb-2 h-6 w-6 text-destructive" />
          <p className="text-sm font-bold">{t("incomingSos.activeIncidentTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("incomingSos.activeIncidentBody")}</p>
        </div>
      )}

      {!isOffShift && !isBusy && !rows.length && (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <Siren className="mx-auto mb-2 h-6 w-6 opacity-50" />
          {t("incomingSos.none")}
        </div>
      )}

      {!isOffShift && !isBusy && (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((r) => (
            <div key={r.id} className={`rounded-2xl border-2 p-4 shadow-sm ${sevBig(r.severity)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-sos">
                    <Siren className="h-3.5 w-3.5" /> {(r.severity ?? "high").toUpperCase()} · {r.incident_type ?? t("ambulance.emergency")}
                  </p>
                  <p className="mt-1 text-lg font-extrabold">{r.incident_number ?? `INC-${r.id.slice(0,8)}`}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" /> {t("ambulance.triggered")} {ago(r.created_at)} {t("common.ago")}
                  </p>
                </div>
                {(r.conscious === false || r.breathing === false) && (
                  <span className="shrink-0 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs font-bold uppercase text-destructive">
                    <AlertTriangle className="mr-1 inline h-3 w-3" /> {t("incomingSos.lifeThreat")}
                  </span>
                )}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <Stat label={t("incomingSos.conscious")} value={r.conscious === false ? t("common.no") : t("common.yes")} tone={r.conscious === false ? "destructive" : undefined} />
                <Stat label={t("incomingSos.breathing")} value={r.breathing === false ? t("common.no") : t("common.yes")} tone={r.breathing === false ? "destructive" : undefined} />
              </div>

              {r.notes && <p className="mt-2 rounded-xl border bg-background/60 p-2 text-xs italic text-muted-foreground line-clamp-3">"{r.notes}"</p>}

              <Button size="lg" className="mt-3 h-12 w-full text-base font-extrabold" onClick={() => setPickFor(r.id)}>
                Accept &amp; Roll
              </Button>
            </div>
          ))}
        </div>
      )}


      <ParamedicAcceptDialog
        incidentId={pickFor}
        open={!!pickFor}
        onOpenChange={(v) => { if (!v) setPickFor(null); }}
        onNeedShift={() => setStartOpen(true)}
      />
    </div>
  );
}

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: "destructive" }) => (
  <div className={`rounded-xl border bg-background/60 px-2 py-1 ${tone === "destructive" ? "border-destructive/40 text-destructive" : ""}`}>
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-sm font-bold">{value}</p>
  </div>
);
