import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Siren, AlertTriangle, Clock, Truck, Users, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useParamedicShift } from "../../../hooks/useParamedicShift";
import { ParamedicAcceptDialog } from "../../../components/ParamedicAcceptDialog";
import { StartShiftDialog } from "../../../components/StartShiftDialog";
import DispatcherConsoleScreen from "./DispatcherConsoleScreen";

type Row = {
  id: string; status: string; severity: string | null;
  conscious: boolean | null; breathing: boolean | null;
  created_at: string; notes?: string | null; incident_type?: string | null;
};

type RollingShift = {
  id: string;
  user_id: string;
  ambulance_id: string;
  status: string;
  started_at: string;
  ambulances?: { vehicle_code: string; registration_number: string | null } | null;
  profiles?: { full_name: string | null } | null;
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
  const [rollingShifts, setRollingShifts] = useState<RollingShift[]>([]);

  // Live SOS queue
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("holarchelp_incidents" as any)
        .select("id,status,severity,conscious,breathing,created_at,notes,incident_type")
        .is("assigned_paramedic_user_id", null)
        .in("status", ["open", "reopened"])
        .order("created_at", { ascending: true }).limit(40);
      const order: Record<string, number> = { critical: 0, high: 1, moderate: 2 };
      setRows((((data as any) ?? []) as Row[]).sort((a, b) => (order[a.severity ?? ""] ?? 9) - (order[b.severity ?? ""] ?? 9)));
    };
    load();
    const ch = supabase.channel("dash-incoming")
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Rolling shifts for this provider
  useEffect(() => {
    if (!providerId) return;
    const load = async () => {
      const { data: shifts } = await supabase.from("paramedic_shifts" as any)
        .select("id, user_id, ambulance_id, status, started_at")
        .eq("provider_id", providerId)
        .is("ended_at", null)
        .order("started_at", { ascending: false });
      const list = ((shifts as any) ?? []) as RollingShift[];
      if (list.length) {
        const vehIds = list.map((s) => s.ambulance_id);
        const userIds = list.map((s) => s.user_id);
        const [{ data: vehs }, { data: profs }] = await Promise.all([
          supabase.from("ambulances" as any).select("id, vehicle_code, registration_number").in("id", vehIds),
          supabase.from("profiles").select("id, full_name").in("id", userIds),
        ]);
        const vm = new Map((vehs as any[] ?? []).map((v) => [v.id, v]));
        const pm = new Map((profs as any[] ?? []).map((p) => [p.id, p]));
        list.forEach((s) => {
          s.ambulances = vm.get(s.ambulance_id) ?? null;
          s.profiles = pm.get(s.user_id) ?? null;
        });
      }
      setRollingShifts(list);
    };
    load();
    const ch = supabase.channel(`dash-shifts-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "paramedic_shifts", filter: `provider_id=eq.${providerId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [providerId]);

  const isOffShift = !shift;
  const isBusy = shift?.status === "busy";

  const stats = {
    incoming: rows.length,
    critical: rows.filter((r) => r.severity === "critical").length,
    rolling: rollingShifts.length,
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
          Dispatcher console, live SOS queue, rolling shifts and dispatch actions — all on one screen.
        </p>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Incoming" value={stats.incoming} tone={stats.incoming ? "destructive" : "muted"} />
        <StatCard label="Critical" value={stats.critical} tone={stats.critical ? "destructive" : "muted"} />
        <StatCard label="Rolling" value={stats.rolling} tone="success" />
      </div>

      {/* DISPATCHER CONSOLE — merged from former Dispatcher Console screen */}
      <section className="rounded-2xl border-2 border-primary/30 bg-card/40 p-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
          <Radio className="h-4 w-4 text-primary" /> Dispatcher Console
        </h2>
        <DispatcherConsoleScreen />
      </section>

      {/* INCOMING SOS — merged from former Incoming SOS screen */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Siren className="h-4 w-4 text-sos" /> Incoming SOS
        </h2>

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
                    <p className="mt-1 text-base font-extrabold">#{r.id.slice(0, 8)}</p>
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

      {/* ROLLING SHIFTS — collapsed by default, teal-bordered accordion */}
      <Accordion type="single" collapsible className="space-y-2">
        <AccordionItem value="rolling" className="rounded-xl border-2 border-primary/40 bg-background overflow-hidden">
          <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
            <div className="flex flex-1 items-center justify-between pr-2">
              <span className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Rolling shifts
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                {rollingShifts.length}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            {rollingShifts.length === 0 ? (
              <p className="text-xs italic text-muted-foreground py-2">No vehicles on shift right now.</p>
            ) : (
              <div className="space-y-1.5">
                {rollingShifts.map((s) => (
                  <div key={s.id} className="rounded-lg border bg-card p-2 flex items-center gap-2 text-xs">
                    <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-semibold">
                      {s.ambulances?.vehicle_code ?? "—"}
                      {s.ambulances?.registration_number ? <span className="text-muted-foreground"> · {s.ambulances.registration_number}</span> : null}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="truncate">{s.profiles?.full_name ?? s.user_id.slice(0, 8)}</span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      s.status === "busy" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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
