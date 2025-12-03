import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const currentDate = new Date();

const mockEvents = [
  { id: "1", title: "Sarah Johnson", time: "9:00 AM", day: 3, type: "session" },
  { id: "2", title: "Michael Chen", time: "10:30 AM", day: 3, type: "session" },
  { id: "3", title: "Team Meeting", time: "2:00 PM", day: 3, type: "internal" },
  { id: "4", title: "Emma Williams", time: "4:00 PM", day: 4, type: "session" },
  { id: "5", title: "Follow-up: David Brown", time: "11:00 AM", day: 5, type: "followup" },
  { id: "6", title: "Lisa Anderson", time: "9:30 AM", day: 6, type: "session" },
];

function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

export default function CalendarView() {
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const { firstDay, daysInMonth } = getDaysInMonth(selectedDate);

  const monthName = selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1));
  };

  const todayEvents = mockEvents.filter((e) => e.day === currentDate.getDate());

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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
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
              const dayEvents = mockEvents.filter((e) => e.day === day);

              return (
                <div
                  key={day}
                  className={cn(
                    "aspect-square p-1 rounded-lg transition-colors cursor-pointer hover:bg-muted/50",
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
                          className={cn(
                            "truncate rounded px-1 py-0.5 text-xs",
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
                  className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    {event.type === "session" ? (
                      <User className="h-5 w-5 text-accent-foreground" />
                    ) : (
                      <Clock className="h-5 w-5 text-accent-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.time}</p>
                  </div>
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
    </div>
  );
}
