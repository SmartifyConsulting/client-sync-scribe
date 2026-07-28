import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useHospitalWards } from "../../../hooks/useHospitalWards";
import { clockShift, useHospitalShifts, type StaffShift } from "../../../hooks/useHospitalShifts";
import { SHIFT_TYPES, formatTimeRange, shiftIsLive } from "../../../lib/hospitalWards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, Plus } from "lucide-react";

type StaffOption = { key: string; role: "doctor" | "nurse"; id: string; name: string };

const localInput = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function ShiftsScreen() {
  const { toast } = useToast();
  const { providerId } = useProviderAccess();
  const { wards } = useHospitalWards(providerId);
  const { shifts, onShiftNow, reload } = useHospitalShifts(providerId);

  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [open, setOpen] = useState(false);
  const [staffKey, setStaffKey] = useState("");
  const [wardId, setWardId] = useState("");
  const [shiftType, setShiftType] = useState("day");
  const [startsAt, setStartsAt] = useState(localInput(new Date()));
  const [endsAt, setEndsAt] = useState(localInput(new Date(Date.now() + 8 * 36e5)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!providerId) return;
    (async () => {
      const [{ data: nurses }, { data: affils }] = await Promise.all([
        supabase.from("hospital_nurses").select("id, full_name").eq("hospital_id", providerId),
        supabase.from("doctor_hospital_affiliations").select("doctor_id").eq("hospital_id", providerId).not("doctor_id", "is", null),
      ]);
      const doctorIds = ((affils ?? []) as { doctor_id: string }[]).map((a) => a.doctor_id);
      let doctors: { id: string; full_name: string | null }[] = [];
      if (doctorIds.length) {
        const { data } = await supabase.from("profiles").select("id, full_name").in("id", doctorIds);
        doctors = (data ?? []) as { id: string; full_name: string | null }[];
      }
      setStaff([
        ...doctors.map((d) => ({ key: `doctor:${d.id}`, role: "doctor" as const, id: d.id, name: d.full_name ?? "Doctor" })),
        ...((nurses ?? []) as { id: string; full_name: string }[]).map((n) => ({
          key: `nurse:${n.id}`, role: "nurse" as const, id: n.id, name: n.full_name,
        })),
      ]);
    })();
  }, [providerId]);

  const grouped = useMemo(() => {
    const map = new Map<string, StaffShift[]>();
    for (const s of shifts) {
      const day = new Date(s.starts_at).toDateString();
      map.set(day, [...(map.get(day) ?? []), s]);
    }
    return [...map.entries()];
  }, [shifts]);

  const save = async () => {
    const picked = staff.find((s) => s.key === staffKey);
    if (!providerId || !picked) return;
    setSaving(true);
    const { error } = await supabase.from("hospital_staff_shifts").insert({
      hospital_id: providerId,
      ward_id: wardId || null,
      staff_role: picked.role,
      doctor_id: picked.role === "doctor" ? picked.id : null,
      nurse_id: picked.role === "nurse" ? picked.id : null,
      staff_name: picked.name,
      shift_type: shiftType,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      status: "scheduled",
    });
    setSaving(false);
    if (error) { toast({ title: "Could not create shift", description: error.message, variant: "destructive" }); return; }
    setOpen(false); setStaffKey(""); setWardId("");
    reload();
  };

  const clock = async (shift: StaffShift, action: "in" | "out") => {
    try { await clockShift(shift.id, action); reload(); }
    catch (e: any) { toast({ title: "Clock failed", description: e?.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hospital operations</p>
          <h1 className="text-2xl font-extrabold">Shift schedule</h1>
          <p className="text-xs text-muted-foreground">{onShiftNow.length} staff on shift right now</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} disabled={!providerId}><Plus className="mr-1 h-4 w-4" /> Add shift</Button>
      </header>

      <div className="space-y-4">
        {grouped.map(([day, rows]) => (
          <div key={day} className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-bold uppercase tracking-wider">
              <CalendarClock className="h-3.5 w-3.5" /> {day}
            </div>
            <ul className="divide-y">
              {rows.map((s) => {
                const live = shiftIsLive(s);
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                    <span className="font-semibold">{s.staff_name}</span>
                    <span className="capitalize text-muted-foreground">{s.staff_role}</span>
                    <Badge variant="outline" className="capitalize">{s.shift_type.replace(/_/g, "-")}</Badge>
                    <span className="text-muted-foreground">{formatTimeRange(s.starts_at, s.ends_at)}</span>
                    <span className="text-muted-foreground">{wards.find((w) => w.id === s.ward_id)?.name ?? "No ward"}</span>
                    {live && <Badge className="bg-success text-success-foreground">On shift</Badge>}
                    <div className="ml-auto">
                      {live ? (
                        <Button variant="outline" size="sm" onClick={() => clock(s, "out")}>Clock out</Button>
                      ) : s.clocked_out_at ? (
                        <span className="text-muted-foreground">Completed</span>
                      ) : (
                        <Button size="sm" onClick={() => clock(s, "in")}>Clock in</Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {!grouped.length && (
          <p className="rounded-2xl border bg-card p-8 text-center text-xs text-muted-foreground">No shifts scheduled yet.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add shift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Staff member</Label>
              <Select value={staffKey} onValueChange={setStaffKey}>
                <SelectTrigger><SelectValue placeholder="Select doctor or nurse" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.name} · {s.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Shift type</Label>
                <Select value={shiftType} onValueChange={setShiftType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHIFT_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Ward</Label>
                <Select value={wardId} onValueChange={setWardId}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {wards.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Starts</Label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Ends</Label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !staffKey}>Save shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
