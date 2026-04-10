import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, MapPin, Loader2, Plus, User, DollarSign, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addDays, addMonths, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear, getDaysInMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { BookAppointmentDialog } from "@/components/appointments/BookAppointmentDialog";
import { PatientRequestsBadge } from "@/components/appointments/PatientRequestsBadge";

interface Appointment {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  description: string | null;
  type: string;
  user_id: string;
  doctor_name?: string;
  service_name?: string;
  service_price?: number;
}

type CalendarViewMode = "week" | "month" | "year";

export default function PatientCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("month");

  useEffect(() => {
    if (user) fetchAppointments();
  }, [user]);

  const fetchAppointments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("start_time", { ascending: true });
      if (error) throw error;

      const apts = data || [];

      // Fetch doctor names for all unique user_ids
      const doctorIds = [...new Set(apts.map((a) => a.user_id))];
      const doctorMap: Record<string, string> = {};
      if (doctorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", doctorIds);
        for (const p of profiles || []) {
          if (p.full_name) doctorMap[p.id] = p.full_name;
        }
      }

      // Fetch matching appointment requests for service info
      const { data: requests } = await supabase
        .from("appointment_requests")
        .select("requested_start, service_id, doctor_id, status")
        .eq("patient_user_id", user.id)
        .eq("status", "accepted");

      // Fetch service prices for those requests
      const serviceIds = [...new Set((requests || []).filter(r => r.service_id).map(r => r.service_id!))];
      const serviceMap: Record<string, { name: string; price: number }> = {};
      if (serviceIds.length > 0) {
        const { data: services } = await supabase
          .from("service_prices")
          .select("id, service_name, default_price")
          .in("id", serviceIds);
        for (const s of services || []) {
          serviceMap[s.id] = { name: s.service_name, price: s.default_price };
        }
      }

      // Enrich appointments
      const enriched = apts.map((apt) => {
        const matchingReq = (requests || []).find(
          (r) => r.doctor_id === apt.user_id && r.requested_start === apt.start_time
        );
        const service = matchingReq?.service_id ? serviceMap[matchingReq.service_id] : undefined;
        return {
          ...apt,
          doctor_name: doctorMap[apt.user_id] || undefined,
          service_name: service?.name,
          service_price: service?.price,
        };
      });

      setAppointments(enriched);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  const selectedDayAppointments = appointments.filter((apt) =>
    isSameDay(parseISO(apt.start_time), selectedDate)
  );

  const upcomingAppointments = appointments
    .filter((apt) => parseISO(apt.start_time) >= new Date())
    .slice(0, 5);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const AppointmentCard = ({ apt }: { apt: Appointment }) => (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-border">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <CalendarIcon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <p className="font-medium">{apt.title}</p>
        {apt.doctor_name && (
          <p className="text-sm text-primary font-medium flex items-center gap-1 mt-0.5">
            <User className="h-3 w-3" />
            with Dr. {apt.doctor_name}
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(parseISO(apt.start_time), "h:mm a")} - {format(parseISO(apt.end_time), "h:mm a")}
          </span>
          {apt.location && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{apt.location}</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {apt.service_name && (
            <Badge variant="secondary" className="text-xs">{apt.service_name}</Badge>
          )}
          {apt.service_price != null && apt.service_price > 0 && (
            <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0">
              <DollarSign className="h-3 w-3 mr-0.5" />
              {formatCurrency(apt.service_price)}
            </Badge>
          )}
        </div>
        {apt.description && <p className="mt-2 text-sm text-muted-foreground">{apt.description}</p>}
      </div>
    </div>
  );

  // Month view helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const firstDayOfMonth = monthStart.getDay();
  const daysInCurrentMonth = getDaysInMonth(currentMonth);

  // Year view helpers
  const yearStart = startOfYear(currentMonth);
  const yearEnd = endOfYear(currentMonth);
  const monthsInYear = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const ViewToggle = () => (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {(["week", "month", "year"] as CalendarViewMode[]).map((view) => (
        <button
          key={view}
          onClick={() => setCalendarView(view)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium transition-colors capitalize",
            calendarView === view
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground"
          )}
        >
          {view}
        </button>
      ))}
    </div>
  );

  const renderWeekView = () => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {format(currentWeekStart, "MMMM yyyy")}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>Next</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayAppointments = appointments.filter((apt) => isSameDay(parseISO(apt.start_time), day));
            const isSelected = isSameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center p-3 rounded-lg transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : isToday(day) ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <span className="text-xs font-medium">{format(day, "EEE")}</span>
                <span className="text-lg font-semibold">{format(day, "d")}</span>
                {dayAppointments.length > 0 && (
                  <div className={cn("mt-1 h-1.5 w-1.5 rounded-full", isSelected ? "bg-primary-foreground" : "bg-primary")} />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderMonthView = () => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy")}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>Next</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 mb-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2 text-center text-sm font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: (firstDayOfMonth + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square p-1" />
          ))}
          {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
            const day = i + 1;
            const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dayApts = appointments.filter((apt) => isSameDay(parseISO(apt.start_time), dayDate));
            const isTodayDay = isToday(dayDate);
            const isSelected = isSameDay(dayDate, selectedDate);
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dayDate)}
                className={cn(
                  "aspect-square p-1 rounded-lg transition-colors flex flex-col items-center justify-start",
                  isSelected ? "bg-primary/20 ring-1 ring-primary" : isTodayDay ? "bg-primary/10" : "hover:bg-muted"
                )}
              >
                <span className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                  isTodayDay && "bg-primary text-primary-foreground font-semibold"
                )}>
                  {day}
                </span>
                {dayApts.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayApts.slice(0, 3).map((_, idx) => (
                      <div key={idx} className="h-1 w-1 rounded-full bg-primary" />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderYearView = () => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{format(currentMonth, "yyyy")}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 12))}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>This Year</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 12))}>Next</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {monthsInYear.map((month) => {
            const mStart = startOfMonth(month);
            const mEnd = endOfMonth(month);
            const monthApts = appointments.filter((apt) => {
              const d = parseISO(apt.start_time);
              return d >= mStart && d <= mEnd;
            });
            const isCurrent = month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear();
            return (
              <button
                key={month.toISOString()}
                onClick={() => { setCurrentMonth(month); setCalendarView("month"); }}
                className={cn(
                  "rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted/50",
                  isCurrent && "border-primary bg-primary/5"
                )}
              >
                <p className={cn("text-sm font-semibold", isCurrent && "text-primary")}>{format(month, "MMMM")}</p>
                {monthApts.length > 0 ? (
                  <p className="text-xs text-primary mt-1">{monthApts.length} appointment{monthApts.length !== 1 ? "s" : ""}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">No appointments</p>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Calendar</h1>
            <p className="text-muted-foreground text-[12px]">View and manage your appointments</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle />
          <Button onClick={() => setBookDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Book Appointment
          </Button>
        </div>
      </div>

      <PatientRequestsBadge />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {calendarView === "week" && renderWeekView()}
          {calendarView === "month" && renderMonthView()}
          {calendarView === "year" && renderYearView()}

          {calendarView !== "year" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{format(selectedDate, "EEEE, MMMM d")}</CardTitle>
                <CardDescription>{selectedDayAppointments.length} appointment(s)</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDayAppointments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No appointments scheduled for this day</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayAppointments.map((apt) => (
                      <AppointmentCard key={apt.id} apt={apt} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upcoming Appointments Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
            <CardDescription>Your next scheduled visits</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No upcoming appointments</p>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="p-3 rounded-xl bg-muted/50 space-y-2">
                    <p className="font-medium text-sm">{apt.title}</p>
                    {apt.doctor_name && (
                      <p className="text-xs text-primary font-medium flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Dr. {apt.doctor_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      {format(parseISO(apt.start_time), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(apt.start_time), "h:mm a")}
                    </div>
                    {apt.location && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {apt.location}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {apt.service_name && (
                        <Badge variant="secondary" className="text-[10px]">{apt.service_name}</Badge>
                      )}
                      {apt.service_price != null && apt.service_price > 0 && (
                        <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0">
                          {formatCurrency(apt.service_price)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BookAppointmentDialog open={bookDialogOpen} onOpenChange={setBookDialogOpen} onBooked={fetchAppointments} />
    </div>
  );
}
