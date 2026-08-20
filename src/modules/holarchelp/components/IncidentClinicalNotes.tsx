import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, AlertCircle, Heart, Pill, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ClinicalNote {
  id: string;
  note_type: "triage" | "assessment" | "treatment" | "outcome";
  staff_name: string;
  note_text: string;
  created_at: string;
  relevant_conditions?: string[];
  relevant_allergies?: string[];
}

interface IncidentClinicalNotesProps {
  patientUserId: string | null;
  incidentId: string | null;
  className?: string;
}

interface ClinicalContext {
  active_conditions?: string[];
  critical_allergies?: string[];
  current_medications?: string[];
  abnormal_labs?: string[];
  suggested_monitoring?: string[];
}

export function IncidentClinicalNotes({
  patientUserId,
  incidentId,
  className,
}: IncidentClinicalNotesProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<"triage" | "assessment" | "treatment" | "outcome">(
    "assessment"
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clinicalContext, setClinicalContext] = useState<ClinicalContext | null>(null);

  // Fetch clinical context
  useEffect(() => {
    if (!patientUserId) return;

    const fetchContext = async () => {
      const { data, error } = await supabase.rpc(
        "get_incident_clinical_context",
        {
          p_patient_id: patientUserId,
        }
      );

      if (!error && data && data.length > 0) {
        setClinicalContext(data[0]);
      }
    };

    fetchContext();
  }, [patientUserId]);

  // Fetch existing notes
  useEffect(() => {
    if (!incidentId) return;

    const fetchNotes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("incident_clinical_notes")
        .select("*")
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotes(
          data.map((n) => ({
            id: n.id,
            note_type: n.note_type,
            staff_name: n.staff_name || "Staff",
            note_text: n.note_text,
            created_at: n.created_at,
            relevant_conditions: n.relevant_conditions,
            relevant_allergies: n.relevant_allergies,
          }))
        );
      }
      setLoading(false);
    };

    fetchNotes();
  }, [incidentId]);

  const handleAddNote = async () => {
    if (!noteText.trim() || !incidentId || !patientUserId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("incident_clinical_notes").insert({
        incident_id: incidentId,
        patient_user_id: patientUserId,
        note_type: noteType,
        staff_user_id: user?.id,
        note_text: noteText,
        relevant_conditions: clinicalContext?.active_conditions,
        relevant_allergies: clinicalContext?.critical_allergies,
      });

      if (!error) {
        setNoteText("");
        // Refresh notes
        const { data } = await supabase
          .from("incident_clinical_notes")
          .select("*")
          .eq("incident_id", incidentId)
          .order("created_at", { ascending: false });

        if (data) {
          setNotes(
            data.map((n) => ({
              id: n.id,
              note_type: n.note_type,
              staff_name: n.staff_name || "Staff",
              note_text: n.note_text,
              created_at: n.created_at,
              relevant_conditions: n.relevant_conditions,
              relevant_allergies: n.relevant_allergies,
            }))
          );
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!patientUserId || !incidentId) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No incident selected
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Suggested Clinical Context */}
      {clinicalContext && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="conditions" className="text-xs">
              Conditions
            </TabsTrigger>
            <TabsTrigger value="meds" className="text-xs">
              Meds
            </TabsTrigger>
            <TabsTrigger value="labs" className="text-xs">
              Labs
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-2 mt-3">
            {clinicalContext.critical_allergies && clinicalContext.critical_allergies.length > 0 && (
              <Alert className="border-destructive/30 bg-destructive/5">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertTitle className="text-destructive text-sm">
                  Critical Allergies
                </AlertTitle>
                <AlertDescription className="mt-1">
                  <div className="space-y-1">
                    {clinicalContext.critical_allergies.map((allergy, i) => (
                      <p key={i} className="text-xs font-semibold">
                        {allergy}
                      </p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {clinicalContext.active_conditions && clinicalContext.active_conditions.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <Heart className="h-3 w-3" /> Active Conditions
                  </p>
                  <div className="space-y-1">
                    {clinicalContext.active_conditions.slice(0, 3).map((cond, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {cond}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {clinicalContext.suggested_monitoring && clinicalContext.suggested_monitoring.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Suggested Monitoring
                  </p>
                  <ul className="space-y-1">
                    {clinicalContext.suggested_monitoring.map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Conditions Tab */}
          <TabsContent value="conditions" className="mt-3">
            {clinicalContext.active_conditions && clinicalContext.active_conditions.length > 0 ? (
              <ul className="space-y-2">
                {clinicalContext.active_conditions.map((cond, i) => (
                  <li key={i} className="text-xs p-2 bg-muted rounded">
                    {cond}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No active conditions
              </p>
            )}
          </TabsContent>

          {/* Medications Tab */}
          <TabsContent value="meds" className="mt-3">
            {clinicalContext.current_medications && clinicalContext.current_medications.length > 0 ? (
              <ul className="space-y-2">
                {clinicalContext.current_medications.map((med, i) => (
                  <li key={i} className="text-xs p-2 bg-muted rounded flex items-center gap-2">
                    <Pill className="h-3 w-3" />
                    {med}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No active medications
              </p>
            )}
          </TabsContent>

          {/* Labs Tab */}
          <TabsContent value="labs" className="mt-3">
            {clinicalContext.abnormal_labs && clinicalContext.abnormal_labs.length > 0 ? (
              <ul className="space-y-2">
                {clinicalContext.abnormal_labs.map((lab, i) => (
                  <li key={i} className="text-xs p-2 bg-warning/10 border border-warning/30 rounded">
                    {lab}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No abnormal labs
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Add Clinical Note */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Add Clinical Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={noteType} onValueChange={(v: any) => setNoteType(v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="triage">Triage</SelectItem>
              <SelectItem value="assessment">Assessment</SelectItem>
              <SelectItem value="treatment">Treatment</SelectItem>
              <SelectItem value="outcome">Outcome</SelectItem>
            </SelectContent>
          </Select>

          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Enter clinical note... Patient context will be automatically linked."
            className="min-h-24 resize-none text-xs"
            disabled={submitting}
          />

          <Button
            onClick={handleAddNote}
            disabled={!noteText.trim() || submitting}
            className="w-full"
            size="sm"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Send className="mr-2 h-3.5 w-3.5" />
                Add Note
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Previous Notes */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            Previous Notes ({notes.length})
          </p>
          {notes.map((note) => (
            <Card key={note.id} className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {note.note_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), "MMM d, HH:mm")}
                    </span>
                    <span className="text-xs font-semibold">{note.staff_name}</span>
                  </div>
                  <p className="text-xs whitespace-pre-wrap">{note.note_text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">
          No clinical notes yet. Add one to get started.
        </p>
      )}
    </div>
  );
}
