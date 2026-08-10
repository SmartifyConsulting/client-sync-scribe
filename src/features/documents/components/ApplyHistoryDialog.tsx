import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ExtractedHistory {
  conditions_diagnoses?: string[];
  current_medications?: string[];
  allergies?: string[];
  surgeries?: string[];
  family_history?: string[];
  notable_events?: string[];
  /** Short clinical bullets appended to the patient's overview notes. */
  overview_bullets?: string[];
  /** Date the paper record was written (YYYY-MM-DD), when the AI could read it. */
  record_date?: string | null;
}

type ColumnKind = "list" | "text";

interface FieldDef {
  key: keyof ExtractedHistory;
  column: string;
  label: string;
  kind: ColumnKind;
  /** Builds a structured list entry in the shape already stored for that column. */
  toEntry?: (name: string, recordDate?: string) => Record<string, unknown>;
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const SOURCE = "Transcribed handwritten record";

/** Maps the extracted keys onto real patient columns and their storage shape. */
const FIELD_MAP: FieldDef[] = [
  {
    key: "conditions_diagnoses",
    column: "conditions_diagnoses",
    label: "Conditions & diagnoses",
    kind: "list",
    toEntry: (name, recordDate) => ({
      id: uid(),
      name,
      status: "active",
      diagnosed_date: recordDate || null,
      source: SOURCE,
    }),
  },
  {
    key: "current_medications",
    column: "current_medications",
    label: "Medications",
    kind: "list",
    toEntry: (name, recordDate) => ({
      id: uid(),
      name,
      status: "current",
      start_date: recordDate || null,
      source: SOURCE,
    }),
  },
  { key: "allergies", column: "allergies", label: "Allergies", kind: "text" },
  {
    key: "surgeries",
    column: "surgeries",
    label: "Surgeries",
    kind: "list",
    toEntry: (name, recordDate) => ({
      id: uid(),
      name,
      date: recordDate || null,
      source: SOURCE,
    }),
  },
  {
    key: "family_history",
    column: "family_history",
    label: "Family history",
    kind: "list",
    toEntry: (name) => ({ id: uid(), relation: "", condition: name, source: SOURCE }),
  },
  {
    key: "notable_events",
    column: "notes",
    label: "Notable events (added to notes)",
    kind: "text",
  },
];

/** Existing name/condition of a stored list entry, for de-duplication. */
const entryName = (entry: unknown): string => {
  if (typeof entry === "string") return entry;
  const obj = (entry || {}) as Record<string, unknown>;
  return String(obj.name ?? obj.condition ?? obj.title ?? "").trim();
};

interface ApplyHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  history: ExtractedHistory;
  /** Record date the history came from, shown alongside appended entries. */
  recordDate?: string;
  onApplied?: () => void;
}

/**
 * Asks the clinician to confirm before any AI-extracted history from a
 * transcribed handwritten record is written back to the patient's record.
 * Nothing is overwritten — structured items are appended to their list
 * columns and overview bullets are appended to the patient's notes.
 */
export function ApplyHistoryDialog({
  open,
  onOpenChange,
  patientId,
  history,
  recordDate,
  onApplied,
}: ApplyHistoryDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const effectiveDate = recordDate || history?.record_date || "";

  const rows = useMemo(
    () =>
      FIELD_MAP.map((f) => ({
        ...f,
        items: (history?.[f.key] as string[] | undefined)?.filter(
          (i) => typeof i === "string" && i.trim(),
        ) ?? [],
      })).filter((f) => f.items.length > 0),
    [history],
  );

  const bullets = useMemo(
    () => (history?.overview_bullets || []).filter((b) => typeof b === "string" && b.trim()),
    [history],
  );

  const toggle = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const apply = async () => {
    setSaving(true);
    try {
      const { data: patient, error: readError } = await supabase
        .from("patients")
        .select(
          "conditions_diagnoses, current_medications, allergies, surgeries, family_history, notes",
        )
        .eq("id", patientId)
        .maybeSingle();
      if (readError) throw readError;

      const stamp = effectiveDate ? ` (record ${effectiveDate})` : "";
      const updates: Record<string, unknown> = {};

      for (const row of rows) {
        const chosen = row.items.filter((item) => !excluded.has(`${row.key}:${item}`));
        if (chosen.length === 0) continue;

        if (row.kind === "list") {
          const existing = Array.isArray((patient as any)?.[row.column])
            ? [...((patient as any)[row.column] as unknown[])]
            : [];
          const seen = new Set(existing.map((e) => entryName(e).toLowerCase()).filter(Boolean));
          const additions = chosen
            .filter((item) => !seen.has(item.trim().toLowerCase()))
            .map((item) => row.toEntry!(item.trim(), effectiveDate || undefined));
          if (additions.length === 0) continue;
          updates[row.column] = [...existing, ...additions];
        } else {
          const existing = ((patient as any)?.[row.column] || "").toString().trim();
          const additions = chosen
            .filter((item) => !existing.toLowerCase().includes(item.trim().toLowerCase()))
            .map((item) => `${item.trim()}${stamp}`);
          if (additions.length === 0) continue;
          updates[row.column] = existing
            ? `${existing}\n${additions.join("\n")}`
            : additions.join("\n");
        }
      }

      // Retrospective overview bullets are appended to the notes as a dated block.
      const keptBullets = bullets.filter((b) => !excluded.has(`overview:${b}`));
      if (keptBullets.length > 0) {
        const existingNotes = (
          (updates.notes as string | undefined) ??
          ((patient as any)?.notes || "")
        )
          .toString()
          .trim();
        const heading = `Historic record — ${effectiveDate || "date unknown"} (transcribed handwritten notes)`;
        const block = [heading, ...keptBullets.map((b) => `• ${b.replace(/^[•\-*]\s*/, "")}`)].join(
          "\n",
        );
        updates.notes = existingNotes ? `${existingNotes}\n\n${block}` : block;
      }

      if (Object.keys(updates).length === 0) {
        toast({
          title: "Nothing new to add",
          description: "The record already contains this history.",
        });
        onOpenChange(false);
        return;
      }

      const { error } = await supabase.from("patients").update(updates as any).eq("id", patientId);
      if (error) throw error;

      toast({
        title: "Patient record updated",
        description: "History and overview notes appended from the transcribed record.",
      });
      onApplied?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Could not update record",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const nothingFound = rows.length === 0 && bullets.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply to patient record?</DialogTitle>
          <DialogDescription>
            The AI found the following history in the transcribed record
            {effectiveDate ? ` dated ${effectiveDate}` : ""}. Nothing is overwritten — selected
            items are appended to the patient's record.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto">
          {nothingFound ? (
            <p className="text-sm text-muted-foreground">
              No structured history was identified in this record.
            </p>
          ) : (
            <>
              {bullets.length > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-bold text-foreground mb-2">
                    Overview (added as dated bullet points)
                  </p>
                  <div className="space-y-1.5">
                    {bullets.map((b) => {
                      const id = `overview:${b}`;
                      return (
                        <label key={id} className="flex items-start gap-2 text-sm">
                          <Checkbox
                            checked={!excluded.has(id)}
                            onCheckedChange={() => toggle(id)}
                            className="mt-0.5"
                          />
                          <span className="text-foreground">{b}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {rows.map((row) => (
                <div key={row.key} className="rounded-lg border border-border p-3">
                  <p className="text-xs font-bold text-foreground mb-2">{row.label}</p>
                  <div className="space-y-1.5">
                    {row.items.map((item) => {
                      const id = `${row.key}:${item}`;
                      return (
                        <label key={id} className="flex items-start gap-2 text-sm">
                          <Checkbox
                            checked={!excluded.has(id)}
                            onCheckedChange={() => toggle(id)}
                            className="mt-0.5"
                          />
                          <span className="text-foreground">{item}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Skip
          </Button>
          <Button size="sm" onClick={apply} disabled={saving || nothingFound}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Apply to record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
