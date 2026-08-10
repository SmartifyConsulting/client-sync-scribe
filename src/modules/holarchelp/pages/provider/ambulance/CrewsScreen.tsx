import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Input } from "@/components/ui/input";
import { Loader2, Users, Search } from "lucide-react";
import {
  CrewCard, StatusBadge, Timeline, crewStateTone, emsAgo, type EmsTimelineItem,
} from "../../../components/ems";

type Member = {
  id: string;
  user_id: string | null;
  invited_name: string | null;
  invited_email: string | null;
  phone: string | null;
  role: string;
  status: string;
  shift_pattern: string | null;
  created_at: string;
};

type Shift = {
  id: string;
  user_id: string;
  ambulance_id: string | null;
  status: string;
  started_at: string;
  current_incident_id: string | null;
};

const STATES = ["Dispatched", "On shift", "Available", "Hospital", "Offline"] as const;

export default function CrewsScreen() {
  const { providerId } = useProviderAccess();
  const [members, setMembers] = useState<Member[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<EmsTimelineItem[]>([]);

  const load = async () => {
    if (!providerId) return;
    const [{ data: mem }, { data: sh }, { data: vehs }] = await Promise.all([
      supabase.from("holarchelp_ambulance_members" as any)
        .select("id, user_id, invited_name, invited_email, phone, role, status, shift_pattern, created_at")
        .eq("provider_id", providerId),
      supabase.from("paramedic_shifts" as any)
        .select("id, user_id, ambulance_id, status, started_at, current_incident_id")
        .eq("provider_id", providerId)
        .is("ended_at", null),
      supabase.from("ambulances" as any).select("id, vehicle_code").eq("provider_id", providerId),
    ]);
    const memberRows = (((mem as any) ?? []) as Member[]);
    setMembers(memberRows);
    setShifts((((sh as any) ?? []) as Shift[]));
    setVehicles(Object.fromEntries(((vehs as any[]) ?? []).map((v) => [v.id, v.vehicle_code])));
    const ids = memberRows.map((m) => m.user_id).filter(Boolean) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setProfiles(Object.fromEntries(((profs as any[]) ?? []).map((p) => [p.id, p.full_name])));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!providerId) return;
    const ch = supabase.channel(`crews-page-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "paramedic_shifts", filter: `provider_id=eq.${providerId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const shiftByUser = useMemo(
    () => new Map(shifts.map((s) => [s.user_id, s])),
    [shifts],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .map((m) => {
        const shift = m.user_id ? shiftByUser.get(m.user_id) : undefined;
        const state = !shift
          ? "Offline"
          : shift.status === "busy"
            ? (shift.current_incident_id ? "Dispatched" : "Hospital")
            : "Available";
        const name = (m.user_id && profiles[m.user_id]) || m.invited_name || m.invited_email || "Crew member";
        return {
          member: m,
          shift,
          state,
          name,
          vehicle_code: shift?.ambulance_id ? vehicles[shift.ambulance_id] ?? null : null,
        };
      })
      .filter((r) => (q ? r.name.toLowerCase().includes(q) || (r.member.role ?? "").toLowerCase().includes(q) : true));
  }, [members, shiftByUser, profiles, vehicles, search]);

  const selected = rows.find((r) => r.member.id === selectedId) ?? null;

  useEffect(() => {
    const uid = selected?.member.user_id;
    if (!uid) { setHistory([]); return; }
    let cancelled = false;
    supabase.from("paramedic_shifts" as any)
      .select("id, started_at, ended_at, status")
      .eq("user_id", uid)
      .order("started_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (cancelled) return;
        setHistory(((data as any[]) ?? []).map((s) => ({
          id: s.id,
          label: s.ended_at ? "Shift completed" : "Shift open",
          detail: s.status,
          at: s.started_at,
        })));
      });
    return () => { cancelled = true; };
  }, [selected?.member.id]);

  const counts = STATES.map((s) => ({ state: s, n: rows.filter((r) => r.state === s).length }));

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold">
            <Users className="h-5 w-5 text-primary" /> Crews
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">Who is on shift, and where are they?</p>
        </div>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {counts.map((c) => (
          <StatusBadge key={c.state} tone={crewStateTone(c.state)}>
            {c.state} · {c.n}
          </StatusBadge>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1fr_2.2fr]">
          <section className="rounded-xl border bg-card p-2">
            <h2 className="px-1 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Roster · {rows.length}
            </h2>
            {rows.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No crew members yet.</p>
            ) : (
              <div className="max-h-[70vh] space-y-2 overflow-y-auto">
                {STATES.map((state) => {
                  const group = rows.filter((r) => r.state === state);
                  if (!group.length) return null;
                  return (
                    <div key={state} className="space-y-1.5">
                      <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {state} · {group.length}
                      </p>
                      {group.map((r) => (
                        <CrewCard
                          key={r.member.id}
                          crew={{
                            id: r.member.id,
                            name: r.name,
                            role: r.member.role,
                            state: r.state,
                            vehicle_code: r.vehicle_code,
                          }}
                          selected={selectedId === r.member.id}
                          onClick={() => setSelectedId(r.member.id)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-card p-3">
            {!selected ? (
              <p className="py-16 text-center text-xs text-muted-foreground">Select a crew member to view their profile.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-extrabold">{selected.name}</h2>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{selected.member.role}</p>
                  </div>
                  <StatusBadge tone={crewStateTone(selected.state)}>{selected.state}</StatusBadge>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 md:grid-cols-3">
                  <Field label="Email" value={selected.member.invited_email ?? "—"} />
                  <Field label="Phone" value={selected.member.phone ?? "—"} />
                  <Field label="Membership" value={selected.member.status} />
                  <Field label="Shift pattern" value={selected.member.shift_pattern ?? "Not set"} />
                  <Field label="Vehicle" value={selected.vehicle_code ?? "Unassigned"} />
                  <Field
                    label="Current shift"
                    value={selected.shift ? `Open ${emsAgo(selected.shift.started_at)} ago` : "Off duty"}
                  />
                  <Field label="Joined" value={new Date(selected.member.created_at).toLocaleDateString()} />
                </dl>

                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent shifts</p>
                  <Timeline items={history} empty="No shifts recorded." />
                </div>
              </div>
            )}
          </section>
        </div>
      )}
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
