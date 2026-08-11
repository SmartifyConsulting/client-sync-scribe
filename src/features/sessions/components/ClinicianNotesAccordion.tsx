import { AlertTriangle, Brain, ListChecks, Stethoscope } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { parseClinicianNotes } from "../utils/clinicianNotesSections";
import { renderClinicianHighlights } from "../lib/clinicianHighlights";

const ICONS: Record<string, typeof Brain> = {
  "working impression": Stethoscope,
  "safety checks": AlertTriangle,
  differentials: Brain,
  "suggested checks": ListChecks,
};

/** Pastel frame per section — yellow / pink / blue / green. */
const TONES: Record<string, { frame: string; bullet: string }> = {
  "working impression": {
    frame: "bg-clinical-impression border-clinical-impression-border",
    bullet: "border-clinical-impression-border",
  },
  "safety checks": {
    frame: "bg-clinical-safety border-clinical-safety-border",
    bullet: "border-clinical-safety-border",
  },
  differentials: {
    frame: "bg-clinical-differential border-clinical-differential-border",
    bullet: "border-clinical-differential-border",
  },
  "suggested checks": {
    frame: "bg-clinical-checks border-clinical-checks-border",
    bullet: "border-clinical-checks-border",
  },
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
        const key = section.title.toLowerCase();
        const Icon = ICONS[key] || Brain;
        const isSafety = key === "safety checks";
        const tone = TONES[key] || { frame: "bg-card border-border", bullet: "border-primary/40" };
        return (
          <AccordionItem
            key={section.title}
            value={section.title}
            className={cn("rounded-lg border overflow-hidden", tone.frame)}
          >
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <span className="flex items-center gap-2 text-xs font-bold text-foreground">
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
                <p className="text-xs leading-relaxed text-foreground">{renderClinicianHighlights(section.text)}</p>
              ) : (
                <ul className="space-y-1.5">
                  {section.items.map((item, i) => (
                    <li
                      key={i}
                      className={cn("text-xs leading-relaxed text-foreground pl-3 border-l-2", tone.bullet)}
                    >
                      {renderClinicianHighlights(item)}
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
