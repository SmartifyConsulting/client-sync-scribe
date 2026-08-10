import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Loader2, Bell, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ListGroupToolbar } from "@/components/common/ListGroupToolbar";


interface RoundTableEntry {
  patientId: string;
  patientName: string;
  latestNoteDate: string;
  totalNotes: number;
  unreadCount: number;
  myNotes: number;
}

export function DoctorRoundTables({ compact = false }: { compact?: boolean } = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<RoundTableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState<"mine" | "all">("all");

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

      const { data: rosterPatients } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user!.id);

      const patientIds = [
        ...new Set([
          ...(myNotes || []).map((n) => n.patient_id),
          ...(rosterPatients || []).map((p: any) => p.id),
        ]),
      ];
      if (patientIds.length === 0) { setLoading(false); return; }

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
            myNotes: note.doctor_id === user!.id ? 1 : 0,
          });
        } else {
          existing.totalNotes++;
          if (isUnread) existing.unreadCount++;
          if (note.doctor_id === user!.id) existing.myNotes++;
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

  const visible = ownerFilter === "mine" ? entries.filter((e) => e.myNotes > 0) : entries;

  const items = visible.map((entry) => ({
    item: entry,
    date: entry.latestNoteDate,
    patient: entry.patientName,
    search: entry.patientName,
  }));

  const renderEntry = (entry: RoundTableEntry) => (
    <div
      onClick={() => navigate(`/patients/${entry.patientId}?tab=roundtable`)}
      className={`mb-2 flex items-center gap-3 py-2 px-3 rounded-xl border cursor-pointer transition-colors hover:bg-muted/50 ${
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
  );

  return (
    <ListGroupToolbar
      storageKey="round-tables"
      items={items}
      searchPlaceholder="Search round tables..."
      emptyLabel="No round table contributions yet"
      renderItem={renderEntry}
      defaultOpenFirst={false}
      hideControls={compact}
      actions={
        compact ? undefined : (
          <ToggleGroup
            type="single"
            value={ownerFilter}
            onValueChange={(v) => v && setOwnerFilter(v as "mine" | "all")}
            size="sm"
            variant="outline"
          >
            <ToggleGroupItem value="all" className="text-xs px-3">All</ToggleGroupItem>
            <ToggleGroupItem value="mine" className="text-xs px-3">Mine</ToggleGroupItem>
          </ToggleGroup>
        )
      }
    />
  );
}

