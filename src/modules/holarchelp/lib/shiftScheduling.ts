/**
 * Scheduling helpers for the hospital shift calendar: week maths, shift bands,
 * staff availability and the 8-hour rest-period rule.
 */
import type { StaffShift } from "../hooks/useHospitalShifts";

export const REST_HOURS = 8;

export type ShiftBand = {
  value: string;
  label: string;
  /** Local start hour and duration in hours for a newly created shift. */
  startHour: number;
  hours: number;
};

export const SHIFT_BANDS: ShiftBand[] = [
  { value: "day", label: "Day", startHour: 7, hours: 12 },
  { value: "night", label: "Night", startHour: 19, hours: 12 },
  { value: "on_call", label: "On-Call", startHour: 8, hours: 12 },
];

export const bandOf = (value: string) =>
  SHIFT_BANDS.find((b) => b.value === value) ?? SHIFT_BANDS[0];

export const startOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

/** Monday-based start of the week containing `d`. */
export function startOfWeek(d: Date) {
  const c = startOfDay(d);
  const dow = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - dow);
  return c;
}

export function weekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const dayLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

export const weekLabel = (weekStart: Date) => {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${fmt(weekStart)} – ${fmt(end)}`;
};

/** Local datetime-input value (yyyy-MM-ddTHH:mm) for a date. */
export const toLocalInput = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/** Default start/end for a band on a given calendar day. */
export function slotRange(day: Date, bandValue: string) {
  const band = bandOf(bandValue);
  const start = startOfDay(day);
  start.setHours(band.startHour, 0, 0, 0);
  const end = new Date(start.getTime() + band.hours * 36e5);
  return { start, end };
}

export const shiftsForSlot = (shifts: StaffShift[], day: Date, bandValue: string) =>
  shifts.filter((s) => s.shift_type === bandValue && sameDay(new Date(s.starts_at), day));

export const staffKeyOf = (s: StaffShift) =>
  s.doctor_id ? `doctor:${s.doctor_id}` : s.nurse_id ? `nurse:${s.nurse_id}` : `name:${s.staff_name}`;

/** Total scheduled hours for a staff member across the given shifts. */
export function scheduledHours(shifts: StaffShift[], key: string) {
  return shifts
    .filter((s) => staffKeyOf(s) === key)
    .reduce((sum, s) => sum + (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 36e5, 0);
}

export function nextShiftFor(shifts: StaffShift[], key: string) {
  const now = Date.now();
  return (
    shifts
      .filter((s) => staffKeyOf(s) === key && new Date(s.ends_at).getTime() >= now)
      .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))[0] ?? null
  );
}

export const isBookedInSlot = (shifts: StaffShift[], key: string, day: Date, bandValue: string) =>
  shiftsForSlot(shifts, day, bandValue).some((s) => staffKeyOf(s) === key);

export type RestCheck = {
  /** True when the staff member gets less than REST_HOURS between shifts. */
  breach: boolean;
  gapHours: number;
  previousEndsAt: string | null;
};

/**
 * Compares a proposed start against the staff member's closest surrounding
 * shifts and reports a breach when the rest gap is under 8 hours.
 */
export function checkRestPeriod(shifts: StaffShift[], key: string, proposedStart: Date, proposedEnd: Date): RestCheck {
  const mine = shifts.filter((s) => staffKeyOf(s) === key);
  let gapHours = Infinity;
  let previousEndsAt: string | null = null;

  for (const s of mine) {
    const start = new Date(s.starts_at).getTime();
    const end = new Date(s.ends_at).getTime();
    // Overlap counts as a zero-rest breach.
    if (start < proposedEnd.getTime() && end > proposedStart.getTime()) {
      return { breach: true, gapHours: 0, previousEndsAt: s.ends_at };
    }
    const gap =
      end <= proposedStart.getTime()
        ? (proposedStart.getTime() - end) / 36e5
        : (start - proposedEnd.getTime()) / 36e5;
    if (gap < gapHours) {
      gapHours = gap;
      previousEndsAt = end <= proposedStart.getTime() ? s.ends_at : s.starts_at;
    }
  }

  return { breach: gapHours < REST_HOURS, gapHours, previousEndsAt };
}

export const timeShort = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
