import { useEffect, useState } from "react";
import { format, setHours, setMinutes, isBefore, parseISO, addDays } from "date-fns";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FollowUpAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: string;
  doctorName?: string;
  patientId: string;
  patientUserId?: string | null;
  patientName?: string;
  suggestedDate?: string; // ISO YYYY-MM-DD from AI extraction
  suggestedTime?: string; // HH:MM 24h from AI extraction
  onDone: () => void;
}

const SLOT_DURATION = 30;
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 18;

function generateTimeSlots() {
  const slots: { hour: number; minute: number; label: string }[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION) {
      const period = h >= 12 ? "PM" : "AM";
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      slots.push({ hour: h, minute: m, label: `${displayH}:${m.toString().padStart(2, "0")} ${period}` });
    }
  }
  return slots;
}
const ALL_SLOTS = generateTimeSlots();

function parseIsoDateLocal(iso?: string): Date | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function FollowUpAppointmentDialog({
  open, onOpenChange, doctorId, doctorName, patientId, patientUserId, patientName, suggestedDate, suggestedTime, onDone,
}: FollowUpAppointmentDialogProps) {
  const { toast } = useToast();
  const initialDate = parseIsoDateLocal(suggestedDate) || addDays(new Date(), 7);
  const initialSlot = (() => {
    if (!suggestedTime || !/^\d{2}:\d{2}$/.test(suggestedTime)) return null;
    const [h, m] = suggestedTime.split(":").map(Number);
    const snappedM = m < 30 ? 0 : 30;
    const match = ALL_SLOTS.find(s => s.hour === h && s.minute === snappedM);
    return match || null;
  })();
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [slot, setSlot] = useState<{ hour: number; minute: number; label: string } | null>(initialSlot);
  const [busy, setBusy] = useState<{ start: Date; end: Date }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Sync date/slot when dialog re-opens with new AI suggestion
  useEffect(() => {
    if (!open) return;
    const d = parseIsoDateLocal(suggestedDate);
    if (d) setDate(d);
    if (suggestedTime && /^\d{2}:\d{2}$/.test(suggestedTime)) {
      const [h, m] = suggestedTime.split(":").map(Number);
      const snappedM = m < 30 ? 0 : 30;
      const match = ALL_SLOTS.find(s => s.hour === h && s.minute === snappedM);
      if (match) setSlot(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, suggestedDate, suggestedTime]);

  useEffect(() => {
    if (!open || !date || !doctorId) return;
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
    supabase
      .from("doctor_busy_slots")
      .select("start_time, end_time")
      .eq("doctor_id", doctorId)
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString())
      .then(({ data }) => {
        setBusy((data || []).map((a: any) => ({ start: parseISO(a.start_time), end: parseISO(a.end_time) })));
      });
  }, [open, date, doctorId]);

  const isBusy = (s: { hour: number; minute: number }) => {
    if (!date) return false;
    const start = setMinutes(setHours(new Date(date), s.hour), s.minute);
    const end = new Date(start.getTime() + SLOT_DURATION * 60000);
    if (isBefore(start, new Date())) return true;
    return busy.some(b => start < b.end && end > b.start);
  };

  const handleIgnore = () => {
    onOpenChange(false);
    onDone();
  };

  const handleSet = async () => {
    if (!date || !slot) return;
    setSubmitting(true);
    try {
      const start = setMinutes(setHours(new Date(date), slot.hour), slot.minute);
      start.setSeconds(0, 0);
      const end = new Date(start.getTime() + SLOT_DURATION * 60000);
      const title = `Follow-up — ${patientName || "Patient"}`;

      const { error } = await supabase.from("appointments").insert({
        user_id: doctorId,
        patient_id: patientId,
        title,
        type: "follow_up",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      } as any);
      if (error) throw error;

      if (patientUserId) {
        await supabase.from("notifications").insert({
          user_id: patientUserId,
          type: "appointment_booked",
          title: "Follow-up appointment booked",
          description: `${doctorName || "Your doctor"} scheduled a follow-up on ${format(start, "MMM d, yyyy")} at ${slot.label}.`,
        } as any);
      }

      toast({ title: "Follow-up booked", description: `${format(start, "MMM d")} at ${slot.label}` });
      onOpenChange(false);
      onDone();
    } catch (err: any) {
      toast({ title: "Could not book follow-up", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleIgnore(); else onOpenChange(true); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule follow-up</DialogTitle>
          <DialogDescription>
            Pick a slot for a follow-up with {patientName || "the patient"}. Greyed-out times are already booked.
            Tap "Ignore" if no follow-up is needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { setDate(d); setSlot(null); }}
                disabled={(d) => isBefore(d, new Date(new Date().setHours(0,0,0,0)))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {date && (
            <div className="grid grid-cols-3 gap-1.5 max-h-[260px] overflow-y-auto pr-1">
              {ALL_SLOTS.map((s) => {
                const busyNow = isBusy(s);
                const selected = slot?.hour === s.hour && slot?.minute === s.minute;
                return (
                  <button
                    key={s.label}
                    type="button"
                    disabled={busyNow}
                    onClick={() => setSlot(s)}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-xs transition-colors",
                      busyNow
                        ? "bg-muted text-muted-foreground cursor-not-allowed line-through"
                        : selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-accent border-border"
                    )}
                  >
                    <Clock className="inline h-4 w-4 mr-1" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleIgnore} className="sm:mr-auto" disabled={submitting}>
            Ignore (no follow-up)
          </Button>
          <Button onClick={handleSet} disabled={!slot || submitting}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Set follow-up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
