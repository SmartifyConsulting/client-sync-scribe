import { useState } from "react";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  title: string;
  date: Date;
  time: string;
  doctor: string;
  location: string;
  type: string;
}

const mockAppointments: Appointment[] = [
  {
    id: "1",
    title: "Follow-up Consultation",
    date: addDays(new Date(), 1),
    time: "10:00 AM",
    doctor: "Dr. Georgia Adams",
    location: "Suite 4, Medical Centre",
    type: "consultation",
  },
  {
    id: "2",
    title: "Blood Test Results",
    date: addDays(new Date(), 3),
    time: "2:30 PM",
    doctor: "Dr. Georgia Adams",
    location: "Suite 4, Medical Centre",
    type: "results",
  },
  {
    id: "3",
    title: "Annual Check-up",
    date: addDays(new Date(), 7),
    time: "9:00 AM",
    doctor: "Dr. Georgia Adams",
    location: "Suite 4, Medical Centre",
    type: "checkup",
  },
];

export default function PatientCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  const selectedDayAppointments = mockAppointments.filter((apt) =>
    isSameDay(apt.date, selectedDate)
  );

  const upcomingAppointments = mockAppointments
    .filter((apt) => apt.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Calendar</h1>
        <p className="text-muted-foreground">View and manage your appointments</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Week View */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {format(currentWeekStart, "MMMM yyyy")}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const dayAppointments = mockAppointments.filter((apt) =>
                    isSameDay(apt.date, day)
                  );
                  const isSelected = isSameDay(day, selectedDate);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-lg transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : isToday(day)
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="text-xs font-medium">
                        {format(day, "EEE")}
                      </span>
                      <span className="text-lg font-semibold">
                        {format(day, "d")}
                      </span>
                      {dayAppointments.length > 0 && (
                        <div className={cn(
                          "mt-1 h-1.5 w-1.5 rounded-full",
                          isSelected ? "bg-primary-foreground" : "bg-primary"
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Day Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {format(selectedDate, "EEEE, MMMM d")}
              </CardTitle>
              <CardDescription>
                {selectedDayAppointments.length} appointment(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDayAppointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No appointments scheduled for this day
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-border"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{apt.title}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {apt.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {apt.doctor}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {apt.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
            <CardDescription>Your next scheduled visits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-3 rounded-lg bg-muted/50 space-y-2"
                >
                  <p className="font-medium text-sm">{apt.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(apt.date, "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {apt.time}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {apt.doctor}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
