import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { MessageSquare, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ListGroupToolbar } from "@/components/common/ListGroupToolbar";

interface RoundTableNote {
  id: string;
  doctor_name: string;
  content: string;
  created_at: string;
  author_type: "doctor" | "patient";
  patient_author_id: string | null;
}

export default function PatientRoundTable({ hideHeader = false }: { hideHeader?: boolean }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [notes, setNotes] = useState<RoundTableNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchNotes = async () => {
    if (!user) return;
    setLoading(true);
    const { data: patients } = await supabase
      .from("patients")
      .select("id")
      .eq("patient_user_id", user.id);

    if (!patients?.length) {
      setLoading(false);
      return;
    }

    const patientIds = patients.map((p) => p.id);
    setPatientId(patientIds[0]);

    const { data } = await supabase
      .from("round_table_notes" as any)
      .select("id, doctor_name, content, created_at, author_type, patient_author_id")
      .in("patient_id", patientIds)
      .order("created_at", { ascending: false });

    if (data) setNotes(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const openNew = () => {
    setEditingId(null);
    setDraft("");
    setOpen(true);
  };

  const openEdit = (note: RoundTableNote) => {
    setEditingId(note.id);
    setDraft(note.content);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!draft.trim() || !patientId || !user) return;
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("round_table_notes" as any)
          .update({ content: draft.trim() })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("round_table_notes" as any).insert({
          patient_id: patientId,
          content: draft.trim(),
          author_type: "patient",
          patient_author_id: user.id,
          doctor_name: profile?.full_name || "You",
        });
        if (error) throw error;
      }
      setOpen(false);
      setDraft("");
      setEditingId(null);
      fetchNotes();
    } catch (err: any) {
      toast({ title: "Could not save your entry", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("round_table_notes" as any).delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Could not delete entry", description: error.message, variant: "destructive" });
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== deleteId));
    }
    setDeleteId(null);
  };

  const renderNote = (note: RoundTableNote) => {
    const isMine = note.author_type === "patient" && note.patient_author_id === user?.id;
    return (
      <Card key={note.id} className={isMine ? "border-primary/40 bg-primary/5" : undefined}>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-7 w-7 mt-0.5">
              <AvatarFallback className={isMine ? "bg-primary text-primary-foreground text-sm" : "bg-primary/10 text-primary text-sm"}>
                {note.doctor_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">{isMine ? "You" : note.doctor_name}</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(note.created_at), "dd MMM yyyy, HH:mm")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
            </div>
            {isMine && (
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(note)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(note.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div>
          <h1 className="page-title">Round Table</h1>
          <p className="text-muted-foreground text-xs">
            The conversation between you and your healthcare providers about your care.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={openNew} disabled={!patientId}>
          <Plus className="h-4 w-4 mr-1" /> Add entry
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-sm font-semibold text-foreground mb-1">No notes yet</h3>
            <p className="text-muted-foreground text-sm">
              When your doctors share round table notes, or you add your own entry, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ListGroupToolbar
          storageKey="patient-round-table"
          items={notes.map((n) => ({
            item: n,
            date: n.created_at,
            search: `${n.doctor_name} ${n.content}`,
          }))}
          hideControls
          frameless
          renderItem={renderNote}
        />
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!saving) setOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit your entry" : "Add an entry"}</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share an update, ask a question, or add context for your care team..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !draft.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
