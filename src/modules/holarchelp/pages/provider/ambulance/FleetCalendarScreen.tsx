import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatCalendarMonthYear, getCalendarShortWeekdayNames } from "@/lib/localizedDate";

interface CalendarEvent {
  date: string;
  type: "maintenance" | "inspection" | "insurance" | "mot";
  vehicle: string;
  description: string;
  status: "pending" | "completed" | "overdue";
}

const MOCK_EVENTS: CalendarEvent[] = [
  {
    date: "2026-06-30",
    type: "maintenance",
    vehicle: "AMB-001",
    description: "Oil Change",
    status: "pending",
  },
  {
    date: "2026-07-10",
    type: "inspection",
    vehicle: "AMB-003",
    description: "Annual Inspection",
    status: "pending",
  },
  {
    date: "2026-08-20",
    type: "maintenance",
    vehicle: "AMB-002",
    description: "Filter Replacement",
    status: "pending",
  },
  {
    date: "2026-09-15",
    type: "maintenance",
    vehicle: "AMB-001",
    description: "Full Service",
    status: "pending",
  },
  {
    date: "2026-11-30",
    type: "mot",
    vehicle: "AMB-001",
    description: "MOT Expiry",
    status: "pending",
  },
  {
    date: "2026-12-31",
    type: "insurance",
    vehicle: "AMB-002",
    description: "Insurance Renewal",
    status: "pending",
  },
];

const EVENT_CONFIG = {
  maintenance: { color: "bg-primary/10 text-primary", label: "Maintenance", icon: "🔧" },
  inspection: { color: "bg-accent/40 text-accent-foreground", label: "Inspection", icon: "✓" },
  insurance: { color: "bg-success/10 text-success", label: "Insurance", icon: "📋" },
  mot: { color: "bg-warning/10 text-warning", label: "MOT", icon: "🚗" },
};

export default function FleetCalendarScreen() {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 5, 27));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return MOCK_EVENTS.filter((e) => e.date === dateStr);
  };

  const monthName = formatCalendarMonthYear(t, currentMonth);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-2">Maintenance Calendar</h1>
        <p className="text-sm text-muted-foreground mt-2">Plan maintenance, inspections, and renewals</p>
      </header>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-bold">{monthName}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-muted/50 border-b">
          {getCalendarShortWeekdayNames(t).map((day) => (
            <div key={day} className="p-2 text-center font-semibold text-xs text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, idx) => (
            <div key={`empty-${idx}`} className="p-2 h-24 bg-muted/20 border-r border-b" />
          ))}
          {days.map((day) => {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const events = getEventsForDate(day);
            const isSelected = selectedDate === dateStr;

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`p-2 h-24 border-r border-b cursor-pointer transition-all overflow-y-auto ${
                  isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted/30"
                }`}
              >
                <p className="font-semibold text-sm mb-1">{day}</p>
                <div className="space-y-1">
                  {events.slice(0, 2).map((event, idx) => {
                    const config = EVENT_CONFIG[event.type];
                    return (
                      <div key={idx} className={`rounded text-xs px-1 py-0.5 ${config.color}`}>
                        {config.icon} {event.vehicle}
                      </div>
                    );
                  })}
                  {events.length > 2 && (
                    <div className="text-xs text-muted-foreground">+{events.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-bold text-lg">Events on {selectedDate}</h2>
          <div className="space-y-2">
            {getEventsForDate(parseInt(selectedDate.split("-")[2])).length > 0 ? (
              getEventsForDate(parseInt(selectedDate.split("-")[2])).map((event, idx) => {
                const config = EVENT_CONFIG[event.type];
                return (
                  <div key={idx} className={`rounded-xl border p-3 ${config.color}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{event.vehicle}</p>
                        <p className="text-sm">{event.description}</p>
                      </div>
                      {event.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                      ) : event.status === "overdue" ? (
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      ) : null}
                    </div>
                    <Button size="sm" className="mt-2 w-full">
                      {event.status === "completed" ? "Mark Complete" : "Schedule"}
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-sm">No events scheduled</p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="font-semibold text-sm mb-3">Event Types</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(EVENT_CONFIG).map(([key, config]) => (
            <div key={key} className={`rounded-lg px-3 py-2 text-sm ${config.color}`}>
              {config.icon} {config.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
