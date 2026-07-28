import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Clock, User, Calendar as CalendarIcon, MapPin, Video, Play, Trash2, Pencil, Link, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AppointmentRequestsPanel } from "@/components/appointments/AppointmentRequestsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePatients } from "@/hooks/usePatients";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePractice } from "@/hooks/usePractice";
import { Label } from "@/components/ui/label";
import { format, startOfMonth, endOfMonth, addMonths, startOfYear, endOfYear, eachMonthOfInterval, parseISO, isSameDay, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday as isTodayFn, startOfToday } from "date-fns";
import {
  formatCalendarMonthDayYear,
  formatCalendarMonthYear,
  formatCalendarShortMonthDay,
  formatCalendarShortMonthYear,
  formatCalendarWeekdayMonthDay,
  formatCalendarWeekRange,
  getCalendarMonthName,
  getCalendarShortWeekdayName,
  getCalendarShortWeekdayNames,
} from "@/lib/localizedDate";

// Generate 15-min time slots from 7:00 AM to 6:00 PM
const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 18; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 18 && m > 0) break;
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const label = `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
    const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    TIME_SLOTS.push(value);
  }
}
function formatTimeSlot(value: string): string {
  const [hStr, mStr] = value.split(':');
  const h = parseInt(hStr);
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hour12}:${mStr} ${ampm}`;
}



interface ServicePriceColor {
  service_name: string;
  color: string | null;
}

type CalendarViewMode = "week" | "month" | "year";

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  day: number;
  type: string;
  patientId?: string;
  notes?: string;
  location?: string;
  ownerId: string;
  ownerName?: string;
  ownerColor?: string;
  practiceId?: string | null;
}

function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

export default function CalendarView() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { patients } = usePatients();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedEvent, setEditedEvent] = useState<CalendarEvent | null>(null);
  const [allEvents, setEvents] = useState<CalendarEvent[]>([]);
  const [eventQuery, setEventQuery] = useState("");
  const [debouncedEventQuery, setDebouncedEventQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedEventQuery(eventQuery.trim().toLowerCase()), 200);
    return () => clearTimeout(id);
  }, [eventQuery]);
  const events = useMemo(() => {
    if (!debouncedEventQuery) return allEvents;
    return allEvents.filter((e) =>
      [e.title, e.type, e.notes, e.location, e.ownerName, patients.find((p) => p.id === e.patientId)?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(debouncedEventQuery),
    );
  }, [allEvents, debouncedEventQuery, patients]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [serviceColors, setServiceColors] = useState<ServicePriceColor[]>([]);
  const [newAppointment, setNewAppointment] = useState({
    patientId: "",
    date: "",
    time: "",
    type: "session",
    notes: "",
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [editDatePickerOpen, setEditDatePickerOpen] = useState(false);
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [editConflicts, setEditConflicts] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [calendarView, setCalendarViewState] = useState<CalendarViewMode>(
    () => (localStorage.getItem("calendar-view") as CalendarViewMode) || "month"
  );
  const setCalendarView = (v: CalendarViewMode) => {
    setCalendarViewState(v);
    localStorage.setItem("calendar-view", v);
  };

  // Practice + scope
  const { practice, members } = usePractice();
  const [scope, setScopeState] = useState<'mine' | 'practice'>(
    () => (localStorage.getItem("calendar-scope") as 'mine' | 'practice') || 'mine'
  );
  const setScope = (s: 'mine' | 'practice') => {
    setScopeState(s);
    localStorage.setItem("calendar-scope", s);
  };
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  // Fall back to "mine" if no practice exists
  useEffect(() => {
    if (scope === 'practice' && !practice) setScopeState('mine');
  }, [practice, scope]);

  const colorByDoctor: Record<string, string> = {};
  members.forEach((m) => {
    colorByDoctor[m.doctor_id] = m.practice_color || '#0EA5E9';
  });
  const nameByDoctor: Record<string, string> = {};
  members.forEach((m) => {
    if (m.full_name) nameByDoctor[m.doctor_id] = m.full_name;
  });
  const initialsOf = (name?: string) =>
    name ? name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) : '';

  // Fetch service price colors
  useEffect(() => {
    const fetchServiceColors = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("service_prices")
        .select("service_name, color")
        .eq("user_id", user.id);
      if (data) setServiceColors(data as ServicePriceColor[]);
    };
    fetchServiceColors();
  }, [user]);

  const getTypeColor = (type: string): string | null => {
    const match = serviceColors.find(sc => sc.service_name.toLowerCase() === type.toLowerCase());
    return match?.color || null;
  };
  const { firstDay, daysInMonth } = getDaysInMonth(selectedDate);

  // Fetch real appointments for the current month
  useEffect(() => {
    const fetchAppointments = async () => {
      setEventsLoading(true);
      try {
        if (!user) return;

        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);

        let query = supabase
          .from('appointments')
          .select('id, title, start_time, type, location, patient_id, description, user_id, practice_id')
          .gte('start_time', monthStart.toISOString())
          .lte('start_time', monthEnd.toISOString())
          .order('start_time', { ascending: true });

        if (scope === 'practice' && practice) {
          query = query.eq('practice_id', practice.id);
          if (selectedDoctorId !== 'all') {
            query = query.eq('user_id', selectedDoctorId);
          }
        } else {
          query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          const mapped: CalendarEvent[] = data.map((apt: any) => ({
            id: apt.id,
            title: apt.title,
            time: format(new Date(apt.start_time), "h:mm a"),
            day: new Date(apt.start_time).getDate(),
            type: apt.type || "session",
            patientId: apt.patient_id || undefined,
            notes: apt.description || undefined,
            location: apt.location || undefined,
            ownerId: apt.user_id,
            ownerName: nameByDoctor[apt.user_id],
            ownerColor: colorByDoctor[apt.user_id] || '#0EA5E9',
            practiceId: apt.practice_id,
          }));
          setEvents(mapped);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchAppointments();
    const onFocus = () => fetchAppointments();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, scope, practice?.id, members.length, user?.id, selectedDoctorId]);

  const currentDate = new Date();
  const monthName = formatCalendarMonthYear(t, selectedDate);

  const prevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1));
  };

  const todayEvents = events.filter((e) => e.day === currentDate.getDate());

  // Convert "10:00 AM" -> "10:00", "2:30 PM" -> "14:30"
  const timeLabelToValue = (label: string): string => {
    const m = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return "";
    let h = parseInt(m[1]);
    const min = m[2];
    const ampm = m[3].toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, "0")}:${min}`;
  };

  // Fetch existing appointments for a patient on a date; returns Set of "HH:MM" blocked slots.
  // Each existing 30-min appointment blocks its own slot + the surrounding 15-min slot.
  const computeBlocked = (dateStr: string, existing: { start: Date }[], ignoreId?: string): Set<string> => {
    const blocked = new Set<string>();
    for (const e of existing) {
      const d = e.start;
      const h = d.getHours();
      const min = d.getMinutes();
      // Block this slot and any slot whose start falls within [start, start+30min)
      for (let offset = -15; offset < 30; offset += 15) {
        const total = h * 60 + min + offset;
        if (total < 0) continue;
        const bh = Math.floor(total / 60);
        const bm = total % 60;
        blocked.add(`${bh.toString().padStart(2, "0")}:${bm.toString().padStart(2, "0")}`);
      }
    }
    return blocked;
  };

  // Conflict detection for the create modal
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!newAppointment.patientId || !newAppointment.date) {
        setConflicts(new Set());
        return;
      }
      const dayStart = new Date(`${newAppointment.date}T00:00:00`).toISOString();
      const dayEnd = new Date(`${newAppointment.date}T23:59:59`).toISOString();
      const { data } = await supabase
        .from("appointments")
        .select("id, start_time")
        .eq("patient_id", newAppointment.patientId)
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd);
      if (cancelled) return;
      const list = (data || []).map((r: any) => ({ start: new Date(r.start_time) }));
      setConflicts(computeBlocked(newAppointment.date, list));
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [newAppointment.patientId, newAppointment.date]);

  // Conflict detection for the edit modal
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!editedEvent || !editedEvent.patientId) {
        setEditConflicts(new Set());
        return;
      }
      const dateStr = format(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth(), editedEvent.day),
        "yyyy-MM-dd"
      );
      const dayStart = new Date(`${dateStr}T00:00:00`).toISOString();
      const dayEnd = new Date(`${dateStr}T23:59:59`).toISOString();
      const { data } = await supabase
        .from("appointments")
        .select("id, start_time")
        .eq("patient_id", editedEvent.patientId)
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd);
      if (cancelled) return;
      const list = (data || [])
        .filter((r: any) => r.id !== editedEvent.id)
        .map((r: any) => ({ start: new Date(r.start_time) }));
      setEditConflicts(computeBlocked(dateStr, list));
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [editedEvent?.patientId, editedEvent?.day, editedEvent?.id, selectedDate]);


  const handleCreateAppointment = async () => {
    if (!newAppointment.patientId || !newAppointment.date || !newAppointment.time) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    if (!user) return;

    // Reject past dates
    const picked = new Date(`${newAppointment.date}T00:00:00`);
    if (picked < startOfToday()) {
      toast({ title: "Invalid date", description: "Cannot schedule appointments in the past", variant: "destructive" });
      return;
    }

    const selectedPatient = patients.find(p => p.id === newAppointment.patientId);

    // Re-check conflicts at submit time
    if (conflicts.has(newAppointment.time)) {
      toast({
        title: "Time conflict",
        description: `${selectedPatient?.name || "Patient"} already has an appointment at ${formatTimeSlot(newAppointment.time)}. Please select a different time.`,
        variant: "destructive",
      });
      return;
    }

    const startISO = new Date(`${newAppointment.date}T${newAppointment.time}:00`).toISOString();
    const endISO = new Date(new Date(startISO).getTime() + 30 * 60000).toISOString();

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        user_id: user.id,
        patient_id: newAppointment.patientId,
        title: selectedPatient?.name || 'Appointment',
        type: newAppointment.type,
        description: newAppointment.notes || null,
        start_time: startISO,
        end_time: endISO,
        practice_id: scope === 'practice' && practice ? practice.id : null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    if (data) {
      const newEvent: CalendarEvent = {
        id: data.id,
        title: data.title,
        time: format(new Date(data.start_time), "h:mm a"),
        day: new Date(data.start_time).getDate(),
        type: data.type || "session",
        patientId: data.patient_id || undefined,
        notes: data.description || undefined,
        location: data.location || undefined,
        ownerId: data.user_id,
        ownerName: nameByDoctor[data.user_id],
        ownerColor: colorByDoctor[data.user_id] || '#0EA5E9',
        practiceId: data.practice_id,
      };
      setEvents(prev => [...prev, newEvent]);
    }

    toast({
      title: "Appointment Created",
      description: `Appointment scheduled for ${selectedPatient?.name} on ${newAppointment.date} at ${newAppointment.time}`,
    });
    setIsDialogOpen(false);
    setNewAppointment({ patientId: "", date: "", time: "", type: "session", notes: "" });
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEditedEvent({ ...event });
    setIsEditMode(false);
    setIsEventDetailOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!editedEvent || !user) return;
    if (editedEvent.ownerId !== user.id) {
      toast({ title: "Read-only", description: "Only the owner can edit this appointment.", variant: "destructive" });
      return;
    }

    // Derive a date string from selectedDate's month + editedEvent.day
    const dateStr = format(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), editedEvent.day),
      "yyyy-MM-dd"
    );
    const picked = new Date(`${dateStr}T00:00:00`);
    if (picked < startOfToday()) {
      toast({ title: "Invalid date", description: "Cannot schedule appointments in the past", variant: "destructive" });
      return;
    }

    const timeValue = timeLabelToValue(editedEvent.time);
    if (timeValue && editConflicts.has(timeValue)) {
      toast({
        title: "Time conflict",
        description: `This patient already has an appointment at ${editedEvent.time}. Please select a different time.`,
        variant: "destructive",
      });
      return;
    }

    const updates: any = {
      title: editedEvent.title,
      type: editedEvent.type,
      location: editedEvent.location || null,
      description: editedEvent.notes || null,
    };
    if (timeValue) {
      const startISO = new Date(`${dateStr}T${timeValue}:00`).toISOString();
      const endISO = new Date(new Date(startISO).getTime() + 30 * 60000).toISOString();
      updates.start_time = startISO;
      updates.end_time = endISO;
    }

    const { error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', editedEvent.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setEvents(prev => prev.map(e => e.id === editedEvent.id ? editedEvent : e));
    setSelectedEvent(editedEvent);
    setIsEditMode(false);
    toast({
      title: "Event Updated",
      description: "The appointment has been updated successfully.",
    });
  };

  const handleCancelEdit = () => {
    setEditedEvent(selectedEvent ? { ...selectedEvent } : null);
    setIsEditMode(false);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !user) return;
    if (selectedEvent.ownerId !== user.id) {
      toast({ title: "Read-only", description: "Only the owner can delete this appointment.", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', selectedEvent.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
    setDeleteConfirmOpen(false);
    setIsEventDetailOpen(false);
    setSelectedEvent(null);
    toast({
      title: "Appointment deleted",
      description: "The appointment has been removed from your calendar.",
    });
  };

  const requestDeleteEvent = () => setDeleteConfirmOpen(true);

  const handleStartSession = () => {
    if (selectedEvent?.patientId) {
      setIsEventDetailOpen(false);
      navigate(`/sessions?patient=${selectedEvent.patientId}`);
    }
  };

  const getEventTypeLabel = (type: string) => {
    // Check service colors first for custom service names
    const match = serviceColors.find(sc => sc.service_name.toLowerCase() === type.toLowerCase());
    if (match) return match.service_name;
    switch (type) {
      case "session": return "Patient Session";
      case "followup": return "Follow-up";
      case "internal": return "Internal Meeting";
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "session": return "bg-primary/10 text-primary";
      case "followup": return "bg-warning/10 text-warning";
      case "internal": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("nav.myCalendar", "Calendar")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("calendar.subtitle")}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {practice && (
            <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
              {(['mine', 'practice'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={cn(
                    "px-2 py-1 text-sm md:px-3 md:py-1.5 md:text-sm font-medium transition-colors shrink-0",
                    scope === s
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  {s === 'mine' ? t('calendar.myCalendar') : t('calendar.practiceCalendar')}
                </button>
              ))}
            </div>
          )}
          <div className="relative w-[200px]">
            <Input
              value={eventQuery}
              onChange={(e) => setEventQuery(e.target.value)}
              placeholder={t("calendar.searchPlaceholder", "Search appointments...")}
              className="h-8 text-xs pr-7"
            />
            {eventQuery && (
              <button
                type="button"
                onClick={() => setEventQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {practice && scope === 'practice' && members.length > 0 && (
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger className="h-8 w-[200px] text-xs">
                <SelectValue placeholder={t("calendar.filterDoctor")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("calendar.allDoctors")}</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.doctor_id} value={m.doctor_id}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: m.practice_color || '#0EA5E9' }}
                      />
                      {m.full_name || 'Doctor'}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("calendar.book")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>
                {scope === 'practice' ? 'Schedule on Practice Calendar' : 'Schedule New Appointment'}
              </DialogTitle>
              <DialogDescription>
                {scope === 'practice'
                  ? 'Create a new appointment on the shared practice calendar'
                  : 'Create a new appointment for a patient'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-foreground">Patient *</label>
                <Select
                  value={newAppointment.patientId}
                  onValueChange={(value) => setNewAppointment({ ...newAppointment, patientId: value })}
                >
                  <SelectTrigger className="min-h-11">
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover max-h-[60vh]">
                    {[...patients]
                      .sort((a, b) => {
                        const surnameA = a.name.split(' ').slice(-1)[0] || '';
                        const surnameB = b.name.split(' ').slice(-1)[0] || '';
                        return surnameA.localeCompare(surnameB);
                      })
                      .map((patient) => {
                        const parts = patient.name.split(' ');
                        const surname = parts.length > 1 ? parts.slice(-1)[0] : parts[0];
                        const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
                        const displayName = firstName ? `${surname}, ${firstName}` : surname;
                        return (
                          <SelectItem key={patient.id} value={patient.id}>
                            {displayName}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Date *</Label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal min-h-11", !newAppointment.date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newAppointment.date ? format(new Date(newAppointment.date + 'T00:00:00'), "MM/dd/yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[100] bg-popover" align="start">
                      <Calendar
                        mode="single"
                        selected={newAppointment.date ? new Date(newAppointment.date + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          if (!date) return;
                          if (date < startOfToday()) {
                            toast({
                              title: "Invalid date",
                              description: "Cannot schedule appointments in the past",
                              variant: "destructive",
                            });
                            return;
                          }
                          setNewAppointment({ ...newAppointment, date: format(date, 'yyyy-MM-dd') });
                          setDatePickerOpen(false);
                        }}
                        disabled={{ before: startOfToday() }}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Time *</Label>
                  <Select
                    value={newAppointment.time}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, time: value })}
                    disabled={!newAppointment.date}
                  >
                    <SelectTrigger className="min-h-11">
                      <SelectValue placeholder={newAppointment.date ? "Select time" : "Pick a date first"} />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-popover max-h-[60vh]">
                      {TIME_SLOTS.map((slot) => {
                        const isBlocked = conflicts.has(slot);
                        return (
                          <SelectItem key={slot} value={slot} disabled={isBlocked}>
                            {formatTimeSlot(slot)}{isBlocked ? " — booked" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
               <div>
                <Label>Type</Label>
                <Select
                  value={newAppointment.type}
                  onValueChange={(value) => setNewAppointment({ ...newAppointment, type: value })}
                >
                  <SelectTrigger className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover">
                    {serviceColors.length > 0 ? (
                      serviceColors.map((sc) => (
                        <SelectItem key={sc.service_name} value={sc.service_name}>{sc.service_name}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="session">Session</SelectItem>
                        <SelectItem value="followup">Follow-up</SelectItem>
                        <SelectItem value="internal">Internal Meeting</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Notes</label>
                <Input
                  placeholder="Optional notes..."
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateAppointment} className="w-full min-h-11">
                Create Appointment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {(["week", "month", "year"] as CalendarViewMode[]).map((view) => (
            <button
              key={view}
              onClick={() => setCalendarView(view)}
              className={cn(
                "px-2 py-1 text-sm md:px-3 md:py-1.5 md:text-sm font-medium transition-colors capitalize shrink-0",
                calendarView === view
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              {t(`calendar.${view}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Appointment Requests from Patients */}
      <AppointmentRequestsPanel />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-xl border border-primary bg-card p-6 shadow-sm">
          {calendarView === "week" && (() => {
            const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
            const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
            return (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">{formatCalendarWeekRange(t, weekStart, weekEnd)}</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>{t("calendar.today")}</Button>
                    <Button variant="outline" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const dayNum = day.getDate();
                    const dayEvents = events.filter((e) => e.day === dayNum && day.getMonth() === selectedDate.getMonth());
                    const today = isTodayFn(day);
                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "flex flex-col items-center p-3 rounded-lg transition-colors cursor-pointer min-h-[100px]",
                          isSameDay(day, selectedDate) ? "bg-primary text-primary-foreground" : today ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                      >
                        <span className="text-xs font-medium">{getCalendarShortWeekdayName(t, day)}</span>
                        <span className="text-lg font-semibold">{format(day, "d")}</span>
                        {dayEvents.length > 0 && (
                          <div className="mt-2 space-y-1 w-full">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div key={event.id} className="text-xs truncate text-center opacity-80">
                                {event.time} {(() => { const p = patients.find(pt => pt.id === event.patientId); if (!p) return ''; const parts = p.name.split(' '); return parts.map(w => w[0]).join('').toUpperCase(); })()}
                              </div>
                            ))}
                            {dayEvents.length > 2 && <div className="text-xs text-center opacity-60">+{dayEvents.length - 2}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {calendarView === "month" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">{monthName}</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {getCalendarShortWeekdayNames(t).map((day) => (
                  <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square p-2" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isToday = day === currentDate.getDate() && 
                    selectedDate.getMonth() === currentDate.getMonth() &&
                    selectedDate.getFullYear() === currentDate.getFullYear();
                  const dayEvents = events.filter((e) => e.day === day);

                  return (
                    <div
                      key={day}
                      className={cn(
                        "aspect-square p-1 rounded-lg transition-colors",
                        isToday && "bg-primary/10"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                          isToday && "bg-primary text-primary-foreground font-semibold"
                        )}
                      >
                        {day}
                      </div>
                      {dayEvents.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 2).map((event) => {
                            const patientName = event.patientId
                              ? patients.find(p => p.id === event.patientId)?.name
                              : null;
                            const initials = patientName
                              ? patientName.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2)
                              : null;
                            const isPracticeScope = scope === 'practice';
                            const tileColor = isPracticeScope
                              ? (event.ownerColor || '#0EA5E9')
                              : getTypeColor(event.type);
                            const ownerInitials = isPracticeScope ? initialsOf(event.ownerName) : '';
                            return (
                              <div
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                                style={{
                                  backgroundColor: tileColor ? `${tileColor}22` : undefined,
                                  color: tileColor || undefined,
                                }}
                              >
                                {isPracticeScope && ownerInitials ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex h-4 px-1 items-center justify-center rounded text-xs font-bold text-white shrink-0" style={{ backgroundColor: event.ownerColor || '#0EA5E9' }}>
                                          {ownerInitials}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>{event.ownerName || 'Doctor'}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : null}
                                {initials ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white shrink-0" style={{ backgroundColor: tileColor || 'hsl(350, 78%, 55%)' }}>
                                          {initials}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>{patientName}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : null}
                                <span className="truncate">{event.time}</span>
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-muted-foreground pl-1">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {calendarView === "year" && (() => {
            const yearStart = startOfYear(selectedDate);
            const yearEnd = endOfYear(selectedDate);
            const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
            return (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">{selectedDate.getFullYear()}</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => setSelectedDate(new Date(selectedDate.getFullYear() - 1, selectedDate.getMonth()))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>This Year</Button>
                    <Button variant="outline" size="icon" onClick={() => setSelectedDate(new Date(selectedDate.getFullYear() + 1, selectedDate.getMonth()))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {months.map((month) => {
                    const mStart = startOfMonth(month);
                    const mEnd = endOfMonth(month);
                    // Count events in this month
                    const monthEvents = events.filter((e) => {
                      const eventDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), e.day);
                      return month.getMonth() === selectedDate.getMonth() ? true : false;
                    });
                    // Better: check appointments fetched for the month range
                    const isCurrent = month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear();
                    return (
                      <button
                        key={month.toISOString()}
                        onClick={() => { setSelectedDate(month); setCalendarView("month"); }}
                        className={cn(
                          "rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted/50",
                          isCurrent && "border-primary bg-primary/5"
                        )}
                      >
                        <p className={cn("text-sm font-semibold", isCurrent && "text-primary")}>{getCalendarMonthName(t, month)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isCurrent ? "Current month" : formatCalendarShortMonthYear(t, month)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>

        {/* Today's Schedule */}
        <div className="rounded-xl border border-primary bg-card shadow-sm">
          <div className="rounded-t-xl bg-primary p-5">
            <h3 className="text-lg font-semibold text-primary-foreground">{t("calendar.todaysSchedule")}</h3>
            <p className="text-sm text-primary-foreground/80">
              {formatCalendarWeekdayMonthDay(t, currentDate)}
            </p>
          </div>
          <div className="divide-y divide-border">
            {todayEvents.length > 0 ? (
              todayEvents.map((event) => {
                const patientName = event.patientId
                  ? patients.find(p => p.id === event.patientId)?.name
                  : null;
                const initials = patientName
                  ? patientName.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2)
                  : null;
                return (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  {initials ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shrink-0" style={{ backgroundColor: getTypeColor(event.type) || 'hsl(350, 78%, 55%)' }}>
                            {initials}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{patientName}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                      <Clock className="h-5 w-5 text-accent-foreground" />
                    </div>
                  )}
                  {scope === 'practice' && event.ownerColor ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-5 px-1.5 items-center justify-center rounded text-xs font-bold text-white shrink-0" style={{ backgroundColor: event.ownerColor }}>
                            {initialsOf(event.ownerName)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{event.ownerName || 'Doctor'}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.time}</p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: getTypeColor(event.type) ? `${getTypeColor(event.type)}1A` : undefined,
                      color: getTypeColor(event.type) || undefined,
                    }}
                  >
                    {getEventTypeLabel(event.type)}
                  </span>
                </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                {t("calendar.noAppointmentsToday")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={isEventDetailOpen} onOpenChange={(open) => {
        setIsEventDetailOpen(open);
        if (!open) setIsEditMode(false);
      }}>
        <DialogContent className="bg-card max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          {selectedEvent && editedEvent && (
            <>
              {isEditMode ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Edit Appointment</DialogTitle>
                    <DialogDescription>Modify the appointment details</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Title</label>
                      <Input
                        value={editedEvent.title}
                        onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-foreground">Time</label>
                        <Select
                          value={timeLabelToValue(editedEvent.time)}
                          onValueChange={(value) => setEditedEvent({ ...editedEvent, time: formatTimeSlot(value) })}
                        >
                          <SelectTrigger className="min-h-11">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent className="z-[100] bg-popover max-h-[60vh]">
                            {TIME_SLOTS.map((slot) => {
                              const isBlocked = editConflicts.has(slot);
                              return (
                                <SelectItem key={slot} value={slot} disabled={isBlocked}>
                                  {formatTimeSlot(slot)}{isBlocked ? " — booked" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Day</label>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          value={editedEvent.day}
                          onChange={(e) => setEditedEvent({ ...editedEvent, day: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Type</label>
                      <Select
                        value={editedEvent.type}
                        onValueChange={(value: string) => setEditedEvent({ ...editedEvent, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceColors.length > 0 ? (
                            serviceColors.map((sc) => (
                              <SelectItem key={sc.service_name} value={sc.service_name}>{sc.service_name}</SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="session">Session</SelectItem>
                              <SelectItem value="followup">Follow-up</SelectItem>
                              <SelectItem value="internal">Internal Meeting</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Location</label>
                      <Select
                        value={editedEvent.location || ""}
                        onValueChange={(value) => setEditedEvent({ ...editedEvent, location: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Video Call">Video Call</SelectItem>
                          <SelectItem value="In Person">In Person</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Notes</label>
                      <Input
                        value={editedEvent.notes || ""}
                        onChange={(e) => setEditedEvent({ ...editedEvent, notes: e.target.value })}
                        placeholder="Optional notes..."
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button className="flex-1" onClick={handleSaveEvent}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>{getEventTypeLabel(selectedEvent.type)}</DialogTitle>
                    <DialogDescription className="space-y-1">
                      {selectedEvent.patientId && (() => {
                        const patient = patients.find(p => p.id === selectedEvent.patientId);
                        return patient ? (
                          <button
                            onClick={() => {
                              setIsEventDetailOpen(false);
                              navigate(`/patients/${selectedEvent.patientId}`);
                            }}
                            className="text-primary hover:underline font-medium block"
                          >
                            {patient.name}
                          </button>
                        ) : null;
                      })()}
                      <span className="block text-muted-foreground text-xs">
                        {formatCalendarMonthDayYear(t, new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedEvent.day))} · {selectedEvent.time}
                      </span>
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3 pt-2">
                    {selectedEvent.location && (
                      <div className="flex items-center gap-3 text-sm">
                        {selectedEvent.location === "Video Call" ? (
                          <Video className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-foreground">{selectedEvent.location}</span>
                      </div>
                    )}

                    {selectedEvent.notes && (
                      <div className="rounded-lg bg-muted/30 p-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Notes</p>
                        <p className="text-sm text-foreground">{selectedEvent.notes}</p>
                      </div>
                    )}

                    {(() => {
                      const isOwner = !!user && selectedEvent.ownerId === user.id;
                      if (!isOwner) {
                        return (
                          <div className="pt-4">
                            <p className="text-sm text-muted-foreground italic">
                              Owned by {selectedEvent.ownerName ? `Dr ${selectedEvent.ownerName}` : 'another doctor'} — only they can change this.
                            </p>
                            {selectedEvent.type !== "internal" && selectedEvent.patientId && (
                              <Button className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleStartSession}>
                                <Play className="h-3.5 w-3.5 mr-1" />
                                Start Session
                              </Button>
                            )}
                          </div>
                        );
                      }
                      return (
                        <>
                          {/* Mobile: icon-only buttons */}
                          <div className="flex md:hidden gap-3 justify-center pt-4">
                            <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setIsEditMode(true)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="icon" className="h-11 w-11" onClick={requestDeleteEvent}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {selectedEvent.type !== "internal" && selectedEvent.patientId && (
                              <Button size="icon" className="h-11 w-11 bg-green-600 hover:bg-green-700 text-white" onClick={handleStartSession}>
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {/* Desktop: full text buttons */}
                          <div className="hidden md:grid grid-cols-3 gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsEditMode(true)}>
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button variant="destructive" onClick={requestDeleteEvent}>
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                            {selectedEvent.type !== "internal" && selectedEvent.patientId && (
                              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleStartSession}>
                                <Play className="h-3.5 w-3.5 mr-1" />
                                Start Session
                              </Button>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedEvent
                ? `Are you sure you want to delete this appointment with ${selectedEvent.title} on ${formatCalendarMonthDayYear(t, new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedEvent.day))} at ${selectedEvent.time}? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}