import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { Siren, AlertTriangle, Clock } from "lucide-react";
import { ParamedicAcceptDialog } from "../../../components/ParamedicAcceptDialog";

type Row = {
  id: string; status: string; severity: string | null;
  conscious: boolean | null; breathing: boolean | null;
  created_at: string; notes?: string | null; incident_type?: string | null;
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
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [pickFor, setPickFor] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Emergency Response Dispatch</p>
        <h1 className="text-2xl font-extrabold">Incoming SOS</h1>
        <p className="text-xs text-muted-foreground">First paramedic to accept locks the incident.</p>
      </header>

      {!rows.length && (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <Siren className="mx-auto mb-2 h-6 w-6 opacity-50" />
          No unassigned SOS in your area. Standing by.
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className={`rounded-2xl border-2 p-4 shadow-sm ${sevBig(r.severity)}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-sos">
                  <Siren className="h-3.5 w-3.5" /> {(r.severity ?? "high").toUpperCase()} · {r.incident_type ?? "Emergency"}
                </p>
                <p className="mt-1 text-lg font-extrabold">Incident #{r.id.slice(0,8)}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> Triggered {ago(r.created_at)} ago
                </p>
              </div>
              {(r.conscious === false || r.breathing === false) && (
                <span className="shrink-0 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase text-destructive">
                  <AlertTriangle className="mr-1 inline h-3 w-3" /> Life-threat
                </span>
              )}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <Stat label="Conscious" value={r.conscious === false ? "No" : "Yes"} tone={r.conscious === false ? "destructive" : undefined} />
              <Stat label="Breathing" value={r.breathing === false ? "No" : "Yes"} tone={r.breathing === false ? "destructive" : undefined} />
            </div>

            {r.notes && <p className="mt-2 rounded-xl border bg-background/60 p-2 text-xs italic text-muted-foreground line-clamp-3">"{r.notes}"</p>}

            <Button size="lg" className="mt-3 h-12 w-full text-base font-extrabold" onClick={() => setPickFor(r.id)}>
              Accept Incident
            </Button>
          </div>
        ))}
      </div>

      <ParamedicAcceptDialog
        incidentId={pickFor}
        providerId={providerId}
        open={!!pickFor}
        onOpenChange={(v) => { if (!v) setPickFor(null); }}
      />
    </div>
  );
}

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: "destructive" }) => (
  <div className={`rounded-xl border bg-background/60 px-2 py-1 ${tone === "destructive" ? "border-destructive/40 text-destructive" : ""}`}>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-sm font-bold">{value}</p>
  </div>
);
