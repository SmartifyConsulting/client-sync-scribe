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
import { useTranslation } from "react-i18next";
import {
  formatCalendarMonthYear,
  formatCalendarShortMonthDay,
  formatCalendarWeekdayMonthDay,
  getCalendarMonthName,
  getCalendarShortWeekdayName,
  getCalendarShortWeekdayNames,
} from "@/lib/localizedDate";

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
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [allAppointments, setAppointments] = useState<Appointment[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 200);
    return () => clearTimeout(id);
  }, [query]);
  const appointments = useMemo(() => {
    if (!debouncedQuery) return allAppointments;
    return allAppointments.filter((a) =>
      [a.title, a.type, a.location, a.description, a.doctor_name, a.service_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(debouncedQuery),
    );
  }, [allAppointments, debouncedQuery]);
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
    <div className="flex items-start gap-2 md:gap-4 p-2 md:p-4 rounded-xl border border-border">
      <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
        <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{apt.title}</p>
        {apt.doctor_name && (
          <p className="text-xs text-primary font-medium flex items-center gap-1 mt-0.5">
            <User className="h-4 w-4" />
            with Dr. {apt.doctor_name}
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {format(parseISO(apt.start_time), "h:mm a")} - {format(parseISO(apt.end_time), "h:mm a")}
          </span>
          {apt.location && (
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{apt.location}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {apt.service_name && (
            <Badge variant="secondary" className="text-xs">{apt.service_name}</Badge>
          )}
          {apt.service_price != null && apt.service_price > 0 && (
            <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0">
              <DollarSign className="h-4 w-4 mr-0.5" />
              {formatCurrency(apt.service_price)}
            </Badge>
          )}
        </div>
        {apt.description && <p className="mt-1 text-xs text-muted-foreground truncate">{apt.description}</p>}
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
          {t(`calendar.${view}`, view)}
        </button>
      ))}
    </div>
  );

  const renderWeekView = () => (
    <Card>
      <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg">
            {formatCalendarMonthYear(t, currentWeekStart)}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="text-xs px-1.5 md:px-2" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>{t("calendar.previous", "Previous")}</Button>
            <Button variant="outline" size="sm" className="text-xs px-1.5 md:px-2" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>{t("calendar.today", "Today")}</Button>
            <Button variant="outline" size="sm" className="text-xs px-1.5 md:px-2" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>{t("calendar.next", "Next")}</Button>
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
                  "flex flex-col items-center p-2 md:p-3 rounded-lg transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : isToday(day) ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <span className="text-xs md:text-xs font-bold">{getCalendarShortWeekdayName(t, day)}</span>
                <span className="text-base md:text-lg font-semibold">{format(day, "d")}</span>
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
      <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
        <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">{formatCalendarMonthYear(t, currentMonth)}</CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="text-xs px-1.5 md:px-2" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>{t("calendar.previous", "Previous")}</Button>
            <Button variant="outline" size="sm" className="text-xs px-1.5 md:px-2" onClick={() => setCurrentMonth(new Date())}>{t("calendar.today", "Today")}</Button>
            <Button variant="outline" size="sm" className="text-xs px-1.5 md:px-2" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>{t("calendar.next", "Next")}</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 mb-1 md:mb-2">
          {getCalendarShortWeekdayNames(t, true).map((d) => (
            <div key={d} className="py-1 md:py-2 text-center text-xs md:text-sm font-bold text-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0 md:gap-1">
          {Array.from({ length: (firstDayOfMonth + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-[1/0.85] md:aspect-square p-0.5 md:p-1" />
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
                  "aspect-[1/0.85] md:aspect-square p-0.5 md:p-1 rounded-lg transition-colors flex flex-col items-center justify-start",
                  isSelected ? "bg-primary/20 ring-1 ring-primary" : isTodayDay ? "bg-primary/10" : "hover:bg-muted"
                )}
              >
                <span className={cn(
                  "flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full text-xs md:text-sm",
                  isTodayDay && "bg-success text-white font-semibold"
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
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 12))}>{t("calendar.previous", "Previous")}</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>{t("calendar.year", "Year")}</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 12))}>{t("calendar.next", "Next")}</Button>
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
                <p className={cn("text-sm font-semibold", isCurrent && "text-primary")}>{getCalendarMonthName(t, month)}</p>
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
    <div className="space-y-3 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Calendar</h1>
          <p className="text-muted-foreground text-xs">View and manage your appointments</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ViewToggle />
          <Button onClick={() => setBookDialogOpen(true)} size="sm" className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Book
          </Button>
        </div>
      </div>

      <PatientRequestsBadge />

      {/* Upcoming Appointments - compact at top */}
      {upcomingAppointments.length > 0 && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-1 pt-2 px-3">
            <CardTitle className="text-xs">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {upcomingAppointments.slice(0, 5).map((apt) => (
                <div key={apt.id} className="p-2 rounded-lg bg-card border border-border/50 min-w-[140px] shrink-0 space-y-0.5">
                  {apt.doctor_name ? (
                    <p className="text-xs text-primary font-semibold truncate">Dr. {apt.doctor_name}</p>
                  ) : (
                    <p className="font-medium text-xs truncate">{apt.title}</p>
                  )}
                  <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <CalendarIcon className="h-2 w-2" />
                    {formatCalendarShortMonthDay(t, parseISO(apt.start_time))} · {format(parseISO(apt.start_time), "h:mm a")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {calendarView === "week" && renderWeekView()}
        {calendarView === "month" && renderMonthView()}
        {calendarView === "year" && renderYearView()}

        {calendarView !== "year" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{formatCalendarWeekdayMonthDay(t, selectedDate)}</CardTitle>
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

      <BookAppointmentDialog open={bookDialogOpen} onOpenChange={setBookDialogOpen} onBooked={fetchAppointments} />
    </div>
  );
}
