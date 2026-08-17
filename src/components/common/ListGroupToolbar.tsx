import * as React from "react";
import { Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  SECTION_TRIGGER_ALWAYS_GREEN_CLASS,
  SECTION_CONTENT_CLASS,
  SECTION_FRAME_CLASS,
  SECTION_ITEM_CLASS,
  SECTION_ITEM_ROUNDED_CLASS,
  SECTION_TRIGGER_ROUNDED_CLASS,
  SectionCountPill,
} from "@/components/ui/section-accordion";
import { isToday, isThisMonth, format } from "date-fns";

export type GroupByKey = "date" | "patient" | "hospital";

/** Date buckets: Today → current month (e.g. "July 2026") → older months → years. */
export function dateGroupLabel(value: string | Date | null | undefined): string {
  const d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime())) return "Undated";
  if (isToday(d)) return "Today";
  if (isThisMonth(d)) return format(d, "MMMM yyyy");
  if (d.getFullYear() === new Date().getFullYear()) return format(d, "MMMM yyyy");
  return String(d.getFullYear());
}

/** Sort key so groups appear newest-first with Today pinned to the top. */
function groupSortValue(items: { date?: string | Date | null }[]) {
  let max = -Infinity;
  for (const i of items) {
    const t = i.date ? new Date(i.date).getTime() : NaN;
    if (!isNaN(t) && t > max) max = t;
  }
  return max;
}

export interface GroupableItem<T> {
  item: T;
  date?: string | Date | null;
  patient?: string | null;
  hospital?: string | null;
  /** Free text used by the search box. */
  search?: string;
}

interface Props<T> {
  /** Persisted key for the group-by preference, e.g. "sessions". */
  storageKey: string;
  items: GroupableItem<T>[];
  renderItem: (item: T) => React.ReactNode;
  /** Show the "Hospital" grouping option (hospital-role users). */
  allowHospital?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
  /** Extra controls rendered to the right of the toolbar. */
  actions?: React.ReactNode;
  /** Whether the first group is expanded by default (default true). */
  defaultOpenFirst?: boolean;
  /** Hide the search box, group-by select, and actions row entirely (default false). */
  hideControls?: boolean;
  /** Drop the shared frame and space groups apart (matches the dashboard To-Do list). */
  frameless?: boolean;
  /** Optional icon rendered before each group heading label. */
  headerIcon?: React.ComponentType<{ className?: string }>;
  /**
   * When grouping by date, further split each date group into a collapsed
   * light-grey sub-accordion per patient (see HolarchStyling skill §6).
   * Ignored when groupBy is "patient" or "hospital" — there's nothing left
   * to nest by in that case.
   */
  subGroupByPatient?: boolean;
}

export function ListGroupToolbar<T>({
  storageKey,
  items,
  renderItem,
  allowHospital = false,
  searchPlaceholder = "Search...",
  emptyLabel = "Nothing to show",
  actions,
  defaultOpenFirst = true,
  hideControls = false,
  frameless = false,
  headerIcon: HeaderIcon,
  subGroupByPatient = false,
}: Props<T>) {

  const prefKey = `listGroupBy:${storageKey}`;
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [groupBy, setGroupBy] = React.useState<GroupByKey>(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(prefKey) : null;
    return (saved as GroupByKey) || "date";
  });

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim().toLowerCase()), 200);
    return () => clearTimeout(id);
  }, [query]);

  React.useEffect(() => {
    window.localStorage.setItem(prefKey, groupBy);
  }, [groupBy, prefKey]);

  const filtered = React.useMemo(() => {
    if (!debounced) return items;
    return items.filter((i) =>
      [i.search, i.patient, i.hospital].filter(Boolean).join(" ").toLowerCase().includes(debounced),
    );
  }, [items, debounced]);

  const groups = React.useMemo(() => {
    const map = new Map<string, GroupableItem<T>[]>();
    for (const entry of filtered) {
      let key: string;
      if (groupBy === "patient") key = entry.patient?.trim() || "Unassigned";
      else if (groupBy === "hospital") key = entry.hospital?.trim() || "No hospital";
      else key = dateGroupLabel(entry.date);
      const list = map.get(key) || [];
      list.push(entry);
      map.set(key, list);
    }
    const arr = Array.from(map.entries());
    if (groupBy === "date") {
      arr.sort((a, b) => {
        if (a[0] === "Today") return -1;
        if (b[0] === "Today") return 1;
        return groupSortValue(b[1]) - groupSortValue(a[1]);
      });
    } else {
      arr.sort((a, b) => a[0].localeCompare(b[0]));
    }
    return arr;
  }, [filtered, groupBy]);

  const patientSubGroups = React.useCallback((entries: GroupableItem<T>[]) => {
    const map = new Map<string, GroupableItem<T>[]>();
    for (const entry of entries) {
      const key = entry.patient?.trim() || "Unassigned";
      const list = map.get(key) || [];
      list.push(entry);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] === "Unassigned" ? 1 : b[0] === "Unassigned" ? -1 : a[0].localeCompare(b[0])))
      .map(([key, items]) => ({ key, items }));
  }, []);

  return (
    <div className="space-y-3">
      {!hideControls && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-8 text-xs"
            />
          </div>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByKey)}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Group by date</SelectItem>
              <SelectItem value="patient">Group by patient</SelectItem>
              {allowHospital && <SelectItem value="hospital">Group by hospital</SelectItem>}
            </SelectContent>
          </Select>
          {actions}
        </div>
      )}

      {groups.length === 0 ? (
        <p className="px-1 py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={defaultOpenFirst ? [groups[0][0]] : []}
          className={frameless ? "space-y-2" : SECTION_FRAME_CLASS}
        >
          {groups.map(([label, entries]) => (
            <AccordionItem key={label} value={label} className={frameless ? SECTION_ITEM_ROUNDED_CLASS : SECTION_ITEM_CLASS}>
              <AccordionTrigger
                className={cn(SECTION_TRIGGER_ALWAYS_GREEN_CLASS, frameless && cn(SECTION_TRIGGER_ROUNDED_CLASS, "px-3 py-2"))}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {HeaderIcon && <HeaderIcon className="h-3.5 w-3.5 text-primary shrink-0" />}
                  <span className="text-sm font-semibold truncate text-left">{label}</span>
                  <SectionCountPill count={entries.length} className="ml-auto mr-1" />
                </div>
              </AccordionTrigger>

              <AccordionContent className={SECTION_CONTENT_CLASS}>
                {subGroupByPatient && groupBy === "date" ? (
                  <Accordion type="multiple" className="space-y-2 py-1">
                    {patientSubGroups(entries).map((sub) => (
                      <AccordionItem
                        key={sub.key}
                        value={`${label}-${sub.key}`}
                        className="border-0 !border-b-0 rounded-lg bg-muted/30 overflow-hidden"
                      >
                        <AccordionTrigger className="px-4 py-1.5 border-0 rounded-none hover:no-underline hover:bg-muted/50">
                          <div className="flex items-center justify-between w-full pr-2">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              {sub.key}
                            </span>
                            <SectionCountPill count={sub.items.length} />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-2">
                          <div className="space-y-4">
                            {sub.items.map((e, idx) => (
                              <React.Fragment key={idx}>{renderItem(e.item)}</React.Fragment>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="space-y-4 py-1">
                    {entries.map((e, idx) => (
                      <React.Fragment key={idx}>{renderItem(e.item)}</React.Fragment>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
