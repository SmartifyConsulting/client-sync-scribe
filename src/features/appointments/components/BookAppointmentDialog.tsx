import { useState, useEffect } from "react";
import { format, addDays, setHours, setMinutes, isBefore, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Clock, User, DollarSign, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface DoctorInfo {
  doctor_id: string;
  full_name: string | null;
  specialty: string | null;
  avatar_url: string | null;
}

interface ServicePrice {
  id: string;
  service_name: string;
  default_price: number;
  currency: string;
  is_first_consultation?: boolean;
}

interface BookAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked: () => void;
}

const SLOT_DURATION = 30; // minutes
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 18;

function generateTimeSlots() {
  const slots: { hour: number; minute: number; label: string }[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION) {
      if (h === DAY_END_HOUR - 1 && m + SLOT_DURATION > 60) continue;
      const period = h >= 12 ? "PM" : "AM";
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const label = `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
      slots.push({ hour: h, minute: m, label });
    }
  }
  return slots;
}

const ALL_SLOTS = generateTimeSlots();

export function BookAppointmentDialog({ open, onOpenChange, onBooked }: BookAppointmentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Doctors
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorInfo | null>(null);

  // Step 2: Services
  const [services, setServices] = useState<ServicePrice[]>([]);
  const [selectedService, setSelectedService] = useState<ServicePrice | null>(null);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  // Step 3: Date & time
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [busySlots, setBusySlots] = useState<{ start: Date; end: Date }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ hour: number; minute: number; label: string } | null>(null);

  // Step 4: Notes
  const [notes, setNotes] = useState("");

  // Patient record
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedDoctor(null);
      setSelectedService(null);
      setSelectedDate(undefined);
      setSelectedSlot(null);
      setNotes("");
      fetchDoctors();
      fetchPatientId();
    }
  }, [open]);

  const fetchPatientId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("patients")
      .select("id")
      .eq("patient_user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (data) setPatientId(data.id);
  };

  const fetchDoctors = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: access } = await supabase
        .from("doctor_patient_access")
        .select("doctor_id")
        .eq("patient_user_id", user.id)
        .eq("is_active", true);

      if (!access?.length) { setDoctors([]); setLoading(false); return; }

      const doctorIds = access.map((a) => a.doctor_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, avatar_url")
        .in("id", doctorIds);

      setDoctors(
        (profiles || []).map((p) => ({
          doctor_id: p.id,
          full_name: p.full_name,
          specialty: p.specialty,
          avatar_url: p.avatar_url,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async (doctorId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("service_prices")
        .select("*")
        .eq("user_id", doctorId);
      const serviceList = (data || []) as ServicePrice[];
      setServices(serviceList);

      // Check if this is the patient's first appointment with this doctor
      if (user && patientId) {
        const { count } = await supabase
          .from("appointment_requests")
          .select("id", { count: "exact", head: true })
          .eq("patient_user_id", user.id)
          .eq("doctor_id", doctorId);

        const firstVisit = (count || 0) === 0;
        setIsFirstVisit(firstVisit);

        // Auto-select first consultation service if it's the first visit
        if (firstVisit) {
          const firstConsultService = serviceList.find((s: any) => s.is_first_consultation);
          if (firstConsultService) {
            setSelectedService(firstConsultService);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBusySlots = async (doctorId: string, date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from("doctor_busy_slots" as any)
      .select("start_time, end_time")
      .eq("doctor_id", doctorId)
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString());

    setBusySlots(
      ((data as any[]) || []).map((a: any) => ({
        start: parseISO(a.start_time),
        end: parseISO(a.end_time),
      }))
    );
  };

  const isSlotBusy = (slot: { hour: number; minute: number }) => {
    if (!selectedDate) return false;
    const slotStart = setMinutes(setHours(new Date(selectedDate), slot.hour), slot.minute);
    const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION * 60000);

    // Check if it's in the past
    if (isBefore(slotStart, new Date())) return true;

    return busySlots.some(
      (b) => slotStart < b.end && slotEnd > b.start
    );
  };

  const handleSelectDoctor = (doc: DoctorInfo) => {
    setSelectedDoctor(doc);
    fetchServices(doc.doctor_id);
    setStep(2);
  };

  const handleSelectService = (svc: ServicePrice) => {
    setSelectedService(svc);
    setStep(3);
  };

  const handleSelectDate = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (date && selectedDoctor) {
      fetchBusySlots(selectedDoctor.doctor_id, date);
    }
  };

  const handleSelectSlot = (slot: { hour: number; minute: number; label: string }) => {
    if (isSlotBusy(slot)) return;
    setSelectedSlot(slot);
  };

  const handleSubmit = async () => {
    if (!user || !selectedDoctor || !selectedDate || !selectedSlot || !patientId) return;
    setSubmitting(true);
    try {
      const startTime = setMinutes(setHours(new Date(selectedDate), selectedSlot.hour), selectedSlot.minute);
      startTime.setSeconds(0, 0);
      const endTime = new Date(startTime.getTime() + SLOT_DURATION * 60000);

      const { error } = await supabase.from("appointment_requests").insert({
        patient_user_id: user.id,
        doctor_id: selectedDoctor.doctor_id,
        patient_id: patientId,
        service_id: selectedService?.id || null,
        requested_start: startTime.toISOString(),
        requested_end: endTime.toISOString(),
        status: "pending",
        notes: notes || null,
      } as any);

      if (error) throw error;

      // Notify the doctor
      await supabase.from("notifications").insert({
        user_id: selectedDoctor.doctor_id,
        type: "appointment_request",
        title: "New Appointment Request",
        description: `A patient has requested an appointment on ${format(startTime, "MMM d, yyyy")} at ${selectedSlot.label}${selectedService ? ` for ${selectedService.service_name}` : ""}.`,
      });

      toast({ title: "Request Sent", description: "Your appointment request has been sent to the doctor." });
      onBooked();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send request", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Select a Doctor"}
            {step === 2 && "Select a Service"}
            {step === 3 && "Choose Date & Time"}
            {step === 4 && "Confirm Booking"}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 4
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Doctor */}
        {step === 1 && (
          <div className="space-y-2 pt-2">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : doctors.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No connected doctors found. Connect with a doctor first.</p>
            ) : (
              doctors.map((doc) => (
                <button
                  key={doc.doctor_id}
                  onClick={() => handleSelectDoctor(doc)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{doc.full_name || "Doctor"}</p>
                    {doc.specialty && <p className="text-sm text-muted-foreground">{doc.specialty}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Step 2: Select Service */}
        {step === 2 && (
          <div className="space-y-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="mb-2">â† Back</Button>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : services.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-3">This doctor hasn't set up services yet.</p>
                <Button onClick={() => { setSelectedService(null); setStep(3); }}>
                  Continue without service
                </Button>
              </div>
            ) : (
              <>
                {isFirstVisit && selectedService?.is_first_consultation && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary mb-2">
                    As this is your first visit, the first consultation fee has been pre-selected.
                  </div>
                )}
                {services.map((svc) => {
                  const isSelected = selectedService?.id === svc.id;
                  return (
                    <button
                      key={svc.id}
                      onClick={() => handleSelectService(svc)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
                        <DollarSign className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{svc.service_name}</p>
                          {(svc as any).is_first_consultation && (
                            <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded-full">First Visit</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {svc.currency} {svc.default_price.toFixed(2)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
                <Button variant="ghost" size="sm" onClick={() => { setSelectedService(null); setStep(3); }} className="w-full mt-2">
                  Skip â€” no specific service
                </Button>
              </>
            )}
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === 3 && (
          <div className="space-y-4 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="mb-2">â† Back</Button>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Select Date</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleSelectDate}
                disabled={(date) => isBefore(date, today) || date.getDay() === 0}
                className={cn("p-3 pointer-events-auto rounded-md border")}
              />
            </div>

            {selectedDate && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Available Slots â€” {format(selectedDate, "EEEE, MMM d")}
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {ALL_SLOTS.map((slot) => {
                    const busy = isSlotBusy(slot);
                    const isSelected = selectedSlot?.hour === slot.hour && selectedSlot?.minute === slot.minute;
                    return (
                      <button
                        key={slot.label}
                        disabled={busy}
                        onClick={() => handleSelectSlot(slot)}
                        className={cn(
                          "px-2 py-2 rounded-md text-sm font-medium transition-colors border",
                          busy
                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50 line-through"
                            : isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted/50"
                        )}
                        title={busy ? "This slot is booked" : undefined}
                      >
                        {busy ? "Booked" : slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedSlot && (
              <Button className="w-full" onClick={() => setStep(4)}>
                Continue
              </Button>
            )}
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="space-y-4 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="mb-2">â† Back</Button>

            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{selectedDoctor?.full_name}</span>
                {selectedDoctor?.specialty && (
                  <Badge variant="secondary" className="text-sm">{selectedDoctor.specialty}</Badge>
                )}
              </div>
              {selectedService && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedService.service_name} â€” {selectedService.currency} {selectedService.default_price.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{selectedSlot?.label} ({SLOT_DURATION} min)</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Notes (optional)</label>
              <Textarea
                placeholder="Any additional information for the doctor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Appointment Request
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

