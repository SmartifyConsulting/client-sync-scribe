import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProviderAccess } from "../../../components/ProviderGate";
import { InviteStaffDialog } from "../../../components/InviteStaffDialog";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, UserX, UserPlus, Truck } from "lucide-react";

type Member = { id: string; user_id: string; role?: string | null; full_name?: string | null };
type Shift = { user_id: string; status: string; ambulance_id: string; vehicle_code?: string | null };

export default function TeamStatusScreen() {
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
      setMembers(list.map(x => ({ ...x, full_name: profMap[x.user_id] ?? "Crew member" })));
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

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Emergency Response Dispatch</p>
          <h1 className="text-2xl font-extrabold">Team Status</h1>
          <p className="text-xs text-muted-foreground">Live shift + ambulance status. Synced with active incidents.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border bg-card px-2.5 py-1 text-xs font-semibold">
            <Users className="mr-1 inline h-3.5 w-3.5 text-primary" /> {onShift} / {members.length} on shift
          </span>
          {isAdmin && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-1 h-4 w-4" /> Invite
            </Button>
          )}
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <ul className="divide-y">
          {members.map((m) => {
            const s = shiftsByUser[m.user_id];
            const active = !!s && s.status !== "off_shift";
            const busy = s?.status === "busy";
            return (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40">
                {active
                  ? <UserCheck className={`h-4 w-4 ${busy ? "text-destructive" : "text-success"}`} />
                  : <UserX className="h-4 w-4 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{m.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {m.role ?? "Paramedic"}
                    {s?.vehicle_code && <> · <Truck className="inline h-3 w-3" /> {s.vehicle_code}</>}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    busy ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : active ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {busy ? "Busy" : active ? "Available" : "Off shift"}
                </span>
              </li>
            );
          })}
          {!members.length && <li className="p-8 text-center text-xs text-muted-foreground">No crew members on roster yet.</li>}
        </ul>
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
