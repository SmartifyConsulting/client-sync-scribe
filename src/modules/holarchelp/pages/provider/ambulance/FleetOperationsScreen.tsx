import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Truck, Users, Plus, X, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { toast } from "sonner";
import { toastError } from "@/lib/userMessage";
import { VehicleEditDialog, EditableVehicle } from "../../../components/VehicleEditDialog";

type DbVehicle = {
  id: string;
  vehicle_code: string;
  registration_number: string | null;
  status: string | null;
};

type DbMember = {
  id: string;
  user_id: string | null;
  invited_name: string | null;
  invited_email: string | null;
  role: string;
  status: string;
};

type DbAssignment = {
  id: string;
  ambulance_id: string;
  member_id: string;
  is_default_lead: boolean;
};

const CREW_ROLES = new Set(["paramedic", "emt", "driver", "nurse", "supervisor"]);

export default function FleetOperationsScreen() {
  const { providerId } = useProviderAccess();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditableVehicle | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["fleet-ops", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const [v, m, a] = await Promise.all([
        supabase.from("ambulances" as any)
          .select("id, vehicle_code, registration_number, status")
          .eq("provider_id", providerId)
          .order("vehicle_code"),
        supabase.from("holarchelp_ambulance_members" as any)
          .select("id, user_id, invited_name, invited_email, role, status")
          .eq("provider_id", providerId)
          .eq("status", "active"),
        supabase.from("ambulance_crew_assignments" as any)
          .select("id, ambulance_id, member_id, is_default_lead"),
      ]);
      if (v.error) throw v.error;
      if (m.error) throw m.error;
      if (a.error) throw a.error;
      return {
        vehicles: (v.data as any[] as DbVehicle[]) ?? [],
        members: (m.data as any[] as DbMember[]) ?? [],
        assignments: (a.data as any[] as DbAssignment[]) ?? [],
      };
    },
  });

  const vehicles = data?.vehicles ?? [];
  const allMembers = data?.members ?? [];
  const crewMembers = useMemo(
    () => allMembers.filter((m) => CREW_ROLES.has((m.role || "").toLowerCase())),
    [allMembers],
  );
  const assignments = data?.assignments ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? vehicles.filter((v) =>
          v.vehicle_code.toLowerCase().includes(q) ||
          (v.registration_number || "").toLowerCase().includes(q),
        )
      : vehicles;
  }, [vehicles, search]);

  const crewForVehicle = (id: string) =>
    assignments
      .filter((a) => a.ambulance_id === id)
      .map((a) => ({ assignment: a, member: crewMembers.find((m) => m.id === a.member_id) }))
      .filter((x) => x.member);

  const memberLabel = (m: DbMember) =>
    m.invited_name || m.invited_email || (m.user_id ?? "").slice(0, 8) || "Crew";

  const toggleAssign = async (vehicleId: string, memberId: string, on: boolean) => {
    try {
      if (on) {
        const { error } = await supabase.from("ambulance_crew_assignments" as any)
          .delete().eq("ambulance_id", vehicleId).eq("member_id", memberId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ambulance_crew_assignments" as any)
          .insert({ ambulance_id: vehicleId, member_id: memberId });
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["fleet-ops", providerId] });
    } catch (e) {
      toastError(e, "Could not update crew assignment");
    }
  };

  const statusBadge = (status: string | null) => {
    const s = (status || "").toLowerCase();
    if (s === "available") return "bg-success/10 text-success";
    if (s === "in-service" || s === "in_service") return "bg-warning/10 text-warning";
    if (s === "maintenance") return "bg-muted text-muted-foreground";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-extrabold mt-0.5 flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Fleet Admin
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vehicles, crew assignments and quick edits.
          </p>
        </div>
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search code or reg…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading vehicles…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <Truck className="mx-auto mb-2 h-6 w-6 opacity-50" />
          No vehicles in your fleet yet.
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {filtered.map((v) => {
            const crew = crewForVehicle(v.id);
            const assignedIds = new Set(crew.map((c) => c.member!.id));

            return (
              <AccordionItem
                key={v.id}
                value={v.id}
                className="rounded-xl border-2 border-primary/30 bg-card overflow-hidden"
              >
                <AccordionTrigger className="px-3 py-2 hover:no-underline">
                  <div className="flex flex-1 items-center justify-between gap-2 pr-2">
                    <div className="text-left min-w-0">
                      <p className="font-bold text-sm truncate">
                        {v.vehicle_code}
                        {v.registration_number ? <span className="text-muted-foreground font-normal"> · {v.registration_number}</span> : null}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">Ambulance</p>

                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
                        <Users className="h-3 w-3" /> {crew.length}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${statusBadge(v.status)}`}>
                        {v.status ?? "—"}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  {/* Assigned crew */}
                  <div className="rounded-lg bg-muted/40 p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Assigned crew
                      </p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline" className="h-6 text-sm px-2">
                            <Plus className="h-3 w-3 mr-1" /> Add crew
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2">
                          <p className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Tick members to assign
                          </p>
                          <div className="max-h-60 overflow-y-auto space-y-0.5">
                            {crewMembers.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic px-1 py-1">
                                No active crew yet. Add them under Admin → Users.
                              </p>
                            ) : crewMembers.map((m) => {
                              const on = assignedIds.has(m.id);
                              return (
                                <label key={m.id} className="flex items-center gap-2 text-sm rounded px-1.5 py-1 hover:bg-muted/50 cursor-pointer">
                                  <Checkbox checked={on} onCheckedChange={() => toggleAssign(v.id, m.id, on)} />
                                  <span className="truncate flex-1">
                                    {memberLabel(m)}
                                    <span className="text-muted-foreground text-xs ml-1 uppercase">· {m.role}</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {crew.length === 0 ? (
                      <p className="text-sm italic text-muted-foreground">
                        No crew assigned. Use Add crew above to assign paramedics, EMTs, drivers or nurses.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {crew.map(({ assignment, member }) => (
                          <span key={assignment.id} className="inline-flex items-center gap-1 rounded-full bg-background border px-2 py-0.5 text-sm">
                            <Users className="h-3 w-3 text-primary" />
                            <span className="font-semibold">{memberLabel(member!)}</span>
                            <span className="text-muted-foreground text-xs uppercase">· {member!.role}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleAssign(v.id, member!.id, true); }}
                              className="ml-0.5 opacity-60 hover:opacity-100"
                              aria-label="Remove crew member"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>




                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => navigate(`/provider/ambulance/fleet/vehicle/${encodeURIComponent(v.vehicle_code)}`)}
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() =>
                        setEditing({
                          id: v.id,
                          vehicle_code: v.vehicle_code,
                          registration_number: v.registration_number,
                          status: v.status,
                        })
                      }
                    >
                      Edit
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <VehicleEditDialog
        open={!!editing}
        onOpenChange={(v) => { if (!v) setEditing(null); }}
        vehicle={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["fleet-ops", providerId] })}
      />
    </div>
  );
}
