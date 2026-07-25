import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pill } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchVisibleDoctors } from "@/features/patients/lib/visibleDoctors";
import type { RenewalCandidate } from "@/features/patients/hooks/usePrescriptionRenewals";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: RenewalCandidate | null;
  patientId: string;
  patientUserId: string;
}

const COMMENT_MAX = 500;

export function RenewalRequestDialog({ open, onOpenChange, candidate, patientId, patientUserId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [doctorId, setDoctorId] = useState<string>("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: doctors = [] } = useQuery({
    queryKey: ["visible-doctors", patientUserId],
    queryFn: () => fetchVisibleDoctors(patientUserId),
    enabled: !!patientUserId && open,
  });

  useEffect(() => {
    if (open && candidate) {
      setDoctorId(candidate.doctor_id ?? "");
      setComment("");
    }
  }, [open, candidate]);

  if (!candidate) return null;

  const handleSubmit = async () => {
    if (!doctorId) {
      toast({ title: "Choose a doctor", description: "Please pick who should handle the renewal.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const trimmed = comment.trim().slice(0, COMMENT_MAX);

      // Compose a doctor-facing task description with read-only Rx summary
      // and a clearly delimited patient-comment block (only when present).
      const summary = [
        `Prescription renewal request from your patient.`,
        ``,
        `Medication: ${candidate.medication}`,
        candidate.dosage ? `Dosage: ${candidate.dosage}` : null,
        candidate.frequency ? `Frequency: ${candidate.frequency}` : null,
        candidate.instructions ? `Instructions: ${candidate.instructions}` : null,
        `Refills remaining: ${candidate.refills_remaining}`,
        candidate.end_date ? `End date: ${format(parseISO(candidate.end_date), "MMM d, yyyy")}` : null,
      ].filter(Boolean).join("\n");

      const description = trimmed
        ? `${summary}\n\n--- Patient comment ---\n${trimmed}`
        : summary;

      const hasComment = trimmed.length > 0;
      const title = hasComment
        ? `Renew prescription: ${candidate.medication}${candidate.dosage ? ` ${candidate.dosage}` : ""} â€” adjustment requested`
        : `Renew prescription: ${candidate.medication}${candidate.dosage ? ` ${candidate.dosage}` : ""}`;

      const due = candidate.end_date ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const priority = candidate.is_expired || hasComment ? "high" : "normal";

      // 1) Create the todo for the doctor
      const { data: todo, error: todoErr } = await supabase
        .from("todos")
        .insert({
          user_id: doctorId,
          patient_id: patientId,
          task_type: "prescription_renewal",
          title,
          description,
          priority,
          status: "pending",
          due_date: due,
        } as any)
        .select("id")
        .single();
      if (todoErr) throw todoErr;

      // 2) Persist the renewal request
      const { error: reqErr } = await supabase.from("prescription_renewal_requests").insert({
        prescription_id: candidate.prescription_id,
        patient_user_id: patientUserId,
        requested_doctor_id: doctorId,
        original_doctor_id: candidate.doctor_id,
        todo_id: todo?.id ?? null,
        status: "pending",
        patient_comment: trimmed || null,
      } as any);
      if (reqErr) throw reqErr;

      // 3) Notify the doctor
      await supabase.from("notifications").insert({
        user_id: doctorId,
        type: "prescription_renewal_request",
        title: hasComment ? "Renewal + adjustment request" : "Prescription renewal request",
        body: `${candidate.medication}${candidate.dosage ? ` ${candidate.dosage}` : ""}`,
        metadata: {
          prescription_id: candidate.prescription_id,
          todo_id: todo?.id,
          has_comment: hasComment,
        },
      } as any);

      toast({ title: "Renewal requested", description: "Your doctor has been notified." });
      queryClient.invalidateQueries({ queryKey: ["prescription-renewals", patientId] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Could not send request", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Request prescription renewal
          </DialogTitle>
          <DialogDescription className="text-sm">
            Review the prescription, choose who should handle the renewal, and add a comment if you'd like something adjusted.
          </DialogDescription>
        </DialogHeader>

        {/* Read-only prescription summary */}
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1">
          <div className="font-semibold text-foreground">{candidate.medication}</div>
          {candidate.dosage && <div><span className="text-muted-foreground">Dosage:</span> {candidate.dosage}</div>}
          {candidate.frequency && <div><span className="text-muted-foreground">Frequency:</span> {candidate.frequency}</div>}
          {candidate.instructions && <div><span className="text-muted-foreground">Instructions:</span> {candidate.instructions}</div>}
          <div><span className="text-muted-foreground">Refills remaining:</span> {candidate.refills_remaining}</div>
          {candidate.end_date && (
            <div>
              <span className="text-muted-foreground">End date:</span>{" "}
              {format(parseISO(candidate.end_date), "MMM d, yyyy")}
              {candidate.is_expired && <span className="ml-2 text-destructive font-medium">(expired)</span>}
            </div>
          )}
          <div className="text-sm italic text-muted-foreground pt-1">
            Read-only â€” use the comment box below to request changes.
          </div>
        </div>

        {/* Doctor selector */}
        <div className="space-y-1.5">
          <Label htmlFor="renewal-doctor" className="text-sm">Assign to doctor</Label>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger id="renewal-doctor">
              <SelectValue placeholder="Choose a doctor" />
            </SelectTrigger>
            <SelectContent>
              {candidate.doctor_id && candidate.doctor_name && !doctors.some(d => d.doctor_id === candidate.doctor_id) && (
                <SelectItem value={candidate.doctor_id}>
                  {candidate.doctor_name} (original prescriber)
                </SelectItem>
              )}
              {doctors.map((d) => (
                <SelectItem key={d.doctor_id} value={d.doctor_id}>
                  {d.full_name || "Unknown doctor"}
                  {d.doctor_id === candidate.doctor_id ? " (original prescriber)" : ""}
                  {d.specialty ? ` â€” ${d.specialty}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Defaults to the original prescriber. Switch to another of your doctors if you'd prefer.
          </p>
        </div>

        {/* Patient comment */}
        <div className="space-y-1.5">
          <Label htmlFor="renewal-comment" className="text-sm">
            Anything you'd like changed? (optional)
          </Label>
          <Textarea
            id="renewal-comment"
            placeholder="e.g. Switch to a smaller dose, change frequency, side effects, alternative medicationâ€¦"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
            className="min-h-[90px] text-sm"
          />
          <p className="text-sm text-muted-foreground text-right">
            {comment.length}/{COMMENT_MAX}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

