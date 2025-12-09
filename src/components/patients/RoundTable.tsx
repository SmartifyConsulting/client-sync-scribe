import { useState, useEffect } from "react";
import { Users, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface RoundTableNote {
  id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string | null;
  content: string;
  created_at: string;
  isRead: boolean;
}

interface RoundTableProps {
  patientId: string;
  patientName: string;
  onUnreadCountChange?: (count: number) => void;
}

export function RoundTable({ patientId, patientName, onUnreadCountChange }: RoundTableProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<RoundTableNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserSpecialty, setCurrentUserSpecialty] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
    fetchCurrentUser();
  }, [patientId]);

  // Real-time subscription for round table notes
  useEffect(() => {
    const channel = supabase
      .channel(`round_table_${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_table_notes',
          filter: `patient_id=eq.${patientId}`
        },
        (payload) => {
          console.log('Round table realtime update:', payload);
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, specialty')
        .eq('id', user.id)
        .maybeSingle();
      setCurrentUserName(profile?.full_name || 'Doctor');
      setCurrentUserSpecialty((profile as any)?.specialty || null);
    }
  };

  const fetchNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all notes for this patient
      const { data: notesData, error: notesError } = await supabase
        .from('round_table_notes')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      // Fetch read status for current user
      const { data: readsData } = await supabase
        .from('round_table_reads')
        .select('note_id')
        .eq('doctor_id', user.id);

      const readNoteIds = new Set(readsData?.map(r => r.note_id) || []);

      // Fetch specialties for all doctors who wrote notes
      const doctorIds = [...new Set((notesData || []).map(n => n.doctor_id))];
      const { data: doctorProfiles } = await supabase
        .from('profiles')
        .select('id, specialty')
        .in('id', doctorIds);
      
      const doctorSpecialties = new Map(
        (doctorProfiles || []).map(p => [p.id, (p as any).specialty])
      );

      const notesWithReadStatus = (notesData || []).map(note => ({
        ...note,
        doctor_specialty: doctorSpecialties.get(note.doctor_id) || null,
        isRead: readNoteIds.has(note.id) || note.doctor_id === user.id
      }));

      setNotes(notesWithReadStatus);
      
      // Count unread notes (excluding own notes)
      const unreadCount = notesWithReadStatus.filter(n => !n.isRead && n.doctor_id !== user.id).length;
      onUnreadCountChange?.(unreadCount);

      // Mark notes as read when viewing
      const unreadNoteIds = notesWithReadStatus
        .filter(n => !n.isRead && n.doctor_id !== user.id)
        .map(n => n.id);

      if (unreadNoteIds.length > 0) {
        for (const noteId of unreadNoteIds) {
          await supabase
            .from('round_table_reads')
            .upsert({ note_id: noteId, doctor_id: user.id }, { onConflict: 'note_id,doctor_id' });
        }
      }
    } catch (error) {
      console.error('Error fetching round table notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newNote.trim() || !currentUserId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('round_table_notes')
        .insert({
          patient_id: patientId,
          doctor_id: currentUserId,
          doctor_name: currentUserName,
          content: newNote.trim()
        });

      if (error) throw error;

      toast({
        title: "Note added",
        description: "Your note has been added to the Round Table",
      });

      setNewNote("");
      fetchNotes();
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('round_table_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast({
        title: "Note deleted",
        description: "Your note has been removed",
      });

      fetchNotes();
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Round Table</h3>
          <p className="text-xs text-muted-foreground">
            Collaborative notes from all doctors on {patientName}'s care team
          </p>
        </div>
      </div>

      {/* New Note Input */}
      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <Textarea
          placeholder="Add a note for the care team..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="min-h-[100px] resize-none bg-background"
        />
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !newNote.trim()}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Add Note
          </Button>
        </div>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          No notes yet. Be the first to add a note to the Round Table!
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`rounded-lg border p-4 transition-colors ${
                !note.isRead 
                  ? 'border-primary/50 bg-primary/5' 
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-medium">
                    {note.doctor_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{note.doctor_name}</p>
                      {note.doctor_specialty && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                          {note.doctor_specialty}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                {note.doctor_id === currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="mt-3 text-sm text-foreground whitespace-pre-wrap">
                {note.content}
              </p>
              {!note.isRead && (
                <span className="mt-2 inline-block text-xs text-primary font-medium">
                  New
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}