import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Siren, AlertTriangle, Clock, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useParamedicShift } from "../../../hooks/useParamedicShift";
import { ParamedicAcceptDialog } from "../../../components/ParamedicAcceptDialog";
import { StartShiftDialog } from "../../../components/StartShiftDialog";
import DispatcherConsoleScreen from "./DispatcherConsoleScreen";
import ActiveMissionsPanel from "./ActiveMissionsPanel";


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
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
};

export default function EmergencyDashboardScreen() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  const { shift } = useParamedicShift();
  const [rows, setRows] = useState<Row[]>([]);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);

  // Live SOS queue
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("holarchelp_incidents" as any)
        .select("id,status,severity,conscious,breathing,created_at,notes,incident_type,incident_number")
        .is("assigned_paramedic_user_id", null)
        .in("status", ["open", "reopened"])
        .order("created_at", { ascending: true }).limit(40);
      const order: Record<string, number> = { critical: 0, high: 1, moderate: 2 };
      setRows((((data as any) ?? []) as Row[]).sort((a, b) => (order[a.severity ?? ""] ?? 9) - (order[b.severity ?? ""] ?? 9)));
    };
    load();
    const ch = supabase.channel("dash-incoming")
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incident_offers" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const isOffShift = !shift;
  const isBusy = shift?.status === "busy";

  const stats = {
    incoming: rows.length,
    critical: rows.filter((r) => r.severity === "critical").length,
  };

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t("provider.emergencyResponseDispatch") || "Emergency Response Dispatch"}
        </p>
        <h1 className="text-2xl font-extrabold mt-1 flex items-center gap-2">
          <Siren className="h-5 w-5 text-primary" />
          {t("nav.emergencyDashboard", "Dispatch Dashboard")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Dispatcher console, live SOS queue and dispatch actions — all on one screen.
        </p>
      </header>

      {/* INCOMING SOS — banner + stats + queue */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Siren className="h-4 w-4 text-sos" /> Incoming SOS
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Incoming" value={stats.incoming} tone={stats.incoming ? "destructive" : "muted"} />
          <StatCard label="Critical" value={stats.critical} tone={stats.critical ? "destructive" : "muted"} />
        </div>

        {isOffShift && (
          <div className="rounded-2xl border border-warning/40 bg-warning/10 p-3 text-xs">
            <p className="font-bold text-warning">You are off shift.</p>
            <p className="mt-1 text-muted-foreground">Start a shift to accept incidents.</p>
            <Button size="sm" className="mt-2 h-7 text-xs" onClick={() => setStartOpen(true)}>
              Start shift
            </Button>
          </div>
        )}

        {!isOffShift && isBusy && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs">
            <p className="font-bold text-destructive">You have an active incident.</p>
            <p className="mt-1 text-muted-foreground">Finish it before accepting another.</p>
          </div>
        )}

        {!isOffShift && !isBusy && !rows.length && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-xs text-muted-foreground">
            <Siren className="mx-auto mb-2 h-5 w-5 opacity-50" />
            No incoming SOS right now.
          </div>
        )}

        {!isOffShift && !isBusy && rows.length > 0 && (
          <div className="grid gap-2 lg:grid-cols-2">
            {rows.map((r) => (
              <div key={r.id} className={`rounded-2xl border-2 p-3 ${sevBig(r.severity)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-sos">
                      <Siren className="h-3 w-3" /> {(r.severity ?? "high").toUpperCase()} · {r.incident_type ?? "Emergency"}
                    </p>
                    <p className="mt-1 text-base font-extrabold">{r.incident_number ?? `INC-${r.id.slice(0, 8)}`}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {ago(r.created_at)} ago
                    </p>
                  </div>
                  {(r.conscious === false || r.breathing === false) && (
                    <span className="shrink-0 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
                      <AlertTriangle className="mr-1 inline h-3 w-3" /> Life threat
                    </span>
                  )}
                </div>
                {r.notes && <p className="mt-2 rounded-lg border bg-background/60 p-2 text-[11px] italic text-muted-foreground line-clamp-2">"{r.notes}"</p>}
                <Button size="sm" className="mt-2 h-9 w-full font-bold" onClick={() => setPickFor(r.id)}>
                  Accept &amp; Roll
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* DISPATCHER CONSOLE */}
      <section className="rounded-2xl border-2 border-primary/30 bg-card/40 p-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
          <Radio className="h-4 w-4 text-primary" /> Dispatcher Console
        </h2>
        <DispatcherConsoleScreen />
      </section>

      {/* ACTIVE MISSIONS — own red-framed panel */}
      <ActiveMissionsPanel />


      <ParamedicAcceptDialog
        incidentId={pickFor}
        open={!!pickFor}
        onOpenChange={(v) => { if (!v) setPickFor(null); }}
        onNeedShift={() => setStartOpen(true)}
      />
      <StartShiftDialog providerId={providerId} open={startOpen} onOpenChange={setStartOpen} />
    </div>
  );
}

function StatCard({
  label, value, tone,
}: { label: string; value: number; tone: "destructive" | "success" | "muted" }) {
  const toneClass =
    tone === "destructive" ? "text-destructive"
    : tone === "success" ? "text-success"
    : "text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-extrabold mt-0.5 tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
