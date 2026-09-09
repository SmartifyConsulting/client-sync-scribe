/**
 * Helpers that clean legacy layout artefacts out of saved document templates.
 *
 * Older Prescription templates shipped three fixed medicine slots
 * (`1. [Medication1]` … `3. [Medication3]`) and older Medical Certificate
 * templates shipped rows of dots as handwriting lines. Both are removed here so
 * nobody can add medication into a blank printed slot and certificates read
 * cleanly.
 */

const MED_SLOT_LINE = /\[(Medication|Dosage|Quantity|Instructions)\d+\]/i;
/** A row made only of dots (optionally wrapped in simple HTML tags). */
const DOTTED_LINE = /^(?:<[^>]+>|\s|&nbsp;)*[.·]{6,}(?:<[^>]+>|\s|&nbsp;)*$/;

/** True when the line is a leftover numbered medicine slot placeholder. */
function isMedicationSlotLine(line: string) {
  return MED_SLOT_LINE.test(line);
}

/** Collapse three or more consecutive blank lines down to one blank line. */
function tidyBlankLines(text: string) {
  return text.replace(/(?:[ \t]*\n){3,}/g, "\n\n").trim();
}

/**
 * Replace the fixed numbered medicine slots in a prescription template with the
 * supplied medicine list (one entry per medicine actually prescribed).
 */
export function fillPrescriptionMedications(template: string, medicationBlock: string): string {
  const lines = template.split("\n");
  const out: string[] = [];
  let inserted = false;

  for (const line of lines) {
    if (isMedicationSlotLine(line)) {
      if (!inserted) {
        out.push(medicationBlock || "No medication prescribed.");
        inserted = true;
      }
      continue;
    }
    out.push(line);
  }

  let result = out.join("\n");
  if (!inserted) {
    // Newer templates use a single [MedicationList] token instead of slots.
    if (/\[MedicationList\]/i.test(result)) {
      result = result.replace(/\[MedicationList\]/gi, medicationBlock || "No medication prescribed.");
    } else if (/\bRx:/i.test(result)) {
      result = result.replace(/\bRx:\s*/i, (m) => `${m}\n\n${medicationBlock}\n`);
    }
  }
  return tidyBlankLines(result);
}

/** Remove dotted handwriting rows from a template (certificates in particular). */
export function stripDottedLines(template: string): string {
  return tidyBlankLines(
    template
      .split("\n")
      .filter((line) => !DOTTED_LINE.test(line))
      .join("\n"),
  );
}
