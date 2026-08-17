import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface CarePerson {
  id: string;
  name: string;
  relation: string;
  pronoun: "Her" | "His" | "Their";
  /** false when something is outstanding for this person */
  medicationConfirmed: boolean;
  lastUpdated: string;
  metrics: { label: string; value: string }[];
  lines: string[];
  story: { period: string; items: string[] }[];
  concern?: string;
}

/**
 * Demo circle. These are the same entries the dashboard has always shown —
 * the detail view simply reads the richer fields off the same records rather
 * than inventing anything new.
 */
export const CARE_PEOPLE: CarePerson[] = [
  {
    id: "mum",
    name: "Mum",
    relation: "Mother",
    pronoun: "Her",
    medicationConfirmed: true,
    lastUpdated: "8:42 AM",
    metrics: [
      { label: "Mood", value: "Good" },
      { label: "Sleep", value: "7h 18m" },
      { label: "Activity", value: "3,842 steps" },
      { label: "Medication", value: "Taken" },
    ],
    lines: ["Medication taken", "Last check-in: 08:42"],
    story: [
      { period: "Today", items: ["Medication taken", "Breakfast logged", "18-minute walk", "Mood: Good"] },
      { period: "Yesterday", items: ["Appointment completed", "Medication taken", "Sleep 7h 45m"] },
      { period: "This week", items: ["Medication adherence: 100%", "Activity: +8%", "Sleep: Stable"] },
    ],
  },
  {
    id: "dad",
    name: "Dad",
    relation: "Father",
    pronoun: "His",
    medicationConfirmed: true,
    lastUpdated: "7:51 AM",
    metrics: [
      { label: "Mood", value: "Steady" },
      { label: "Sleep", value: "6h 54m" },
      { label: "Activity", value: "2,410 steps" },
      { label: "Medication", value: "Taken" },
    ],
    lines: ["Medication taken", "Last activity: 07:51"],
    story: [
      { period: "Today", items: ["Medication taken", "Morning walk logged"] },
      { period: "Yesterday", items: ["Medication taken", "Sleep 6h 40m"] },
      { period: "This week", items: ["Medication adherence: 96%", "Activity: Stable", "Sleep: Slightly shorter"] },
    ],
  },
  {
    id: "emma",
    name: "Emma",
    relation: "Daughter, 15",
    pronoun: "Her",
    medicationConfirmed: true,
    lastUpdated: "6:30 AM",
    metrics: [
      { label: "Mood", value: "Good" },
      { label: "Sleep", value: "8h 12m" },
      { label: "Activity", value: "6,120 steps" },
      { label: "Medication", value: "None due" },
    ],
    lines: ["Sleep: 8h 12m", "Mood: Good"],
    story: [
      { period: "Today", items: ["Sleep 8h 12m", "Mood: Good"] },
      { period: "Yesterday", items: ["Sleep 8h 02m", "Sport logged"] },
      { period: "This week", items: ["Sleep: Consistent", "Activity: +4%", "Mood: Steady"] },
    ],
  },
];

function PersonDetail({ person, onClose }: { person: CarePerson; onClose: () => void }) {
  const well = person.medicationConfirmed;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle className="text-base">{person.name}</DialogTitle>
        </DialogHeader>

        <div>
          <p className="text-sm font-semibold text-foreground">
            {well ? `❤️ ${person.name} is doing well` : `🟠 ${person.name} may need you`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Last updated {person.lastUpdated}</p>
        </div>

        <section className="rounded-xl border border-primary/40 bg-card p-3">
          <h3 className="text-xs font-semibold text-foreground">How {person.name} is doing</h3>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {person.metrics.map((m) => (
              <div key={m.label}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
                <p className="text-sm font-semibold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {well ? "Nothing currently requires your attention." : person.concern}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-3">
          <h3 className="text-xs font-semibold text-foreground">{person.pronoun} recent story</h3>
          <div className="mt-2 space-y-3">
            {person.story.map((block) => (
              <div key={block.period}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{block.period}</p>
                <ul className="mt-1 space-y-0.5">
                  {block.items.map((item) => (
                    <li key={item} className="text-xs text-foreground">
                      <span className="mr-1.5 text-primary">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

/**
 * "They're okay." — answers the caregiver's real question before showing data.
 */
export function PeopleICareFor({ unlocked }: { unlocked: boolean }) {
  const { toast } = useToast();
  const [people, setPeople] = useState<CarePerson[]>(CARE_PEOPLE);
  const [openPerson, setOpenPerson] = useState<CarePerson | null>(null);

  const needsYou = people.filter((p) => !p.medicationConfirmed);
  const allWell = needsYou.length === 0;

  const resolve = (id: string) => {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, medicationConfirmed: true } : p)));
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {people.map((p) => {
          const well = p.medicationConfirmed;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpenPerson(p)}
              className="rounded-lg border border-border bg-background/60 p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold",
                    unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.relation}</p>
                </div>
              </div>
              <span
                className={cn(
                  "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  well ? "bg-primary/10 text-primary" : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                )}
              >
                {well ? "🟢 Doing well" : "🟠 May need you"}
              </span>
              <ul className="mt-2 space-y-0.5">
                {p.lines.map((l) => (
                  <li key={l} className="text-[11px] text-muted-foreground">
                    {l}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {well ? "Nothing needs your attention." : p.concern}
              </p>
              {!well && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast({ title: `Check in with ${p.name}`, description: "We'll let them know you're thinking of them." });
                    }}
                  >
                    Check in
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      resolve(p.id);
                      toast({ title: `${p.name} is all caught up`, description: "Her medication has been confirmed." });
                    }}
                  >
                    Send reminder
                  </Button>
                </div>
              )}
            </button>
          );
        })}

        <div className="rounded-lg border border-dashed border-border bg-background/40 p-3 flex flex-col items-center justify-center text-center">
          <Plus className="h-5 w-5 text-muted-foreground" />
          <p className="mt-1 text-xs font-semibold text-foreground">Add someone</p>
          <p className="text-[10px] text-muted-foreground">Keep the people you love close</p>
        </div>
      </div>

      {allWell ? (
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-foreground">🕊️ Peace of mind</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Everyone you're looking out for is doing well.{" "}
            {people.map((p) => `${p.name} ✓`).join("  ")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Nothing needs your attention.</p>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="text-xs font-semibold text-foreground">🟠 Someone may need you</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {needsYou.map((p) => p.concern).join(" ")}
          </p>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setOpenPerson(people[0])}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          View everyone <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {openPerson && (
        <PersonDetail
          person={people.find((p) => p.id === openPerson.id) || openPerson}
          onClose={() => setOpenPerson(null)}
        />
      )}
    </>
  );
}

export default PeopleICareFor;
