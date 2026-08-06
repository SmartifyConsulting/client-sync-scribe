import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, AlertTriangle, Plus } from "lucide-react";
import type { StaffShift } from "../hooks/useHospitalShifts";
import {
  SHIFT_BANDS,
  dayLabel,
  isBookedInSlot,
  nextShiftFor,
  sameDay,
  scheduledHours,
  shiftsForSlot,
  staffKeyOf,
  timeShort,
  weekDays,
  weekLabel,
} from "../lib/shiftScheduling";

export type StaffOption = { key: string; role: "doctor" | "nurse"; id: string; name: string };

interface ShiftCalendarProps {
  weekStart: Date;
  shifts: StaffShift[];
  staff: StaffOption[];
  onWeekChange: (d: Date) => void;
  onSlotClick: (day: Date, band: string) => void;
  onAssign: (staffKey: string, day: Date, band: string) => void;
  onChipClick: (shift: StaffShift) => void;
}

/** Weekly shift grid (7 days x shift bands) plus a staff availability rail. */
export function ShiftCalendar({
  weekStart,
  shifts,
  staff,
  onWeekChange,
  onSlotClick,
  onAssign,
  onChipClick,
}: ShiftCalendarProps) {
  const days = weekDays(weekStart);
  const today = new Date();

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    onWeekChange(d);
  };

  const weekShifts = shifts.filter((s) => {
    const t = new Date(s.starts_at);
    return t >= weekStart && t < new Date(weekStart.getTime() + 7 * 864e5);
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => shiftWeek(-1)} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => shiftWeek(1)} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-xs font-bold uppercase tracking-wider">{weekLabel(weekStart)}</span>
          <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => onWeekChange(new Date())}>
            This week
          </Button>
        </div>

        <div className="overflow-x-auto">
          {/* A single shared grid spans the header row and every shift-band row, so
              the 7 day columns share exactly the same track sizes everywhere —
              splitting each row into its own grid let 1fr tracks drift by
              sub-pixels row to row, which showed up as misaligned day columns. */}
          <div className="grid min-w-[880px] grid-cols-[92px_repeat(7,1fr)]">
            <div className="border-b bg-muted/20" />
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className={cn(
                  "border-b bg-muted/20 px-2 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide",
                  sameDay(d, today) && "text-primary",
                )}
              >
                {dayLabel(d)}
              </div>
            ))}

            {SHIFT_BANDS.map((band, bandIndex) => {
              const isLastBand = bandIndex === SHIFT_BANDS.length - 1;
              return (
                <Fragment key={band.value}>
                  <div
                    className={cn(
                      "flex items-center border-r bg-muted/20 px-2 py-2 text-[11px] font-bold uppercase tracking-wide",
                      !isLastBand && "border-b",
                    )}
                  >
                    {band.label}
                  </div>
                  {days.map((d, dayIndex) => {
                    const cell = shiftsForSlot(weekShifts, d, band.value);
                    const isLastDay = dayIndex === days.length - 1;
                    return (
                      <div
                        key={`${band.value}-${d.toISOString()}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const key = e.dataTransfer.getData("text/staff-key");
                          if (key) onAssign(key, d, band.value);
                        }}
                        onClick={() => onSlotClick(d, band.value)}
                        className={cn(
                          "group min-h-[72px] cursor-pointer space-y-1 border-r p-1.5 hover:bg-muted/30",
                          isLastDay && "border-r-0",
                          !isLastBand && "border-b",
                        )}
                      >
                        {cell.map((s) => (
                          <button
                            key={s.id}
                            onClick={(e) => { e.stopPropagation(); onChipClick(s); }}
                            className={cn(
                              "flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[11px] font-semibold",
                              s.staff_role === "doctor"
                                ? "bg-primary/10 text-primary"
                                : "bg-[hsl(214_88%_54%/0.12)] text-[hsl(214_88%_40%)]",
                            )}
                          >
                            {!!s.clocked_in_at && !s.clocked_out_at && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                            )}
                            <span className="truncate">{s.staff_name}</span>
                            {s.rest_ack_at && <AlertTriangle className="ml-auto h-3 w-3 shrink-0 text-amber-500" />}
                          </button>
                        ))}
                        {!cell.length && (
                          <span className="hidden items-center gap-1 text-[11px] text-muted-foreground group-hover:flex">
                            <Plus className="h-3 w-3" /> Assign
                          </span>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Availability rail */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b bg-muted/40 px-3 py-2 text-xs font-bold uppercase tracking-wider">Availability</div>
        <ul className="divide-y">
          {staff.map((p) => {
            const hours = scheduledHours(weekShifts, p.key);
            const next = nextShiftFor(shifts, p.key);
            const busyToday = SHIFT_BANDS.some((b) => isBookedInSlot(weekShifts, p.key, today, b.value));
            return (
              <li
                key={p.key}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/staff-key", p.key)}
                className="cursor-grab px-3 py-2 text-xs active:cursor-grabbing hover:bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p.name}</span>
                  <Badge variant="outline" className="capitalize">{p.role}</Badge>
                  {hours === 0 ? (
                    <Badge className="ml-auto bg-success text-success-foreground">Free</Badge>
                  ) : busyToday ? (
                    <Badge variant="secondary" className="ml-auto">Off-duty</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-auto">Scheduled</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-muted-foreground">
                  {hours ? `${hours.toFixed(0)}h this week` : "No shifts this week"}
                  {next ? ` · next ${new Date(next.starts_at).toLocaleDateString(undefined, { weekday: "short" })} ${timeShort(next.starts_at)}` : ""}
                </p>
              </li>
            );
          })}
          {!staff.length && <li className="p-6 text-center text-xs text-muted-foreground">No staff linked to this hospital.</li>}
        </ul>
      </div>
    </div>
  );
}

export { staffKeyOf };
