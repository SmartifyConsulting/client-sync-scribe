import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Truck, Search } from "lucide-react";
import {
  VehicleCard, Timeline, StatusBadge, vehicleStatusTone, emsAgo,
  type EmsTimelineItem,
} from "../../../components/ems";
import { VehicleEditDialog, EditableVehicle } from "../../../components/VehicleEditDialog";

type Vehicle = {
  id: string;
  vehicle_code: string;
  registration_number: string | null;
  status: string | null;
  notes: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  created_at?: string;
};

export default function VehiclesScreen() {
  const { providerId } = useProviderAccess();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [crewByVehicle, setCrewByVehicle] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditableVehicle | null>(null);
  const [missions, setMissions] = useState<EmsTimelineItem[]>([]);

  const load = async () => {
    if (!providerId) return;
    const [{ data: vehs }, { data: members }, { data: assigns }] = await Promise.all([
      supabase.from("ambulances" as any)
        .select("id, vehicle_code, registration_number, status, notes, current_latitude, current_longitude, created_at")
        .eq("provider_id", providerId)
        .order("vehicle_code"),
      supabase.from("holarchelp_ambulance_members" as any)
        .select("id, invited_name, invited_email, role, status")
        .eq("provider_id", providerId)
        .eq("status", "active"),
      supabase.from("ambulance_crew_assignments" as any).select("ambulance_id, member_id"),
    ]);
    const memberById = new Map(((members as any[]) ?? []).map((m) => [m.id, m]));
    const map: Record<string, string[]> = {};
    ((assigns as any[]) ?? []).forEach((a) => {
      const m: any = memberById.get(a.member_id);
      if (!m) return;
      map[a.ambulance_id] = [...(map[a.ambulance_id] ?? []), m.invited_name || m.invited_email || m.role];
    });
    setCrewByVehicle(map);
    setVehicles((((vehs as any) ?? []) as Vehicle[]));
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!providerId) return;
    const ch = supabase.channel(`vehicles-page-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ambulances", filter: `provider_id=eq.${providerId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const selected = vehicles.find((v) => v.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) { setMissions([]); return; }
    let cancelled = false;
    supabase.from("holarchelp_incidents" as any)
      .select("id, incident_number, status, created_at, severity")
      .eq("assigned_ambulance_id", selected.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (cancelled) return;
        setMissions(((data as any[]) ?? []).map((i) => ({
          id: i.id,
          label: i.incident_number ?? `INC-${String(i.id).slice(0, 8)}`,
          detail: `${i.severity ?? "high"} · ${String(i.status).replace(/_/g, " ")}`,
          at: i.created_at,
        })));
      });
    return () => { cancelled = true; };
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? vehicles.filter((v) =>
          v.vehicle_code.toLowerCase().includes(q) || (v.registration_number ?? "").toLowerCase().includes(q))
      : vehicles;
  }, [vehicles, search]);

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold">
            <Truck className="h-5 w-5 text-primary" /> Vehicles
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">What is the status of this vehicle?</p>
        </div>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search code or reg…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1fr_2.2fr]">
          <section className="rounded-xl border bg-card p-2">
            <h2 className="px-1 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Fleet · {filtered.length}
            </h2>
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No vehicles in your fleet yet.</p>
            ) : (
              <div className="max-h-[70vh] space-y-1.5 overflow-y-auto">
                {filtered.map((v) => (
                  <VehicleCard
                    key={v.id}
                    vehicle={{
                      id: v.id,
                      vehicle_code: v.vehicle_code,
                      registration_number: v.registration_number,
                      status: v.status,
                      crew_name: crewByVehicle[v.id]?.[0] ?? null,
                      crew_count: crewByVehicle[v.id]?.length ?? 0,
                    }}
                    selected={selectedId === v.id}
                    onClick={() => setSelectedId(v.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-card p-3">
            {!selected ? (
              <p className="py-16 text-center text-xs text-muted-foreground">Select a vehicle to view its full record.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-extrabold">{selected.vehicle_code}</h2>
                    <p className="text-xs text-muted-foreground">{selected.registration_number ?? "No registration on file"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={vehicleStatusTone(selected.status)}>{selected.status ?? "unknown"}</StatusBadge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => setEditing({
                        id: selected.id,
                        vehicle_code: selected.vehicle_code,
                        registration_number: selected.registration_number,
                        status: selected.status,
                      })}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => navigate(`/provider/ambulance/fleet/vehicle/${selected.id}`)}
                    >
                      Open profile
                    </Button>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 md:grid-cols-3">
                  <Field label="Registration" value={selected.registration_number ?? "—"} />
                  <Field label="Call sign" value={selected.vehicle_code} />
                  <Field label="Type" value="Emergency ambulance" />
                  <Field label="Crew" value={(crewByVehicle[selected.id] ?? []).join(", ") || "Unassigned"} />
                  <Field label="Equipment" value="Standard ALS kit" />
                  <Field label="Maintenance" value={selected.status === "maintenance" ? "In workshop" : "Up to date"} />
                  <Field label="Insurance" value="Active" />
                  <Field
                    label="GPS"
                    value={
                      selected.current_latitude != null && selected.current_longitude != null
                        ? `${selected.current_latitude.toFixed(4)}, ${selected.current_longitude.toFixed(4)}`
                        : "No fix"
                    }
                  />
                  <Field
                    label="Current assignment"
                    value={(selected.status ?? "").toLowerCase() === "assigned" ? "On a call" : "None"}
                  />
                  {selected.created_at && <Field label="In service since" value={`${emsAgo(selected.created_at)} ago`} />}
                </dl>

                {selected.notes && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</p>
                    <p className="mt-1 rounded-lg border bg-muted/30 p-2 text-xs italic">{selected.notes}</p>
                  </div>
                )}

                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Mission history</p>
                  <Timeline items={missions} empty="No missions recorded for this vehicle." />
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      <VehicleEditDialog
        vehicle={editing}
        open={!!editing}
        onOpenChange={(v) => { if (!v) setEditing(null); }}
        onSaved={() => { setEditing(null); load(); }}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-xs">{value}</dd>
    </div>
  );
}
