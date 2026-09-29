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


const COLUMN_ORDER = ["working impression", "safety checks", "differentials", "suggested checks"];

const TITLES: Record<string, string> = {
  "working impression": "Working Impression",
  "safety checks": "Safety Checks",
  differentials: "Differentials",
  "suggested checks": "Suggested Checks",
};

function SectionBody({
  section,
  bullet,
}: {
  section: ReturnType<typeof parseClinicianNotes>[number];
  bullet: string;
}) {
  if (section.text) {
    return <p className="text-xs leading-relaxed text-foreground">{renderClinicianHighlights(section.text)}</p>;
  }
  return (
    <div className="space-y-3">
      {section.groups?.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 text-xs font-bold text-foreground">{group.label}</p>
          <ul className="space-y-1.5">
            {group.items.map((item, i) => (
              <li key={i} className={cn("text-xs leading-relaxed text-foreground pl-3 border-l-2", bullet)}>
                {renderClinicianHighlights(item)}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {section.items.length > 0 && (
        <ul className="space-y-1.5">
          {section.items.map((item, i) => (
            <li key={i} className={cn("text-xs leading-relaxed text-foreground pl-3 border-l-2", bullet)}>
              {renderClinicianHighlights(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Four fixed columns — Working Impression, Safety Checks, Differentials,
 * Suggested Checks — for the live session workspace. Extra sections render
 * full width underneath so nothing is lost.
 */
export function ClinicianNotesColumns({
  notes,
  className,
}: {
  notes?: string | null;
  className?: string;
}) {
  const sections = parseClinicianNotes(notes);
  const byKey = new Map(sections.map((s) => [s.title.toLowerCase(), s]));
  const extras = sections.filter((s) => !COLUMN_ORDER.includes(s.title.toLowerCase()));

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 items-start">
        {COLUMN_ORDER.map((key) => {
          const section = byKey.get(key);
          const Icon = ICONS[key] || Brain;
          const isSafety = key === "safety checks";
          const tone = TONES[key];
          const count = section ? section.items.length + (section.groups?.reduce((n, g) => n + g.items.length, 0) || 0) : 0;
          return (
            <div key={key} className={cn("rounded-lg border p-3 min-w-0", tone.frame)}>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-foreground">
                <Icon className={cn("h-4 w-4 shrink-0", isSafety ? "text-destructive" : "text-primary")} />
                <span className="truncate">{TITLES[key]}</span>
                {count > 0 && <span className="font-normal text-muted-foreground">({count})</span>}
              </div>
              {section ? (
                <SectionBody section={section} bullet={tone.bullet} />
              ) : (
                <p className="text-xs text-muted-foreground">None yet.</p>
              )}
            </div>
          );
        })}
      </div>
      {extras.map((section) => (
        <div key={section.title} className="rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-xs font-bold text-foreground">{section.title}</p>
          <SectionBody section={section} bullet="border-primary/40" />
        </div>
      ))}
    </div>
  );
}


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
      <p className="text-sm text-muted-foreground">No AI Consultation Assistant notes recorded for this consultation.</p>
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
                <div className="space-y-3">
                  {section.groups?.map((group) => (
                    <div key={group.label}>
                      <p className="mb-1.5 text-xs font-bold text-foreground">{group.label}</p>
                      <ul className="space-y-1.5">
                        {group.items.map((item, i) => (
                          <li key={i} className={cn("text-xs leading-relaxed text-foreground pl-3 border-l-2", tone.bullet)}>
                            {renderClinicianHighlights(item)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {section.items.length > 0 && (
                    <ul className="space-y-1.5">
                      {section.items.map((item, i) => (
                        <li key={i} className={cn("text-xs leading-relaxed text-foreground pl-3 border-l-2", tone.bullet)}>
                          {renderClinicianHighlights(item)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}

    </Accordion>
  );
}
