import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProviderAccess } from "../../../components/ProviderGate";
import { InviteStaffDialog } from "../../../components/InviteStaffDialog";
import { Users } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

type Member = {
  id: string;
  user_id: string;
  role?: string | null;
  full_name?: string | null;
};
type Shift = {
  user_id: string;
  status: string;
  ambulance_id: string;
  vehicle_code?: string | null;
};

const roleColors: Record<string, string> = {
  paramedic: "text-success",
  driver: "text-warning",
  emt: "text-primary",
  default: "text-muted-foreground",
};

export default function TeamStatusScreen() {
  const { user } = useAuth();
  const { providerId } = useProviderAccess();
  const [members, setMembers] = useState<Member[]>([]);
  const [shiftsByUser, setShiftsByUser] = useState<Record<string, Shift>>({});
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadShifts = async (pid: string) => {
    const { data } = await supabase
      .from("paramedic_shifts" as any)
      .select("user_id, status, ambulance_id, ambulances(vehicle_code)")
      .eq("provider_id", pid)
      .is("ended_at", null);
    const map: Record<string, Shift> = {};
    ((data as any) ?? []).forEach((r: any) => {
      map[r.user_id] = {
        user_id: r.user_id,
        status: r.status,
        ambulance_id: r.ambulance_id,
        vehicle_code: r.ambulances?.vehicle_code ?? null,
      };
    });
    setShiftsByUser(map);
  };

  useEffect(() => {
    if (!providerId) return;
    (async () => {
      const { data: m } = await supabase
        .from("holarchelp_ambulance_members" as any)
        .select("id, user_id, role")
        .eq("provider_id", providerId);
      const list = ((m as any) ?? []) as Member[];
      const ids = list.map((x) => x.user_id).filter(Boolean);
      const profMap: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles" as any)
          .select("id, full_name")
          .in("id", ids);
        ((profs as any) ?? []).forEach((p: any) => {
          profMap[p.id] = p.full_name;
        });
      }
      setMembers(
        list.map((x) => ({
          ...x,
          full_name: profMap[x.user_id] ?? "Crew Member",
        })),
      );
    })();
    loadShifts(providerId);
    const ch = supabase
      .channel(`shifts-${providerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "paramedic_shifts",
          filter: `provider_id=eq.${providerId}`,
        },
        () => loadShifts(providerId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [providerId]);

  const onShift = Object.values(shiftsByUser).filter(
    (s) => s.status !== "off_shift",
  ).length;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Emergency Response
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Shift Teams</h1>
        <p className="text-sm text-muted-foreground">
          {members.length} crew Â· {onShift} on duty
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        <AccordionItem
          value="shift-teams"
          className="rounded-xl border border-primary bg-card shadow-sm"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" /> Shift Teams (
              {members.length})
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">
                No crew members yet.
              </p>
            ) : (
              members.map((m) => {
                const shift = shiftsByUser[m.user_id];
                const isOnDuty = !!shift && shift.status !== "off_shift";
                const roleClass = m.role
                  ? roleColors[m.role.toLowerCase()] ?? roleColors.default
                  : roleColors.default;
                return (
                  <div
                    key={m.id}
                    className="rounded-lg border border-border bg-card px-3 py-2 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {m.full_name}
                      </p>
                      <p className={`text-sm ${roleClass}`}>
                        {m.role
                          ? m.role.charAt(0).toUpperCase() + m.role.slice(1)
                          : "Crew Member"}
                        {shift?.vehicle_code
                          ? ` Â· ${shift.vehicle_code}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-sm font-semibold uppercase ${
                        isOnDuty
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isOnDuty ? "On Duty" : "Ready"}
                    </span>
                  </div>
                );
              })
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {providerId && (
        <InviteStaffDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          orgType="ambulance"
          orgId={providerId}
        />
      )}
    </div>
  );
}

