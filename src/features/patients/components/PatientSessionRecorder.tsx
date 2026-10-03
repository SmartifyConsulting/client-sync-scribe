import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Mic, Square, Loader2, Plus, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useNavigate } from "react-router-dom";
import { ListGroupToolbar } from "@/components/common/ListGroupToolbar";

interface Props {
  patientId: string;
  patientName: string;
}

interface SessionRow {
  id: string;
  started_at: string;
  duration_minutes: number | null;
  summary: string | null;
  external_doctor_name: string | null;
  external_doctor_specialty: string | null;
}

export function PatientSessionRecorder({ patientId, patientName }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");
  const [doctorPractice, setDoctorPractice] = useState("");
  const [notes, setNotes] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    isRecording,
    isTranscribing,
    isSavingAudio,
    transcript,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useAudioRecording({
    sessionId: sessionId ?? undefined,
    patientName,
    doctorName: doctorName || "External Doctor",
  });

  const fetchSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sessions")
      .select("id, started_at, duration_minutes, summary, external_doctor_name, external_doctor_specialty")
      .eq("patient_id", patientId)
      .order("started_at", { ascending: false });
    if (!error) setSessions((data as SessionRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, [patientId]);

  const handleStart = async () => {
    if (!doctorName.trim()) {
      toast({ title: "Wealth Manager name required", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        patient_id: patientId,
        title: `Session with ${doctorName}`,
        external_doctor_name: doctorName.trim(),
        external_doctor_specialty: doctorSpecialty.trim() || null,
        external_doctor_practice: doctorPractice.trim() || null,
        status: "in_progress",
      } as any)
      .select("id")
      .single();
    if (error || !data) {
      toast({ title: "Error", description: error?.message, variant: "destructive" });
      return;
    }
    setSessionId(data.id);
    setStartedAt(new Date());
    await startRecording();
  };

  const handleStop = async () => {
    stopRecording();
  };

  const handleSave = async () => {
    if (!sessionId) return;
    setSaving(true);
    const duration = startedAt ? Math.round((Date.now() - startedAt.getTime()) / 60000) : null;
    await supabase
      .from("sessions")
      .update({
        notes,
        transcript,
        status: "completed",
        ended_at: new Date().toISOString(),
        duration_minutes: duration,
      })
      .eq("id", sessionId);
    toast({ title: "Consultation saved" });
    setOpen(false);
    setDoctorName("");
    setDoctorSpecialty("");
    setDoctorPractice("");
    setNotes("");
    setSessionId(null);
    setStartedAt(null);
    clearTranscript();
    setSaving(false);
    fetchSessions();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New session
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <ListGroupToolbar
          storageKey="patient-sessions"
          items={sessions.map((s) => ({
            item: s,
            date: s.started_at,
            search: [s.external_doctor_name, s.external_doctor_specialty, s.summary].filter(Boolean).join(" "),
          }))}
          searchPlaceholder="Search sessions..."
          emptyLabel='No sessions yet. Tap "New session" to record one with your doctor.'
          renderItem={(s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`/sessions/${s.id}`)}
              className="w-full text-left p-3 rounded-xl border border-border bg-card hover:bg-muted/50 flex items-start gap-3"
            >
              <Clock className="h-4 w-4 text-primary mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {format(new Date(s.started_at), "MMM d, yyyy h:mm a")}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.external_doctor_name
                    ? `${s.external_doctor_name}${s.external_doctor_specialty ? ` · ${s.external_doctor_specialty}` : ""}`
                    : s.summary || "Session"}
                </p>
              </div>
              {s.duration_minutes != null && (
                <span className="text-xs text-muted-foreground">{s.duration_minutes} min</span>
              )}
              <Eye className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        />
      )}

      <Dialog open={open} onOpenChange={(v) => !isRecording && setOpen(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record a consultation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ed_name">Wealth Manager name *</Label>
              <Input
                id="ed_name"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                disabled={isRecording || !!sessionId}
                placeholder="Dr. Jane Smith"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="ed_spec">Specialty</Label>
                <Input
                  id="ed_spec"
                  value={doctorSpecialty}
                  onChange={(e) => setDoctorSpecialty(e.target.value)}
                  disabled={isRecording || !!sessionId}
                  placeholder="Cardiology"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ed_prac">Firm</Label>
                <Input
                  id="ed_prac"
                  value={doctorPractice}
                  onChange={(e) => setDoctorPractice(e.target.value)}
                  disabled={isRecording || !!sessionId}
                  placeholder="Firm name"
                />
              </div>
            </div>

            {!sessionId ? (
              <Button onClick={handleStart} className="w-full">
                <Mic className="h-4 w-4 mr-2" />
                Start recording
              </Button>
            ) : isRecording ? (
              <Button onClick={handleStop} variant="destructive" className="w-full">
                <Square className="h-4 w-4 mr-2" />
                Stop recording
              </Button>
            ) : (
              <div className="space-y-2">
                {(isTranscribing || isSavingAudio) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isSavingAudio ? "Saving audio..." : "Transcribing..."}
                  </p>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="ed_notes">Notes / transcript</Label>
                  <Textarea
                    id="ed_notes"
                    rows={5}
                    value={notes || transcript}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes will appear here..."
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {sessionId && !isRecording && (
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Save session
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
