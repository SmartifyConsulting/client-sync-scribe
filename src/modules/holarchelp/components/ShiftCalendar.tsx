import { Fragment, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, AlertTriangle, Plus, Phone } from "lucide-react";
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

export type StaffOption = { key: string; role: "doctor" | "nurse"; id: string; name: string; phone?: string | null };

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
  const phoneByKey = useMemo(() => new Map(staff.map((s) => [s.key, s.phone])), [staff]);

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
    <div className="space-y-4">
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
                        {cell.map((s) => {
                          const phone = phoneByKey.get(staffKeyOf(s));
                          return (
                            <Tooltip key={s.id}>
                              <TooltipTrigger asChild>
                                <button
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
                              </TooltipTrigger>
                              <TooltipContent className="flex items-center gap-1 text-xs">
                                <Phone className="h-3 w-3" /> {phone || "No phone on file"}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
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

      {/* Availability — moved below the calendar so the calendar itself can use the full width */}
      <AvailabilityRail staff={staff} shifts={shifts} weekShifts={weekShifts} today={today} phoneByKey={phoneByKey} />
    </div>
  );
}

type AvailabilityStatus = "free" | "scheduled" | "off_duty";

const STATUS_META: Record<AvailabilityStatus, { label: string; dot: string; badge: string }> = {
  free: { label: "Free", dot: "bg-green-500", badge: "bg-green-500/10 text-green-700 border-green-500/30" },
  scheduled: { label: "Scheduled", dot: "bg-blue-500", badge: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  off_duty: { label: "Off-duty", dot: "bg-amber-500", badge: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
};

function AvailabilityRail({
  staff, shifts, weekShifts, today, phoneByKey,
}: {
  staff: StaffOption[];
  shifts: StaffShift[];
  weekShifts: StaffShift[];
  today: Date;
  phoneByKey: Map<string, string | null | undefined>;
}) {
  const rows = staff.map((p) => {
    const hours = scheduledHours(weekShifts, p.key);
    const next = nextShiftFor(shifts, p.key);
    const busyToday = SHIFT_BANDS.some((b) => isBookedInSlot(weekShifts, p.key, today, b.value));
    const status: AvailabilityStatus = hours === 0 ? "free" : busyToday ? "off_duty" : "scheduled";
    return { p, hours, next, status };
  });
  const counts = rows.reduce(
    (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
    { free: 0, scheduled: 0, off_duty: 0 } as Record<AvailabilityStatus, number>,
  );

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider">Availability</span>
        <div className="flex items-center gap-2">
          {(Object.keys(STATUS_META) as AvailabilityStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s].dot)} />
              {counts[s]} {STATUS_META[s].label.toLowerCase()}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-2 p-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map(({ p, hours, next, status }) => (
          <div
            key={p.key}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/staff-key", p.key)}
            className={cn(
              "cursor-grab rounded-lg border-l-4 border bg-background px-2.5 py-2 text-xs active:cursor-grabbing hover:bg-muted/30",
              status === "free" ? "border-l-green-500" : status === "off_duty" ? "border-l-amber-500" : "border-l-blue-500",
            )}
          >
            <div className="flex items-center justify-between gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate font-semibold">{p.name}</span>
                </TooltipTrigger>
                <TooltipContent className="flex items-center gap-1 text-xs">
                  <Phone className="h-3 w-3" /> {phoneByKey.get(p.key) || "No phone on file"}
                </TooltipContent>
              </Tooltip>
              <Badge variant="outline" className="shrink-0 text-[10px] capitalize">{p.role}</Badge>
            </div>
            <div className="mt-1 flex items-center justify-between gap-1.5">
              <Badge className={cn("text-[10px]", STATUS_META[status].badge)}>{STATUS_META[status].label}</Badge>
              <span className="truncate text-right text-[11px] text-muted-foreground">
                {hours ? `${hours.toFixed(0)}h this wk` : "No shifts"}
              </span>
            </div>
            {next && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                Next {new Date(next.starts_at).toLocaleDateString(undefined, { weekday: "short" })} {timeShort(next.starts_at)}
              </p>
            )}
          </div>
        ))}
        {!staff.length && <p className="p-6 text-center text-xs text-muted-foreground sm:col-span-full">No staff linked to this hospital.</p>}
      </div>
    </div>
  );
}

export { staffKeyOf };
