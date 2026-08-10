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
}

/** Maps the extracted keys onto real patient columns. */
const FIELD_MAP: { key: keyof ExtractedHistory; column: string; label: string }[] = [
  { key: "conditions_diagnoses", column: "conditions_diagnoses", label: "Conditions & diagnoses" },
  { key: "current_medications", column: "current_medications", label: "Medications" },
  { key: "allergies", column: "allergies", label: "Allergies" },
  { key: "surgeries", column: "surgeries", label: "Surgeries" },
  { key: "family_history", column: "family_history", label: "Family history" },
  { key: "notable_events", column: "notes", label: "Notable events (added to notes)" },
];

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
 * transcribed handwritten record is appended to the patient's record.
 * Existing values are never overwritten — new items are appended.
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

  const rows = useMemo(
    () =>
      FIELD_MAP.map((f) => ({
        ...f,
        items: (history?.[f.key] || []).filter((i) => typeof i === "string" && i.trim()),
      })).filter((f) => f.items.length > 0),
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
        .select("conditions_diagnoses, current_medications, allergies, surgeries, family_history, notes")
        .eq("id", patientId)
        .maybeSingle();
      if (readError) throw readError;

      const stamp = recordDate ? ` (record ${recordDate})` : "";
      const updates: Record<string, string> = {};

      for (const row of rows) {
        const chosen = row.items.filter((item) => !excluded.has(`${row.key}:${item}`));
        if (chosen.length === 0) continue;
        const existing = ((patient as any)?.[row.column] || "").toString().trim();
        const additions = chosen
          .filter((item) => !existing.toLowerCase().includes(item.toLowerCase()))
          .map((item) => `${item}${stamp}`);
        if (additions.length === 0) continue;
        updates[row.column] = existing
          ? `${existing}\n${additions.join("\n")}`
          : additions.join("\n");
      }

      if (Object.keys(updates).length === 0) {
        toast({ title: "Nothing new to add", description: "The record already contains this history." });
        onOpenChange(false);
        return;
      }

      const { error } = await supabase.from("patients").update(updates).eq("id", patientId);
      if (error) throw error;

      toast({ title: "Patient record updated", description: "History appended from the transcribed record." });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply to patient record?</DialogTitle>
          <DialogDescription>
            The AI found the following history in the transcribed record. Nothing is
            overwritten — selected items are appended to the patient's record.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No structured history was identified in this record.
            </p>
          ) : (
            rows.map((row) => (
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
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Skip
          </Button>
          <Button size="sm" onClick={apply} disabled={saving || rows.length === 0}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Apply to record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
