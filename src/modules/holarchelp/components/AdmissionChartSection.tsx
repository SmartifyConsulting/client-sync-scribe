import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useAdmissionChartEntries, logAdmissionActivity } from "../hooks/useAdmissionChartEntries";

interface Props {
  admissionId: string | null | undefined;
  section: string;
  sectionLabel: string;
  hospitalId?: string | null;
  patientName?: string | null;
  placeholder?: string;
  emptyLabel?: string;
}

/** Generic CRUD list for one bedside-chart section — the same read/write
 *  surface reused across Observations, Medications, Notes, Care Plan, Orders
 *  etc. so nurses (and doctors) can record real entries instead of a static
 *  "not recorded yet" placeholder. Every write is logged to the read-only
 *  activity trail. */
export function AdmissionChartSection({
  admissionId,
  section,
  sectionLabel,
  hospitalId,
  patientName,
  placeholder = "Add an entry…",
  emptyLabel = "Nothing recorded yet.",
}: Props) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useAdmissionChartEntries(admissionId, section);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const authorName = profile?.full_name || user?.email || "Staff";

  const handleAdd = async () => {
    if (!draft.trim() || !admissionId) return;
    setSaving(true);
    await addEntry(draft.trim(), authorName, (profile as any)?.role || null);
    if (hospitalId) {
      await logAdmissionActivity({
        hospitalId,
        admissionId,
        patientName,
        actorName: authorName,
        section,
        action: "added",
        detail: `${sectionLabel}: ${draft.trim().slice(0, 120)}`,
      });
    }
    setDraft("");
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editText.trim()) return;
    setSaving(true);
    await updateEntry(id, editText.trim());
    if (hospitalId) {
      await logAdmissionActivity({
        hospitalId,
        admissionId,
        patientName,
        actorName: authorName,
        section,
        action: "edited",
        detail: `${sectionLabel}: ${editText.trim().slice(0, 120)}`,
      });
    }
    setEditingId(null);
    setEditText("");
    setSaving(false);
  };

  const handleDelete = async (id: string, content: string) => {
    await deleteEntry(id);
    if (hospitalId) {
      await logAdmissionActivity({
        hospitalId,
        admissionId,
        patientName,
        actorName: authorName,
        section,
        action: "deleted",
        detail: `${sectionLabel}: ${content.slice(0, 120)}`,
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="text-sm"
        />
        <Button size="sm" onClick={handleAdd} disabled={saving || !draft.trim()} className="shrink-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="rounded-lg border border-border bg-card p-3">
              {editingId === e.id ? (
                <div className="space-y-2">
                  <Textarea rows={2} value={editText} onChange={(ev) => setEditText(ev.target.value)} className="text-sm" />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => handleUpdate(e.id)} disabled={saving}>Save</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm whitespace-pre-wrap text-foreground">{e.content}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => { setEditingId(e.id); setEditText(e.content); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        onClick={() => handleDelete(e.id, e.content)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {e.author_name} · {format(new Date(e.created_at), "dd MMM HH:mm")}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
