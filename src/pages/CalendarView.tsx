import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Clock, User, Calendar as CalendarIcon, MapPin, Video, Play, Trash2, Pencil, Link, Unlink, Loader2, X } from "lucide-react";
import googleCalLogo from "@/assets/google-calendar-logo.png";
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
import { useToast } from "@/hooks/use-toast";
import { usePatients } from "@/hooks/usePatients";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePractice } from "@/hooks/usePractice";
import { Label } from "@/components/ui/label";
import { format, startOfMonth, endOfMonth, addMonths, startOfYear, endOfYear, eachMonthOfInterval, parseISO, isSameDay, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday as isTodayFn } from "date-fns";

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

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { patients } = usePatients();
  const { isConnected, isConnecting, connect, disconnect, loading: calendarLoading } = useGoogleCalendar();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedEvent, setEditedEvent] = useState<CalendarEvent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [serviceColors, setServiceColors] = useState<ServicePriceColor[]>([]);
  const [newAppointment, setNewAppointment] = useState({
    patientId: "",
    date: "",
    time: "",
    type: "session",
    notes: "",
  });
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
  }, [selectedDate, scope, practice?.id, members.length, user?.id]);

  const currentDate = new Date();
  const monthName = selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1));
  };

  const todayEvents = events.filter((e) => e.day === currentDate.getDate());

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

    const selectedPatient = patients.find(p => p.id === newAppointment.patientId);
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
    const { error } = await supabase
      .from('appointments')
      .update({
        title: editedEvent.title,
        type: editedEvent.type,
        location: editedEvent.location || null,
        description: editedEvent.notes || null,
      })
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
    setIsEventDetailOpen(false);
    setSelectedEvent(null);
    toast({
      title: "Event Deleted",
      description: "The appointment has been removed from your calendar.",
    });
  };

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
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground text-[12px]">
            Manage your appointments and schedule
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
                    "px-2 py-1 text-[11px] md:px-3 md:py-1.5 md:text-sm font-medium transition-colors shrink-0",
                    scope === s
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  {s === 'mine' ? 'My Calendar' : 'Practice Calendar'}
                </button>
              ))}
            </div>
          )}
          {!calendarLoading && (
            isConnected ? (
              <div className="flex flex-col items-end">
                <Button variant="outline" onClick={disconnect} className="gap-2">
                  <Unlink className="h-4 w-4" />
                  Disconnect Google
                </Button>
                <p className="text-[10px] text-muted-foreground max-w-[200px] mt-1 text-right">
                  Google sync mirrors only your own appointments.
                </p>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                onClick={connect} 
                disabled={isConnecting}
                className="gap-2 h-10 px-2"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <img src={googleCalLogo} alt="Google Calendar" className="h-10 w-auto" />
                )}
              </Button>
            )
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Book
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newAppointment.date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newAppointment.date ? format(new Date(newAppointment.date + 'T00:00:00'), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newAppointment.date ? new Date(newAppointment.date + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) setNewAppointment({ ...newAppointment, date: format(date, 'yyyy-MM-dd') });
                        }}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Time *</Label>
                  <Select value={newAppointment.time} onValueChange={(value) => setNewAppointment({ ...newAppointment, time: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot} value={slot}>{formatTimeSlot(slot)}</SelectItem>
                      ))}
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
                <label className="text-sm font-medium text-foreground">Notes</label>
                <Input
                  placeholder="Optional notes..."
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateAppointment} className="w-full">
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
                "px-2 py-1 text-[11px] md:px-3 md:py-1.5 md:text-sm font-medium transition-colors capitalize shrink-0",
                calendarView === view
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              {view}
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
                  <h2 className="text-xl font-semibold text-foreground">{format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>Today</Button>
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
                        <span className="text-xs font-medium">{format(day, "EEE")}</span>
                        <span className="text-lg font-semibold">{format(day, "d")}</span>
                        {dayEvents.length > 0 && (
                          <div className="mt-2 space-y-1 w-full">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div key={event.id} className="text-[10px] truncate text-center opacity-80">
                                {event.time} {(() => { const p = patients.find(pt => pt.id === event.patientId); if (!p) return ''; const parts = p.name.split(' '); return parts.map(w => w[0]).join('').toUpperCase(); })()}
                              </div>
                            ))}
                            {dayEvents.length > 2 && <div className="text-[10px] text-center opacity-60">+{dayEvents.length - 2}</div>}
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
                {daysOfWeek.map((day) => (
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
                                        <span className="inline-flex h-4 px-1 items-center justify-center rounded text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: event.ownerColor || '#0EA5E9' }}>
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
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: tileColor || 'hsl(350, 78%, 55%)' }}>
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
                        <p className={cn("text-sm font-semibold", isCurrent && "text-primary")}>{format(month, "MMMM")}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isCurrent ? "Current month" : format(month, "MMM yyyy")}
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
            <h3 className="text-lg font-semibold text-primary-foreground">Today's Schedule</h3>
            <p className="text-sm text-primary-foreground/80">
              {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
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
                          <span className="inline-flex h-5 px-1.5 items-center justify-center rounded text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: event.ownerColor }}>
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
                No appointments scheduled for today
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
        <DialogContent className="bg-card">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground">Time</label>
                        <Input
                          value={editedEvent.time}
                          onChange={(e) => setEditedEvent({ ...editedEvent, time: e.target.value })}
                          placeholder="e.g., 9:00 AM"
                        />
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
                        {selectedDate.toLocaleDateString("en-US", { month: "long" })} {selectedEvent.day}, {selectedDate.getFullYear()} · {selectedEvent.time}
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
                            <p className="text-[11px] text-muted-foreground italic">
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
                            <Button variant="destructive" size="icon" className="h-11 w-11" onClick={handleDeleteEvent}>
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
                            <Button variant="destructive" onClick={handleDeleteEvent}>
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
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}