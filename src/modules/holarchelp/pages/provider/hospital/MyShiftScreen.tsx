import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { clockShift, useMyShifts } from "../../../hooks/useHospitalShifts";
import { useHospitalInpatients, type InpatientRecord } from "../../../hooks/useHospitalInpatients";
import { formatTimeRange, shiftIsLive } from "../../../lib/hospitalWards";
import { SHIFT_BANDS, startOfWeek, weekDays, weekLabel, sameDay, shiftsForSlot, timeShort } from "../../../lib/shiftScheduling";
import { LogActivityDialog } from "../../../components/InpatientDialogs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { NotebookPen, ChevronLeft, ChevronRight } from "lucide-react";

/** Nurse-facing display labels for the three shift bands, distinct from the
 *  admin scheduler's "Day/Night/On-Call" wording per the nurse calendar spec. */
const NURSE_BAND_LABELS: Record<string, string> = { day: "Morning", night: "Night", on_call: "Standby" };

function NurseShiftCalendar({ shifts, onClock }: { shifts: ReturnType<typeof useMyShifts>["shifts"]; onClock: (id: string, action: "in" | "out") => void }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const days = weekDays(weekStart);
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-400 bg-white">
      <div className="flex items-center justify-between border-b bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white">
        <span>My Shifts Calendar</span>
        <div className="flex items-center gap-2 normal-case tracking-normal">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white hover:bg-white/20 hover:text-white" onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[11px] font-semibold">{weekLabel(weekStart)}</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white hover:bg-white/20 hover:text-white" onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; })}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="divide-y">
        {days.map((day) => (
          <div key={day.toISOString()} className={`grid grid-cols-4 gap-2 px-3 py-2 text-xs ${sameDay(day, today) ? "bg-primary/5" : ""}`}>
            <div className="flex flex-col justify-center font-semibold">
              {day.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
            </div>
            {SHIFT_BANDS.map((band) => {
              const slot = shiftsForSlot(shifts, day, band.value)[0];
              const live = slot ? shiftIsLive(slot) : false;
              return (
                <div key={band.value} className="flex flex-col items-start gap-1 rounded-lg border border-border p-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{NURSE_BAND_LABELS[band.value] ?? band.label}</span>
                  {slot ? (
                    <>
                      <span className="text-[11px] text-muted-foreground">{timeShort(slot.starts_at)}–{timeShort(slot.ends_at)}</span>
                      {live ? (
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => onClock(slot.id, "out")}>Clock out</Button>
                      ) : slot.clocked_out_at ? (
                        <Badge variant="outline" className="text-[10px]">Completed</Badge>
                      ) : (
                        <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => onClock(slot.id, "in")}>Clock in</Button>
                      )}
                    </>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MyShiftScreen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { shifts, current, reload } = useMyShifts(user?.id);
  const [nurseIds, setNurseIds] = useState<string[]>([]);
  const [logFor, setLogFor] = useState<InpatientRecord | null>(null);
  const isNurse = nurseIds.length > 0;

  const hospitalId = current?.hospital_id ?? shifts[0]?.hospital_id ?? null;
  const { inpatients, reload: reloadPatients } = useHospitalInpatients(hospitalId);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("hospital_nurses").select("id").eq("linked_user_id", user.id)
      .then(({ data }) => setNurseIds(((data ?? []) as { id: string }[]).map((n) => n.id)));
  }, [user?.id]);

  /** The shift the patient list is scoped to: the live one, else the next upcoming. */
  const activeShift = useMemo(() => {
    if (current) return current;
    const now = Date.now();
    return shifts.find((s) => new Date(s.ends_at).getTime() >= now) ?? null;
  }, [current, shifts]);

  /** Patients this staff member is personally responsible for on that shift. */
  const myPatients = useMemo(
    () =>
      inpatients
        .filter((p) => !isNurse || !activeShift?.ward_id || p.ward_id === activeShift.ward_id)
        .map((p) => {
          const nurseRows = p.nurses.filter((n) => n.nurse_id && nurseIds.includes(n.nurse_id));
          const isDoctor = p.doctors.some((d) => d.doctor_id === user?.id);
          if (!nurseRows.length && !isDoctor) return null;
          return { patient: p, tasks: nurseRows.flatMap((n) => n.care_tasks ?? []), isDoctor };
        })
        .filter(Boolean) as { patient: InpatientRecord; tasks: string[]; isDoctor: boolean }[],
    [inpatients, nurseIds, user?.id, isNurse, activeShift?.ward_id],
  );

  const clock = async (id: string, action: "in" | "out") => {
    try { await clockShift(id, action); reload(); }
    catch (e: any) { toast({ title: "Clock failed", description: e?.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold text-foreground">My shift</h1>
      </header>

      {isNurse ? (
        <NurseShiftCalendar shifts={shifts} onClock={clock} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-400 bg-white">
          <div className="border-b bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white">Upcoming & current shifts</div>
          <ul className="divide-y">
            {shifts.map((s) => {
              const live = shiftIsLive(s);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                  <span className="font-semibold">{new Date(s.starts_at).toLocaleDateString()}</span>
                  <span className="text-muted-foreground">{formatTimeRange(s.starts_at, s.ends_at)}</span>
                  <Badge variant="outline" className="capitalize">{s.shift_type.replace(/_/g, "-")}</Badge>
                  {live && <Badge className="bg-success text-success-foreground">Clocked in</Badge>}
                  <div className="ml-auto">
                    {live ? (
                      <Button variant="outline" size="sm" onClick={() => clock(s.id, "out")}>Clock out</Button>
                    ) : s.clocked_out_at ? (
                      <span className="text-muted-foreground">Completed</span>
                    ) : (
                      <Button size="sm" onClick={() => clock(s.id, "in")}>Clock in</Button>
                    )}
                  </div>
                </li>
              );
            })}
            {!shifts.length && <li className="p-8 text-center text-xs text-muted-foreground">No shifts assigned to you.</li>}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-400 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white">
          <span>My patients{activeShift ? " this shift" : ""}</span>
          {activeShift && (
            <span className="normal-case tracking-normal text-[11px] font-semibold text-white/85">
              {new Date(activeShift.starts_at).toLocaleDateString()} · {formatTimeRange(activeShift.starts_at, activeShift.ends_at)}
            </span>
          )}
        </div>
        <ul className="divide-y">
          {myPatients.map(({ patient, tasks, isDoctor }) => (
            <li key={patient.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
              <div>
                {patient.patient_id ? (
                  <Link to={`/provider/hospital/patient/${patient.patient_id}`} className="font-semibold text-foreground underline-offset-2 hover:underline">
                    {patient.patient_name}
                  </Link>
                ) : (
                  <p className="font-semibold">{patient.patient_name}</p>
                )}
                <p className="text-muted-foreground">Bed {patient.bed_number || "—"}{tasks.length ? ` · ${tasks.join(", ")}` : ""}</p>
              </div>
              {isDoctor && <Badge variant="secondary">Attending doctor</Badge>}
              {patient.doctors[0] && !isDoctor && (
                <Badge variant="outline" className="text-[10px]">Dr {patient.doctors[0].doctor_name.replace(/^Dr\.?\s*/i, "")}</Badge>
              )}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setLogFor(patient)}>
                <NotebookPen className="mr-1 h-3.5 w-3.5" /> Log activity
              </Button>
            </li>
          ))}
          {!myPatients.length && <li className="p-8 text-center text-xs text-muted-foreground">No patients assigned to you.</li>}
        </ul>
      </div>

      <LogActivityDialog
        admission={logFor}
        staffName={(user?.user_metadata?.full_name as string) || user?.email || "Staff"}
        staffRole={nurseIds.length ? "nurse" : "doctor"}
        onOpenChange={(v) => !v && setLogFor(null)}
        onSaved={reloadPatients}
      />
    </div>
  );
}

