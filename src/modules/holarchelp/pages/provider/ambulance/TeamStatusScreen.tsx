import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Users, UserCheck, UserX } from "lucide-react";

type Member = { id: string; user_id: string; role?: string | null; full_name?: string | null };

const SHIFT_KEY = "holarc_amb_team_shifts";

const readShifts = (): Record<string, boolean> => {
  try { return JSON.parse(localStorage.getItem(SHIFT_KEY) ?? "{}"); } catch { return {}; }
};

export default function TeamStatusScreen() {
  const { providerId } = useProviderAccess();
  const [members, setMembers] = useState<Member[]>([]);
  const [shifts, setShifts] = useState<Record<string, boolean>>(readShifts);

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
  }, [providerId]);

  const toggle = (uid: string) => {
    setShifts((s) => {
      const next = { ...s, [uid]: !s[uid] };
      try { localStorage.setItem(SHIFT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const onShift = members.filter(m => shifts[m.user_id]).length;

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Emergency Response Dispatch</p>
          <h1 className="text-2xl font-extrabold">Team Status</h1>
        </div>
        <span className="rounded-full border bg-card px-2.5 py-1 text-xs font-semibold">
          <Users className="mr-1 inline h-3.5 w-3.5 text-primary" /> {onShift} / {members.length} on shift
        </span>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <ul className="divide-y">
          {members.map((m) => {
            const active = !!shifts[m.user_id];
            return (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40">
                {active
                  ? <UserCheck className="h-4 w-4 text-success" />
                  : <UserX className="h-4 w-4 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{m.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">{m.role ?? "Paramedic"}</p>
                </div>
                <button
                  onClick={() => toggle(m.user_id)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${active ? "border-success/40 bg-success/10 text-success" : "border-border bg-background text-muted-foreground"}`}
                >
                  {active ? "On shift" : "Off shift"}
                </button>
              </li>
            );
          })}
          {!members.length && <li className="p-8 text-center text-xs text-muted-foreground">No crew members on roster yet.</li>}
        </ul>
      </div>
    </div>
  );
}
