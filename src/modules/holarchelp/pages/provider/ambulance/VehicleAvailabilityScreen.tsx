import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, Loader2, Truck } from "lucide-react";
import { useProviderAccess } from "../../../components/ProviderGate";

type Vehicle = {
  id: string;
  vehicle_code: string;
  registration_number: string | null;
  status: string | null;
};

export default function VehicleAvailabilityScreen() {
  const { providerId } = useProviderAccess();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    if (!providerId) return;
    const { data } = await supabase
      .from("ambulances" as any)
      .select("id, vehicle_code, registration_number, status")
      .eq("provider_id", providerId)
      .order("vehicle_code");
    setVehicles(((data as any[]) ?? []) as Vehicle[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!providerId) return;
    const ch = supabase
      .channel(`veh-avail-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ambulances", filter: `provider_id=eq.${providerId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const availableNow = vehicles.filter((v) => (v.status ?? "").toLowerCase() === "available").length;
  const onCall = vehicles.filter((v) => (v.status ?? "").toLowerCase() === "assigned").length;
  const outOfService = vehicles.filter((v) => (v.status ?? "").toLowerCase() === "out_of_service").length;

  const statusChip = (status: string | null) => {
    const s = (status ?? "").toLowerCase();
    if (s === "available") return { label: "Available Now", cls: "bg-success/10 text-success" };
    if (s === "assigned") return { label: "On a call", cls: "bg-warning/10 text-warning" };
    if (s === "out_of_service") return { label: "Out of service", cls: "bg-destructive/10 text-destructive" };
    return { label: status ?? "Unknown", cls: "bg-muted text-muted-foreground" };
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Fleet Operations</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-2">Vehicle Availability</h1>
        <p className="text-sm text-muted-foreground mt-2">Live status of every vehicle in your fleet.</p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading vehiclesâ€¦
        </div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <Truck className="mx-auto mb-2 h-6 w-6 opacity-50" />
          No vehicles in your fleet yet.
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => {
            const chip = statusChip(v.status);
            const active = selected === v.id;
            return (
              <div
                key={v.id}
                onClick={() => setSelected(v.id)}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  active ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{v.vehicle_code}</h3>
                    <p className="text-sm text-muted-foreground">{v.registration_number ?? "No registration"}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${chip.cls}`}>{chip.label}</span>
                </div>
                {active && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <Button className="w-full" disabled>Managed from Dispatcher Console</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Available Now</p>
          <p className="text-2xl font-bold mt-1">{availableNow}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Clock className="h-6 w-6 text-warning mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">On a call</p>
          <p className="text-2xl font-bold mt-1">{onCall}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Out of service</p>
          <p className="text-2xl font-bold mt-1">{outOfService}</p>
        </div>
      </div>
    </div>
  );
}

