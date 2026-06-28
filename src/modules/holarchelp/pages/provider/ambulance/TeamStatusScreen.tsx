import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProviderAccess } from "../../../components/ProviderGate";
import { InviteStaffDialog } from "../../../components/InviteStaffDialog";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, UserX, UserPlus, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

type Member = { id: string; user_id: string; role?: string | null; full_name?: string | null };
type Shift = { user_id: string; status: string; ambulance_id: string; vehicle_code?: string | null };

export default function TeamStatusScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { providerId } = useProviderAccess();
  const [members, setMembers] = useState<Member[]>([]);
  const [shiftsByUser, setShiftsByUser] = useState<Record<string, Shift>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (!providerId || !user) return;
    (async () => {
      const { data: ok } = await supabase.rpc("is_ambulance_admin" as any, {
        _provider_id: providerId, _user_id: user.id,
      } as any);
      setIsAdmin(!!ok);
    })();
  }, [providerId, user?.id]);

  const loadShifts = async (pid: string) => {
    const { data } = await supabase.from("paramedic_shifts" as any)
      .select("user_id, status, ambulance_id, ambulances(vehicle_code)")
      .eq("provider_id", pid)
      .is("ended_at", null);
    const map: Record<string, Shift> = {};
    ((data as any) ?? []).forEach((r: any) => {
      map[r.user_id] = { user_id: r.user_id, status: r.status, ambulance_id: r.ambulance_id, vehicle_code: r.ambulances?.vehicle_code ?? null };
    });
    setShiftsByUser(map);
  };

  useEffect(() => {
    if (!providerId) return;
    (async () => {
      const { data: m } = await supabase.from("holarchelp_ambulance_members" as any)
        .select("id, user_id, role").eq("provider_id", providerId);
      const list = ((m as any) ?? []) as Member[];
      const ids = list.map(x => x.user_id);
      let profMap: Record<string,string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles" as any).select("id, full_name").in("id", ids);
        ((profs as any) ?? []).forEach((p: any) => { profMap[p.id] = p.full_name; });
      }
      setMembers(list.map(x => ({ ...x, full_name: profMap[x.user_id] ?? t("common.crewMember") })));
    })();
    loadShifts(providerId);
    const ch = supabase.channel(`shifts-${providerId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "paramedic_shifts", filter: `provider_id=eq.${providerId}` },
        () => loadShifts(providerId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [providerId]);

  const onShift = Object.values(shiftsByUser).filter(s => s.status !== "off_shift").length;

  const shiftGroups = [
    { name: "🌅 Day Crew", time: "08:00 - 16:00", members: ["John Smith", "Mike Johnson"] },
    { name: "🌆 Evening Crew", time: "16:00 - 20:00", members: ["Sarah Miller", "James Kelly", "Rachel Chen"] },
  ];

  const roleColors: Record<string, string> = {
    paramedic: "text-success",
    driver: "text-warning",
    emt: "text-primary",
    default: "text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("provider.emergencyResponseDispatch")}</p>
        <h1 className="text-3xl font-extrabold mt-2">{t("team.title")}</h1>
        <p className="text-sm text-muted-foreground mt-2">Current shift: Friday 08:00 - 20:00</p>
      </header>

      {/* Shift Selector */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-lg border bg-card p-3">
          <p className="text-sm font-medium">Current Shift ▼</p>
        </div>
        <div className="flex-1 rounded-lg border bg-card p-3">
          <p className="text-sm font-medium">View Assignments ▼</p>
        </div>
      </div>

      {/* Shift Groups */}
      <div className="space-y-6">
        {shiftGroups.map((group) => (
          <div key={group.name}>
            {/* Shift Group Header */}
            <div className="rounded-lg border-2 bg-primary/10 border-primary/40 p-4 mb-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">{group.name} ({group.time})</h2>
                <span className="font-semibold text-muted-foreground">{group.members.length} members</span>
              </div>
            </div>

            {/* Crew Members in Group */}
            <div className="space-y-2 ml-4">
              {group.members.map((memberName, idx) => {
                const member = members.find((m) => m.full_name === memberName);
                const shift = member ? shiftsByUser[member.user_id] : null;
                const isOnDuty = !!shift && shift.status !== "off_shift";

                return (
                  <div key={idx} className="rounded-lg border bg-card p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{memberName}</p>
                      <p className={`text-sm ${member?.role ? roleColors[member.role.toLowerCase()] : roleColors.default}`}>
                        {member?.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : "Crew Member"}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded text-xs font-semibold ${
                        isOnDuty
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isOnDuty ? "ON DUTY" : "READY"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Team Summary */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-bold mb-4">Team Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-success/10 p-3">
            <p className="text-xs text-muted-foreground">Paramedics</p>
            <p className="text-2xl font-bold text-success mt-1">3</p>
          </div>
          <div className="rounded-lg bg-warning/10 p-3">
            <p className="text-xs text-muted-foreground">Drivers</p>
            <p className="text-2xl font-bold text-warning mt-1">2</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <p className="text-xs text-muted-foreground">EMTs</p>
            <p className="text-2xl font-bold text-primary mt-1">1</p>
          </div>
          <div className="rounded-lg bg-accent/40 p-3">
            <p className="text-xs text-muted-foreground">On Duty</p>
            <p className="text-2xl font-bold text-accent-foreground mt-1">{onShift}/{members.length}</p>
          </div>
        </div>
      </div>

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
