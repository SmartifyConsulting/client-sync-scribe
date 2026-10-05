import { useState } from "react";
import { format, startOfToday } from "date-fns";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const SLOTS = Array.from({ length: 22 }, (_, i) => {
  const hour = 7 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? 0 : 30;
  const period = hour >= 12 ? "PM" : "AM";
  const displayH = hour > 12 ? hour - 12 : hour;
  return { hour, minute, label: `${displayH}:${minute.toString().padStart(2, "0")} ${period}` };
});

interface Props {
  patientId: string;
  clientName: string;
  onScheduled?: () => void;
  onClose: () => void;
}

/** Inline date/time picker so a WM can schedule a meeting with this client
 *  without leaving the Live Workspace for the calendar page. */
export function ScheduleMeetingPanel({ patientId, clientName, onScheduled, onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slot, setSlot] = useState<{ hour: number; minute: number } | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!user || !date || !slot) return;
    setBusy(true);
    const start = new Date(date);
    start.setHours(slot.hour, slot.minute, 0, 0);
    const end = new Date(start.getTime() + 30 * 60000);
    const { error } = await supabase.from("appointments").insert({
      user_id: user.id, patient_id: patientId, title: clientName, type: "session",
      description: notes || null, start_time: start.toISOString(), end_time: end.toISOString(),
    });
    setBusy(false);
    if (error) return toast({ title: "Couldn't schedule the meeting", description: error.message, variant: "destructive" });
    toast({ title: "Meeting scheduled", description: `${clientName} · ${format(start, "d MMM yyyy")} at ${format(start, "h:mm a")}` });
    onScheduled?.();
    onClose();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold"><CalendarIcon className="h-4 w-4 text-primary" /> Schedule meeting with {clientName}</p>
        <button onClick={onClose} aria-label="Close" className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto,1fr]">
        <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < startOfToday()} className="rounded-lg border" />
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Time</p>
            <div className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto pr-1">
              {SLOTS.map((s) => (
                <button key={s.label} type="button" onClick={() => setSlot(s)}
                  className={`rounded-lg border px-2 py-1.5 text-xs ${slot?.hour === s.hour && slot?.minute === s.minute ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Notes (optional)</p>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button className="w-full" disabled={!date || !slot || busy} onClick={confirm}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm meeting
          </Button>
        </div>
      </div>
    </div>
  );
}
