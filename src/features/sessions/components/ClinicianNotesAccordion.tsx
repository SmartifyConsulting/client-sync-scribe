import { AlertTriangle, Brain, ListChecks, Stethoscope } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { parseClinicianNotes } from "../utils/clinicianNotesSections";

const ICONS: Record<string, typeof Brain> = {
  "working impression": Stethoscope,
  "safety checks": AlertTriangle,
  differentials: Brain,
  "suggested checks": ListChecks,
};

/**
 * Renders finalised AI Clinician notes as collapsible sections
 * (Working Impression, Safety Checks, Differentials, Suggested Checks) with
 * repeated cautions and duplicate lines removed.
 */
export function ClinicianNotesAccordion({
  notes,
  className,
  defaultOpenFirst = true,
}: {
  notes?: string | null;
  className?: string;
  defaultOpenFirst?: boolean;
}) {
  const sections = parseClinicianNotes(notes);

  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No AI Clinician notes recorded for this session.</p>
    );
  }

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultOpenFirst ? [sections[0].title] : []}
      className={cn("space-y-2", className)}
    >
      {sections.map((section) => {
        const Icon = ICONS[section.title.toLowerCase()] || Brain;
        const isSafety = section.title.toLowerCase() === "safety checks";
        return (
          <AccordionItem
            key={section.title}
            value={section.title}
            className="rounded-lg border border-border overflow-hidden"
          >
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Icon className={cn("h-4 w-4", isSafety ? "text-destructive" : "text-primary")} />
                {section.title}
                {section.items.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({section.items.length})
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              {section.text ? (
                <p className="text-sm leading-relaxed text-foreground">{section.text}</p>
              ) : (
                <ul className="space-y-1.5">
                  {section.items.map((item, i) => (
                    <li
                      key={i}
                      className={cn(
                        "text-sm leading-relaxed text-foreground pl-3 border-l-2",
                        isSafety ? "border-destructive/50" : "border-primary/40",
                      )}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
