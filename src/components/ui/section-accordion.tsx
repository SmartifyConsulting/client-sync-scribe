import * as React from "react";
import { cn } from "@/lib/utils";
import { isToday, differenceInCalendarDays } from "date-fns";

/**
 * Shared styling for the flat "table frame" accordions used across
 * My Practice, My Sessions, My Tasks, Documents, Personal / Medical Information.
 *
 * Closed row  → white background, green hover with white text.
 * Open row    → green (primary) background with EVERY descendant forced white,
 *               so inner labels/badges that carry their own colour classes
 *               (text-foreground, text-primary, ...) cannot override it.
 */
export const SECTION_TRIGGER_CLASS = cn(
  "group px-4 py-2 hover:no-underline border-0 rounded-none bg-transparent hover:!bg-primary hover:!text-white",
  "data-[state=open]:!bg-primary data-[state=open]:hover:!bg-primary/90 data-[state=open]:!text-white",
  // Everything inside turns white on hover / when open — except the count pill,
  // which keeps a black number on a white pill so it stays readable.
  "[&[data-state=open]_*:not(.section-count-pill)]:!text-white",
  "[&:hover_*:not(.section-count-pill)]:!text-white",
  "[&:hover_.section-count-pill]:!bg-white [&:hover_.section-count-pill]:!text-black",
  "[&[data-state=open]_.section-count-pill]:!bg-white [&[data-state=open]_.section-count-pill]:!text-black",
  "[&>svg]:group-data-[state=open]:!text-white",
  "[&>svg]:group-hover:!text-white",
);

/**
 * Variant that stays green with white text in BOTH open and collapsed states.
 * Used on My Sessions, My Tasks and Documents.
 */
export const SECTION_TRIGGER_ALWAYS_GREEN_CLASS = cn(
  "group px-4 py-2 hover:no-underline border-0 rounded-none",
  "!bg-primary hover:!bg-primary/90 !text-white",
  "[&_*:not(.section-count-pill)]:!text-white",
  "[&>svg]:!text-white",
  "[&_.section-count-pill]:!bg-white [&_.section-count-pill]:!text-black",
);


/** Padding for accordion content so sub-rows aren't flush against the header. */
export const SECTION_CONTENT_CLASS = "px-4 pt-3 pb-3 space-y-2";

/** Frame around a group of section accordion items — thin white line between items. */
export const SECTION_FRAME_CLASS =
  "rounded-xl border border-neutral-400 bg-white overflow-hidden divide-y divide-white";

/** Item wrapper (no individual rounded border). */
export const SECTION_ITEM_CLASS = "border-0 rounded-none bg-card";

/**
 * Rounded variant used on the Dashboard cards (To-Do List, My Round Tables),
 * where group headings sit as soft pills rather than flat table rows.
 */
export const SECTION_ITEM_ROUNDED_CLASS = "border-0 rounded-xl overflow-hidden bg-card";
export const SECTION_TRIGGER_ROUNDED_CLASS = "!rounded-xl";


export function SectionCountPill({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "section-count-pill text-[10px] font-semibold px-1.5 py-0 min-w-5 h-5 inline-flex items-center justify-center rounded-full",
        // The number is always black; the pill turns white on hover and when the
        // (green) header is expanded, so the count never disappears.
        "bg-muted !text-black",
        "group-hover:!bg-white group-hover:!text-black",
        "group-data-[state=open]:!bg-white group-data-[state=open]:!text-black",
        className,
      )}
    >
      {Number.isFinite(count) ? count : 0}
    </span>
  );
}

export type DateBucketKey = "today" | "week" | "month" | "older";

export const DATE_BUCKETS: { key: DateBucketKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "older", label: "Older" },
];

export function dateBucketFor(value: string | Date | null | undefined): DateBucketKey {
  const d = value ? new Date(value) : new Date();
  if (isNaN(d.getTime())) return "older";
  if (isToday(d)) return "today";
  const days = Math.abs(differenceInCalendarDays(new Date(), d));
  if (days <= 7) return "week";
  if (days <= 30) return "month";
  return "older";
}
