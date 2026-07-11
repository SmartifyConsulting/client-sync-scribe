import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Truck, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { toastError } from "@/lib/userMessage";

type Vehicle = { id: string; vehicle_code: string; registration_number: string | null };
type Member = {
  id: string; user_id: string | null; invited_name: string | null;
  invited_email: string | null; role: string; status: string; phone: string | null;
};
type Assignment = { id: string; ambulance_id: string; member_id: string; is_default_lead: boolean };

const CREW_ROLES = new Set(["paramedic", "emt", "driver", "nurse", "supervisor"]);

export default function CrewAssignmentsTab({ providerId }: { providerId: string | null }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["crew-assignments", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const [v, m, a] = await Promise.all([
        supabase.from("ambulances" as any)
          .select("id, vehicle_code, registration_number")
          .eq("provider_id", providerId)
          .order("vehicle_code"),
        supabase.from("holarchelp_ambulance_members" as any)
          .select("id, user_id, invited_name, invited_email, role, status, phone")
          .eq("provider_id", providerId)
          .eq("status", "active"),
        supabase.from("ambulance_crew_assignments" as any)
          .select("id, ambulance_id, member_id, is_default_lead"),
      ]);
      if (v.error) throw v.error;
      if (m.error) throw m.error;
      if (a.error) throw a.error;
      return {
        vehicles: (v.data as any[] as Vehicle[]) ?? [],
        members: (m.data as any[] as Member[]) ?? [],
        assignments: (a.data as any[] as Assignment[]) ?? [],
      };
    },
  });

  const vehicles = data?.vehicles ?? [];
  const members = (data?.members ?? []).filter((m) => CREW_ROLES.has((m.role || "").toLowerCase()));
  const assignments = data?.assignments ?? [];

  const byMember = useMemo(() => {
    const m = new Map<string, Assignment[]>();
    assignments.forEach((a) => {
      const list = m.get(a.member_id) ?? [];
      list.push(a);
      m.set(a.member_id, list);
    });
    return m;
  }, [assignments]);

  const toggleAssign = async (member: Member, vehicle: Vehicle, currentlyAssigned: boolean) => {
    try {
      if (currentlyAssigned) {
        const { error } = await supabase.from("ambulance_crew_assignments" as any)
          .delete()
          .eq("member_id", member.id).eq("ambulance_id", vehicle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ambulance_crew_assignments" as any)
          .insert({ member_id: member.id, ambulance_id: vehicle.id });
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["crew-assignments", providerId] });
    } catch (e) {
      toastError(e, "Could not update assignment");
    }
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground py-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading crew…</div>;
  }

  if (!members.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        <Users className="mx-auto mb-2 h-6 w-6 opacity-50" />
        No active crew members yet. Add Paramedic, EMT, Driver or Nurse users in the Users tab.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Assign each crew member to one or more vehicles. Their tick-list pre-fills automatically when a shift starts on that ambulance.
      </p>
      {members.map((m) => {
        const mine = byMember.get(m.id) ?? [];
        const mineIds = new Set(mine.map((a) => a.ambulance_id));
        const label = m.invited_name || m.invited_email || (m.user_id ?? "").slice(0, 8) || "Crew";
        return (
          <div key={m.id} className="rounded-xl border border-border bg-card p-3 flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[180px]">
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">{m.role}</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {mine.map((a) => {
                const v = vehicles.find((x) => x.id === a.ambulance_id);
                if (!v) return null;
                return (
                  <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-sm font-semibold">
                    <Truck className="h-3 w-3" /> {v.vehicle_code}
                  </span>
                );
              })}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  Assign vehicles
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <p className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tick vehicles
                </p>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {vehicles.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-1 py-1">No vehicles in fleet.</p>
                  ) : vehicles.map((v) => {
                    const on = mineIds.has(v.id);
                    return (
                      <label key={v.id} className="flex items-center gap-2 text-sm rounded px-1.5 py-1 hover:bg-muted/50 cursor-pointer">
                        <Checkbox checked={on} onCheckedChange={() => toggleAssign(m, v, on)} />
                        <Truck className="h-3.5 w-3.5 text-primary" />
                        <span className="truncate">
                          {v.vehicle_code}
                          {v.registration_number ? <span className="text-muted-foreground"> · {v.registration_number}</span> : null}
                        </span>
                        {on && <Check className="ml-auto h-3.5 w-3.5 text-success" />}
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        );
      })}
    </div>
  );
}
