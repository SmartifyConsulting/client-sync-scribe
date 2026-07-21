import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

interface RoundTableNote {
  id: string;
  doctor_name: string;
  content: string;
  created_at: string;
}

export default function PatientRoundTable({ hideHeader = false }: { hideHeader?: boolean }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<RoundTableNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchNotes() {
      setLoading(true);
      const { data: patients } = await supabase.from("patients").select("id").eq("patient_user_id", user!.id);

      if (!patients?.length) {
        setLoading(false);
        return;
      }

      const patientIds = patients.map((p) => p.id);

      const { data } = await supabase
        .from("round_table_notes")
        .select("id, doctor_name, content, created_at")
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false });

      if (data) setNotes(data);
      setLoading(false);
    }

    fetchNotes();
  }, [user]);

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div>
          <h1 className="text-[16px] font-semibold text-foreground">Round Table</h1>
          <p className="text-muted-foreground text-sm">
            Notes shared by your healthcare providers about your care.
          </p>
        </div>
      )}

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
              When your doctors share round table notes, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-7 w-7 mt-0.5">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
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
                      <span className="text-sm font-semibold text-foreground">{note.doctor_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(note.created_at), "dd MMM yyyy, HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
