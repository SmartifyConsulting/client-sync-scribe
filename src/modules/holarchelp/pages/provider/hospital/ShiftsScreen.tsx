import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useHospitalWards } from "../../../hooks/useHospitalWards";
import { clockShift, useHospitalShifts, type StaffShift } from "../../../hooks/useHospitalShifts";
import { formatTimeRange, shiftIsLive } from "../../../lib/hospitalWards";
import {
  REST_HOURS,
  SHIFT_BANDS,
  checkRestPeriod,
  slotRange,
  startOfWeek,
  timeShort,
  toLocalInput,
  type RestCheck,
} from "../../../lib/shiftScheduling";
import { ShiftCalendar, type StaffOption } from "../../../components/ShiftCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Plus } from "lucide-react";

type PendingShift = {
  staff: StaffOption;
  shiftType: string;
  startsAt: string;
  endsAt: string;
  wardId: string;
};

export default function ShiftsScreen() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { providerId } = useProviderAccess();
  const { wards } = useHospitalWards(providerId);
  const { shifts, onShiftNow, reload } = useHospitalShifts(providerId);

  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const [open, setOpen] = useState(false);
  const [staffKey, setStaffKey] = useState("");
  const [wardId, setWardId] = useState("");
  const [shiftType, setShiftType] = useState("day");
  const [startsAt, setStartsAt] = useState(toLocalInput(new Date()));
  const [endsAt, setEndsAt] = useState(toLocalInput(new Date(Date.now() + 8 * 36e5)));
  const [saving, setSaving] = useState(false);

  const [pending, setPending] = useState<PendingShift | null>(null);
  const [restCheck, setRestCheck] = useState<RestCheck | null>(null);
  const [ack, setAck] = useState(false);
  const [ackNote, setAckNote] = useState("");
  const [detail, setDetail] = useState<StaffShift | null>(null);

  useEffect(() => {
    if (!providerId) return;
    (async () => {
      const [{ data: nurses }, { data: affils }] = await Promise.all([
        supabase.from("hospital_nurses").select("id, full_name, mobile_number").eq("hospital_id", providerId),
        supabase.from("doctor_hospital_affiliations").select("doctor_id").eq("hospital_id", providerId).not("doctor_id", "is", null),
      ]);
      const doctorIds = ((affils ?? []) as { doctor_id: string }[]).map((a) => a.doctor_id);
      let doctors: { id: string; full_name: string | null; mobile_number: string | null }[] = [];
      if (doctorIds.length) {
        const { data } = await supabase.from("profiles").select("id, full_name, mobile_number").in("id", doctorIds);
        doctors = (data ?? []) as { id: string; full_name: string | null; mobile_number: string | null }[];
      }
      setStaff([
        ...doctors.map((d) => ({ key: `doctor:${d.id}`, role: "doctor" as const, id: d.id, name: d.full_name ?? "Doctor", phone: d.mobile_number })),
        ...((nurses ?? []) as { id: string; full_name: string; mobile_number: string | null }[]).map((n) => ({
          key: `nurse:${n.id}`, role: "nurse" as const, id: n.id, name: n.full_name, phone: n.mobile_number,
        })),
      ]);
    })();
  }, [providerId]);

  const staffByKey = useMemo(() => new Map(staff.map((s) => [s.key, s])), [staff]);

  /** Writes the shift, optionally carrying the scheduler's rest acknowledgement. */
  const persist = async (p: PendingShift, acknowledged: boolean, note: string) => {
    if (!providerId) return;
    setSaving(true);
    const { error } = await supabase.from("hospital_staff_shifts").insert({
      hospital_id: providerId,
      ward_id: p.wardId || null,
      staff_role: p.staff.role,
      doctor_id: p.staff.role === "doctor" ? p.staff.id : null,
      nurse_id: p.staff.role === "nurse" ? p.staff.id : null,
      staff_name: p.staff.name,
      shift_type: p.shiftType,
      starts_at: new Date(p.startsAt).toISOString(),
      ends_at: new Date(p.endsAt).toISOString(),
      status: "scheduled",
      ...(acknowledged
        ? { rest_ack_by: user?.id ?? null, rest_ack_at: new Date().toISOString(), rest_ack_note: note || null }
        : {}),
    } as any);
    setSaving(false);
    if (error) { toast({ title: "Could not create shift", description: error.message, variant: "destructive" }); return; }
    setOpen(false); setPending(null); setRestCheck(null); setAck(false); setAckNote("");
    setStaffKey(""); setWardId("");
    reload();
  };

  /** Runs the 8-hour rest rule first; only saves directly when it passes. */
  const submit = (p: PendingShift) => {
    const check = checkRestPeriod(shifts, p.staff.key, new Date(p.startsAt), new Date(p.endsAt));
    if (check.breach) {
      setPending(p);
      setRestCheck(check);
      setAck(false);
      setAckNote("");
      return;
    }
    persist(p, false, "");
  };

  const saveFromDialog = () => {
    const picked = staffByKey.get(staffKey);
    if (!picked) return;
    submit({ staff: picked, shiftType, startsAt, endsAt, wardId });
  };

  const openSlot = (day: Date, band: string) => {
    const { start, end } = slotRange(day, band);
    setShiftType(band);
    setStartsAt(toLocalInput(start));
    setEndsAt(toLocalInput(end));
    setStaffKey("");
    setOpen(true);
  };

  const assignFromRail = (key: string, day: Date, band: string) => {
    const picked = staffByKey.get(key);
    if (!picked) return;
    const { start, end } = slotRange(day, band);
    submit({ staff: picked, shiftType: band, startsAt: toLocalInput(start), endsAt: toLocalInput(end), wardId: "" });
  };

  const clock = async (shift: StaffShift, action: "in" | "out") => {
    try { await clockShift(shift.id, action); setDetail(null); reload(); }
    catch (e: any) { toast({ title: "Clock failed", description: e?.message, variant: "destructive" }); }
  };

  const removeShift = async (shift: StaffShift) => {
    const { error } = await supabase.from("hospital_staff_shifts").delete().eq("id", shift.id);
    if (error) { toast({ title: "Could not remove shift", description: error.message, variant: "destructive" }); return; }
    setDetail(null);
    reload();
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resource Planning</h1>
          <p className="text-xs text-muted-foreground">{onShiftNow.length} staff on shift right now</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} disabled={!providerId}><Plus className="mr-1 h-4 w-4" /> Add shift</Button>
      </header>

      <ShiftCalendar
        weekStart={weekStart}
        shifts={shifts}
        staff={staff}
        onWeekChange={(d) => setWeekStart(startOfWeek(d))}
        onSlotClick={openSlot}
        onAssign={assignFromRail}
        onChipClick={setDetail}
      />

      {/* Assign dialog */}
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
                    {SHIFT_BANDS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
            <Button onClick={saveFromDialog} disabled={saving || !staffKey}>Save shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rest-period warning */}
      <Dialog open={!!pending && !!restCheck} onOpenChange={(o) => { if (!o) { setPending(null); setRestCheck(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" /> Less than {REST_HOURS} hours rest
            </DialogTitle>
          </DialogHeader>
          {pending && restCheck && (
            <div className="space-y-3 text-xs">
              <p>
                <span className="font-bold">{pending.staff.name}</span> has only{" "}
                <span className="font-bold">{restCheck.gapHours.toFixed(1)}h</span> rest
                {restCheck.previousEndsAt ? ` since their previous shift (ends ${timeShort(restCheck.previousEndsAt)})` : ""}.
                Assigning this shift creates a double shift or short turnaround.
              </p>
              <label className="flex items-start gap-2">
                <Checkbox checked={ack} onCheckedChange={(v) => setAck(!!v)} />
                <span>I acknowledge and accept this short turnaround.</span>
              </label>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Note (optional)</Label>
                <Textarea value={ackNote} onChange={(e) => setAckNote(e.target.value)} rows={2} placeholder="Reason for the double shift" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPending(null); setRestCheck(null); }}>Cancel</Button>
            <Button
              disabled={!ack || saving}
              onClick={() => pending && persist(pending, true, ackNote)}
            >
              Assign anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift detail */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detail?.staff_name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-xs">
              <p className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">{detail.shift_type.replace(/_/g, "-")}</Badge>
                <span>{new Date(detail.starts_at).toLocaleDateString()}</span>
                <span className="text-muted-foreground">{formatTimeRange(detail.starts_at, detail.ends_at)}</span>
                <span className="text-muted-foreground">{wards.find((w) => w.id === detail.ward_id)?.name ?? "No ward"}</span>
                {shiftIsLive(detail) && <Badge className="bg-success text-success-foreground">On shift</Badge>}
              </p>
              {detail.rest_ack_at && (
                <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2 text-amber-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Short-turnaround acknowledged{detail.rest_ack_note ? ` — ${detail.rest_ack_note}` : ""}.</span>
                </p>
              )}
              <div className="flex gap-2 pt-1">
                {shiftIsLive(detail) ? (
                  <Button variant="outline" size="sm" onClick={() => clock(detail, "out")}>Clock out</Button>
                ) : detail.clocked_out_at ? (
                  <span className="text-muted-foreground">Completed</span>
                ) : (
                  <Button size="sm" onClick={() => clock(detail, "in")}>Clock in</Button>
                )}
                <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => removeShift(detail)}>
                  Remove shift
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
