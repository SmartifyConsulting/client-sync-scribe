import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Loader2, Bell, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface RoundTableEntry {
  patientId: string;
  patientName: string;
  latestNoteDate: string;
  totalNotes: number;
  unreadCount: number;
}

export function DoctorRoundTables() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<RoundTableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchRoundTables();
  }, [user]);

  const fetchRoundTables = async () => {
    try {
      // Get all notes where this doctor contributed
      const { data: myNotes } = await supabase
        .from("round_table_notes")
        .select("patient_id")
        .eq("doctor_id", user!.id);

      if (!myNotes?.length) { setLoading(false); return; }

      const patientIds = [...new Set(myNotes.map(n => n.patient_id))];

      // Get all notes for those patients
      const { data: allNotes } = await supabase
        .from("round_table_notes")
        .select("id, patient_id, created_at, doctor_id")
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false });

      // Get read status
      const { data: reads } = await supabase
        .from("round_table_reads")
        .select("note_id")
        .eq("doctor_id", user!.id);

      const readNoteIds = new Set(reads?.map(r => r.note_id) || []);

      // Get patient names
      const { data: patients } = await supabase
        .from("patients")
        .select("id, name")
        .in("id", patientIds);

      const patientMap = new Map(patients?.map(p => [p.id, p.name]) || []);

      // Group by patient
      const grouped = new Map<string, RoundTableEntry>();
      for (const note of allNotes || []) {
        const existing = grouped.get(note.patient_id);
        const isUnread = note.doctor_id !== user!.id && !readNoteIds.has(note.id);
        if (!existing) {
          grouped.set(note.patient_id, {
            patientId: note.patient_id,
            patientName: patientMap.get(note.patient_id) || "Unknown",
            latestNoteDate: note.created_at,
            totalNotes: 1,
            unreadCount: isUnread ? 1 : 0,
          });
        } else {
          existing.totalNotes++;
          if (isUnread) existing.unreadCount++;
        }
      }

      setEntries(Array.from(grouped.values()).sort((a, b) => 
        new Date(b.latestNoteDate).getTime() - new Date(a.latestNoteDate).getTime()
      ));
    } catch (error) {
      console.error("Error fetching round tables:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No round table contributions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div
          key={entry.patientId}
          onClick={() => navigate(`/patients/${entry.patientId}?tab=roundtable`)}
          className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors hover:bg-muted/50 ${
            entry.unreadCount > 0 ? "border-primary/50 bg-primary/5" : "border-border bg-card"
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm text-foreground truncate">{entry.patientName}</p>
              {entry.unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs h-5 px-1.5">
                  {entry.unreadCount} new
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {entry.totalNotes} note{entry.totalNotes !== 1 ? "s" : ""} · Last activity {format(new Date(entry.latestNoteDate), "MMM d, yyyy")}
            </p>
          </div>
          <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      ))}
    </div>
  );
}
