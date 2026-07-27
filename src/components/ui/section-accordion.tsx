import * as React from "react";
import { cn } from "@/lib/utils";
import { isToday, differenceInCalendarDays } from "date-fns";

/**
 * Shared styling for the flat "table frame" accordions used across
 * My Practice, My Sessions, My Tasks, Documents, Personal / Medical Information.
 *
 * Closed row  → white background, light grey hover.
 * Open row    → green (primary) background with EVERY descendant forced white,
 *               so inner labels/badges that carry their own colour classes
 *               (text-foreground, text-primary, ...) cannot override it.
 */
export const SECTION_TRIGGER_CLASS = cn(
  "group px-4 py-3 hover:no-underline border-0 rounded-none bg-transparent hover:bg-muted",
  "data-[state=open]:!bg-primary data-[state=open]:hover:!bg-primary/90 data-[state=open]:!text-white",
  "[&[data-state=open]_*]:!text-white",
  "[&>svg]:group-data-[state=open]:!text-white",
);

/**
 * Variant that stays green with white text in BOTH open and collapsed states.
 * Used on My Sessions, My Tasks and Documents.
 */
export const SECTION_TRIGGER_ALWAYS_GREEN_CLASS = cn(
  "group px-4 py-3 hover:no-underline border-0 rounded-none",
  "!bg-primary hover:!bg-primary/90 !text-white",
  "[&_*]:!text-white",
  "[&>svg]:!text-white",
);

/** Padding for accordion content so sub-rows aren't flush against the header. */
export const SECTION_CONTENT_CLASS = "px-3 pt-3 pb-3 space-y-2";

/** Frame around a group of section accordion items. */
export const SECTION_FRAME_CLASS =
  "rounded-lg border bg-card overflow-hidden divide-y";

/** Item wrapper (no individual rounded border). */
export const SECTION_ITEM_CLASS = "border-0 rounded-none bg-card";


export function SectionCountPill({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold px-1.5 py-0 min-w-5 h-5 inline-flex items-center justify-center rounded-full",
        "bg-muted text-muted-foreground",
        "group-data-[state=open]:!bg-white group-data-[state=open]:!text-primary",
        className,
      )}
    >
      {count}
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
