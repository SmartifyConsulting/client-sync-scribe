import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Radio, Siren, Truck, MapPin, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { IncidentNumberBadge } from "@/components/IncidentNumberBadge";

type Incident = {
  id: string;
  incident_number?: string | null;
  severity: string | null;
  status: string;
  created_at: string;
  notes?: string | null;
  incident_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Shift = {
  id: string;
  user_id: string;
  ambulance_id: string;
  status: string;
  vehicle_code?: string | null;
  registration_number?: string | null;
  lead_name?: string | null;
};

const sevOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2 };

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
};

export default function DispatcherConsoleScreen() {
  const { providerId } = useProviderAccess();
  const [onDuty, setOnDuty] = useState(false);
  const [togglingDuty, setTogglingDuty] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    if (!providerId) return;
    const [{ data: prov }, { data: incs }, { data: shf }] = await Promise.all([
      supabase.from("holarchelp_ambulance_providers" as any).select("dispatcher_on_duty").eq("id", providerId).maybeSingle(),
      supabase.from("holarchelp_incidents" as any)
        .select("*").is("assigned_paramedic_user_id", null).in("status", ["open", "reopened"])
        .order("created_at", { ascending: true }).limit(50),
      supabase.from("paramedic_shifts" as any)
        .select("id, user_id, ambulance_id, status, ambulances(vehicle_code, registration_number), profiles:user_id(full_name)")
        .eq("provider_id", providerId).is("ended_at", null),
    ]);
    setOnDuty(!!(prov as any)?.dispatcher_on_duty);
    setIncidents((((incs as any) ?? []) as Incident[]).sort((a, b) => (sevOrder[a.severity ?? ""] ?? 9) - (sevOrder[b.severity ?? ""] ?? 9)));
    setShifts(
      (((shf as any) ?? []) as any[]).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        ambulance_id: r.ambulance_id,
        status: r.status,
        vehicle_code: r.ambulances?.vehicle_code,
        registration_number: r.ambulances?.registration_number,
        lead_name: r.profiles?.full_name,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    if (!providerId) return;
    const ch = supabase.channel(`dispatch-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "paramedic_shifts", filter: `provider_id=eq.${providerId}` }, loadAll)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "holarchelp_ambulance_providers", filter: `id=eq.${providerId}` }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const toggleDuty = async (next: boolean) => {
    if (!providerId) return;
    setTogglingDuty(true);
    const { error } = await supabase.rpc("holarchelp_set_dispatcher_on_duty" as any, {
      _provider_id: providerId, _on: next,
    });
    if (error) toast.error(error.message);
    else { setOnDuty(next); toast.success(next ? "You are on duty as Dispatcher" : "Dispatcher off duty"); }
    setTogglingDuty(false);
  };

  const assign = async (shiftId: string) => {
    if (!selectedIncidentId) return;
    setAssigning(true);
    const { error } = await supabase.rpc("holarchelp_dispatcher_assign" as any, {
      _incident_id: selectedIncidentId, _shift_id: shiftId,
    });
    if (error) toast.error(error.message);
    else { toast.success("Vehicle assigned. Crew has been notified."); setSelectedIncidentId(null); loadAll(); }
    setAssigning(false);
  };

  const selected = incidents.find((i) => i.id === selectedIncidentId) ?? null;
  const available = shifts.filter((s) => s.status === "available");
  const busy = shifts.filter((s) => s.status === "busy");

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Emergency Response Dispatch</p>
          <h1 className="text-2xl font-extrabold mt-1 flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" /> Dispatcher Console
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Pick an incident, pick a vehicle, assign. Crew gets paged and the SOS becomes their active mission.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold">I am on duty</span>
          <Switch checked={onDuty} disabled={togglingDuty} onCheckedChange={toggleDuty} />
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.1fr]">
        {/* Incidents */}
        <section className="rounded-xl border bg-card p-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 py-1">Open SOS · {incidents.length}</h2>
          {incidents.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">Queue is clear.</p>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {incidents.map((i) => (
                <button
                  key={i.id}
                  onClick={() => setSelectedIncidentId(i.id)}
                  className={`w-full text-left rounded-lg border p-2 transition ${
                    selectedIncidentId === i.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <IncidentNumberBadge number={i.incident_number ?? `INC-${i.id.slice(0, 8)}`} size="sm" showCopy={false} label="Ref" />
                    <span className={`text-[10px] font-bold uppercase ${
                      i.severity === "critical" ? "text-destructive" : i.severity === "high" ? "text-warning" : "text-muted-foreground"
                    }`}>
                      <Siren className="inline h-3 w-3 mr-0.5" />{i.severity ?? "high"}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 truncate">{i.incident_type ?? "Emergency"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {ago(i.created_at)} ago
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Available vehicles */}
        <section className="rounded-xl border bg-card p-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 py-1">Available vehicles · {available.length}</h2>
          {available.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No vehicles on shift available.</p>
          ) : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {available.map((s) => (
                <div key={s.id} className="rounded-lg border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5 text-primary" />
                      {s.vehicle_code ?? "Vehicle"}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-success">Available</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Lead: {s.lead_name ?? s.user_id.slice(0, 8)}</p>
                  {s.registration_number && <p className="text-[10px] text-muted-foreground">{s.registration_number}</p>}
                  <Button
                    size="sm"
                    className="mt-2 w-full h-8 text-xs"
                    disabled={!selectedIncidentId || assigning}
                    onClick={() => assign(s.id)}
                  >
                    Assign to selected SOS
                  </Button>
                </div>
              ))}
            </div>
          )}
          {busy.length > 0 && (
            <>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 py-1 mt-2">On a call · {busy.length}</h2>
              <div className="space-y-1 opacity-60">
                {busy.map((s) => (
                  <div key={s.id} className="rounded-lg border px-2 py-1.5 text-[11px]">
                    <span className="font-bold">{s.vehicle_code}</span> · {s.lead_name ?? s.user_id.slice(0, 8)}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Details */}
        <section className="rounded-xl border bg-card p-3">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Selected incident</h2>
          {!selected ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">Pick an SOS on the left, then tap "Assign" on an available vehicle.</p>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="font-mono text-sm font-bold">#{selected.incident_number ?? selected.id.slice(0, 8)}</p>
              <p className="text-sm">{selected.incident_type ?? "Emergency"} · <span className="uppercase font-bold">{selected.severity}</span></p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Triggered {ago(selected.created_at)} ago
              </p>
              {selected.latitude != null && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {selected.latitude.toFixed(4)}, {selected.longitude?.toFixed(4)}
                </p>
              )}
              {selected.notes && (
                <p className="rounded-lg border bg-muted/30 p-2 text-xs italic">"{selected.notes}"</p>
              )}
              <p className="text-[11px] text-muted-foreground pt-2 border-t">
                Tap "Assign" on an available vehicle to dispatch.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
