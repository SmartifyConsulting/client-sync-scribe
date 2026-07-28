import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  SECTION_CONTENT_CLASS,
  SECTION_FRAME_CLASS,
  SECTION_ITEM_CLASS,
  SECTION_TRIGGER_ALWAYS_GREEN_CLASS,
  SectionCountPill,
} from "@/components/ui/section-accordion";
import { BiologEntry } from "./types";
import { useBiologEntries, useBiologSections } from "./useBiolog";

interface Props {
  ownerUserId?: string;
}

/** Groups check-ins by Today, then This month, then Month Year buckets. */
function bucketOf(dateStr: string) {
  const d = parseISO(dateStr);
  const now = new Date();
  const isToday = dateStr === now.toISOString().slice(0, 10);
  if (isToday) return "Today";
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
    return "This month";
  }
  return format(d, "MMMM yyyy");
}

export function BiologHistory({ ownerUserId }: Props) {
  const { data: entries = [] } = useBiologEntries(ownerUserId, 365);
  const { data: sections = [] } = useBiologSections(ownerUserId);
  const [search, setSearch] = useState("");

  const labelFor = (key: string) =>
    sections.find((s) => s.key === key)?.label ?? key;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const foods = (e.payload.meals ?? []).flatMap((m) => m.foods).join(" ");
      const ex = (e.payload.exercises ?? []).map((x) => x.name).join(" ");
      const meds = (e.payload.medications ?? []).map((m) => m.label).join(" ");
      return `${e.entry_date} ${e.note ?? ""} ${foods} ${ex} ${meds}`
        .toLowerCase()
        .includes(q);
    });
  }, [entries, search]);

  const groups = useMemo(() => {
    const map = new Map<string, BiologEntry[]>();
    for (const entry of filtered) {
      const key = bucketOf(entry.entry_date);
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search check-ins…"
        className="h-9 max-w-sm text-xs"
      />

      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground">No check-ins logged yet.</p>
      )}

      {groups.map(([label, groupEntries]) => (
        <Accordion key={label} type="single" collapsible className={SECTION_FRAME_CLASS}>
          <AccordionItem value={label} className={SECTION_ITEM_CLASS}>
            <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
              <div className="flex w-full items-center justify-between pr-2">
                <span className="text-sm font-semibold">{label}</span>
                <SectionCountPill count={groupEntries.length} />
              </div>
            </AccordionTrigger>
            <AccordionContent className={SECTION_CONTENT_CLASS}>
              {groupEntries.map((entry) => {
                const foods = (entry.payload.meals ?? []).flatMap((m) => m.foods);
                const exercises = entry.payload.exercises ?? [];
                const meds = (entry.payload.medications ?? []).filter((m) => m.taken);
                return (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-neutral-300 bg-card p-3 space-y-2"
                  >
                    <div className="text-xs font-bold text-foreground">
                      {format(parseISO(entry.entry_date), "EEE d MMM yyyy")}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(entry.payload.ratings ?? {}).map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="text-[10px]">
                          {labelFor(key)}: {value}
                        </Badge>
                      ))}
                    </div>
                    {foods.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-bold text-foreground">Food:</span>{" "}
                        {foods.join(", ")}
                      </p>
                    )}
                    {exercises.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-bold text-foreground">Exercise:</span>{" "}
                        {exercises
                          .map((e) => (e.duration ? `${e.name} (${e.duration})` : e.name))
                          .join(", ")}
                      </p>
                    )}
                    {meds.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-bold text-foreground">Medication:</span>{" "}
                        {meds.map((m) => m.label).join(", ")}
                      </p>
                    )}
                    {entry.note && (
                      <p className="text-[11px] italic text-muted-foreground">{entry.note}</p>
                    )}
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
  );
}
