import { useEffect, useMemo, useState } from "react";
import { Check, FileText, Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Built-in categories offered for every upload. */
export const DEFAULT_DOCUMENT_CATEGORIES = [
  "X-Ray",
  "CT Scan",
  "MRI",
  "Ultrasound",
  "ECG",
  "Lab Result",
  "Pathology Report",
  "Historical Record",
  "Referral Letter",
  "Discharge Summary",
  "Photo",
  "Other",
];

/** Best-guess category from the file itself, used as the initial selection. */
export function guessCategory(file: File): string {
  const name = file.name.toLowerCase();
  if (/x-?ray|xr[_-]/.test(name)) return "X-Ray";
  if (/\bct\b|cat[-_ ]?scan/.test(name)) return "CT Scan";
  if (/\bmri\b/.test(name)) return "MRI";
  if (/ultrasound|sonar|scan/.test(name)) return "Ultrasound";
  if (/ecg|ekg/.test(name)) return "ECG";
  if (/lab|blood|result/.test(name)) return "Lab Result";
  if (/referral/.test(name)) return "Referral Letter";
  if (/discharge/.test(name)) return "Discharge Summary";
  if (file.type === "application/pdf") return "Historical Record";
  if (file.type.startsWith("image/")) return "Photo";
  return "Other";
}

export interface UploadDetails {
  category: string;
  recordDate: string;
}

/**
 * Asks for a category (and optional record date) before an upload is saved, so
 * X-rays, scans and lab results file themselves under the right heading rather
 * than all landing in "Upload". New categories can be typed in on the fly.
 */
export function UploadDocumentsDialog({
  files,
  knownCategories,
  onCancel,
  onConfirm,
}: {
  files: File[];
  knownCategories: string[];
  onCancel: () => void;
  onConfirm: (details: UploadDetails) => void;
}) {
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [extra, setExtra] = useState<string[]>([]);

  useEffect(() => {
    if (files.length) setCategory(guessCategory(files[0]));
  }, [files]);

  const options = useMemo(() => {
    const all = [...DEFAULT_DOCUMENT_CATEGORIES, ...knownCategories, ...extra]
      .map((c) => c.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const unique = all.filter((c) => {
      const key = c.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const term = query.trim().toLowerCase();
    return term ? unique.filter((c) => c.toLowerCase().includes(term)) : unique;
  }, [knownCategories, extra, query]);

  const canCreate =
    !!query.trim() &&
    !options.some((c) => c.toLowerCase() === query.trim().toLowerCase());

  const createCategory = () => {
    const value = query.trim();
    if (!value) return;
    setExtra((prev) => [...prev, value]);
    setCategory(value);
    setQuery("");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Categorise this upload</DialogTitle>
          <DialogDescription>
            Pick what kind of record this is. Images are described by AI, PDFs
            are transcribed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-2 space-y-1 max-h-24 overflow-y-auto">
            {files.map((f) => (
              <p key={f.name} className="flex items-center gap-2 text-xs text-foreground">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{f.name}</span>
              </p>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or type a new category…"
                className="pl-9 h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCreate) {
                    e.preventDefault();
                    createCategory();
                  }
                }}
              />
            </div>
            <div className="max-h-44 overflow-y-auto rounded-lg border border-border divide-y divide-border/50">
              {canCreate && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-primary/5"
                  onClick={createCategory}
                >
                  <Plus className="h-4 w-4" />
                  Create “{query.trim()}”
                </button>
              )}
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50",
                    category === option && "bg-primary/10 font-medium text-primary",
                  )}
                  onClick={() => setCategory(option)}
                >
                  {option}
                  {category === option && <Check className="h-4 w-4" />}
                </button>
              ))}
              {options.length === 0 && !canCreate && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Record date (optional)</Label>
            <Input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground">
              File an older record under the date it was originally written.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!category}
            onClick={() => onConfirm({ category, recordDate })}
          >
            Upload {files.length > 1 ? `${files.length} files` : "file"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
