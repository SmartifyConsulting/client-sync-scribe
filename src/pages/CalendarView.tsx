import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Clock, User, Calendar, MapPin, Video, Play, Trash2, Link, Unlink, Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { usePatients } from "@/hooks/usePatients";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const currentDate = new Date();

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  day: number;
  type: "session" | "internal" | "followup";
  patientId?: string;
  notes?: string;
  location?: string;
}

const mockEvents: CalendarEvent[] = [
  { id: "1", title: "Sarah Johnson", time: "9:00 AM", day: 3, type: "session", patientId: "1", location: "Video Call" },
  { id: "2", title: "Michael Chen", time: "10:30 AM", day: 3, type: "session", patientId: "2", location: "In Person" },
  { id: "3", title: "Team Meeting", time: "2:00 PM", day: 3, type: "internal", notes: "Weekly team sync" },
  { id: "4", title: "Emma Williams", time: "4:00 PM", day: 4, type: "session", patientId: "3", location: "Video Call" },
  { id: "5", title: "Follow-up: David Brown", time: "11:00 AM", day: 5, type: "followup", patientId: "4", notes: "Review progress" },
  { id: "6", title: "Lisa Anderson", time: "9:30 AM", day: 6, type: "session", patientId: "5", location: "In Person" },
];

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
  const { patients } = usePatients();
  const { isConnected, isConnecting, connect, disconnect, loading: calendarLoading } = useGoogleCalendar();
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedEvent, setEditedEvent] = useState<CalendarEvent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(mockEvents);
  const [newAppointment, setNewAppointment] = useState({
    patientId: "",
    date: "",
    time: "",
    type: "session",
    notes: "",
  });
  const { firstDay, daysInMonth } = getDaysInMonth(selectedDate);

  const monthName = selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1));
  };

  const todayEvents = events.filter((e) => e.day === currentDate.getDate());

  const handleCreateAppointment = () => {
    if (!newAppointment.patientId || !newAppointment.date || !newAppointment.time) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const selectedPatient = patients.find(p => p.id === newAppointment.patientId);
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

  const handleSaveEvent = () => {
    if (!editedEvent) return;
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

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
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
    switch (type) {
      case "session": return "Patient Session";
      case "followup": return "Follow-up";
      case "internal": return "Internal Meeting";
      default: return type;
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
          <p className="mt-1 text-muted-foreground">
            Manage your appointments and schedule
          </p>
        </div>
        <div className="flex gap-2">
          {!calendarLoading && (
            isConnected ? (
              <Button variant="outline" onClick={disconnect} className="gap-2">
                <Unlink className="h-4 w-4" />
                Disconnect Google
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={connect} 
                disabled={isConnecting}
                className="gap-2"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link className="h-4 w-4" />
                )}
                {isConnecting ? "Connecting..." : "Connect Google Calendar"}
              </Button>
            )
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
              <DialogDescription>Create a new appointment for a patient</DialogDescription>
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
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Date *</label>
                  <Input
                    type="date"
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Time *</label>
                  <Input
                    type="time"
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Type</label>
                <Select
                  value={newAppointment.type}
                  onValueChange={(value) => setNewAppointment({ ...newAppointment, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="session">Session</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="internal">Internal Meeting</SelectItem>
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
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
          {/* Month Navigation */}
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

          {/* Days of Week */}
          <div className="grid grid-cols-7 mb-2">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
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
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          onClick={() => handleEventClick(event)}
                          className={cn(
                            "truncate rounded px-1 py-0.5 text-xs cursor-pointer hover:opacity-80 transition-opacity",
                            event.type === "session" && "bg-primary/20 text-primary",
                            event.type === "internal" && "bg-muted text-muted-foreground",
                            event.type === "followup" && "bg-warning/20 text-warning"
                          )}
                        >
                          {event.time}
                        </div>
                      ))}
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
        </div>

        {/* Today's Schedule */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <h3 className="text-lg font-semibold text-foreground">Today's Schedule</h3>
            <p className="text-sm text-muted-foreground">
              {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="divide-y divide-border">
            {todayEvents.length > 0 ? (
              todayEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    {event.type === "session" ? (
                      <User className="h-5 w-5 text-accent-foreground" />
                    ) : (
                      <Clock className="h-5 w-5 text-accent-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.time}</p>
                  </div>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    getEventTypeColor(event.type)
                  )}>
                    {event.type}
                  </span>
                </div>
              ))
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Appointment" : selectedEvent?.title}</DialogTitle>
            <DialogDescription>{isEditMode ? "Modify the appointment details" : getEventTypeLabel(selectedEvent?.type || "")}</DialogDescription>
          </DialogHeader>
          {selectedEvent && editedEvent && (
            <div className="space-y-4 pt-4">
              {isEditMode ? (
                <>
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
                      onValueChange={(value: "session" | "internal" | "followup") => setEditedEvent({ ...editedEvent, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="session">Session</SelectItem>
                        <SelectItem value="followup">Follow-up</SelectItem>
                        <SelectItem value="internal">Internal Meeting</SelectItem>
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
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedEvent.time}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {selectedDate.toLocaleDateString("en-US", { month: "long" })} {selectedEvent.day}, {selectedDate.getFullYear()}
                    </span>
                  </div>

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

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setIsEditMode(true)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="icon" onClick={handleDeleteEvent}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {selectedEvent.type !== "internal" && selectedEvent.patientId && (
                      <>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => {
                            setIsEventDetailOpen(false);
                            navigate(`/patients/${selectedEvent.patientId}`);
                          }}
                        >
                          <User className="h-4 w-4 mr-2" />
                          View Patient
                        </Button>
                        <Button className="flex-1" onClick={handleStartSession}>
                          <Play className="h-4 w-4 mr-2" />
                          Start Session
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}