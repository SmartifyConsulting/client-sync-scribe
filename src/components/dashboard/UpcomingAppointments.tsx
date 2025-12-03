import { Link } from "react-router-dom";
import { Clock, User, Video, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  time: string;
  type: "in-person" | "video";
  status: "upcoming" | "in-progress" | "completed";
}

const mockAppointments: Appointment[] = [
  {
    id: "1",
    patientId: "1",
    patientName: "Sarah Johnson",
    time: "9:00 AM",
    type: "video",
    status: "upcoming",
  },
  {
    id: "2",
    patientId: "2",
    patientName: "Michael Chen",
    time: "10:30 AM",
    type: "in-person",
    status: "upcoming",
  },
  {
    id: "3",
    patientId: "3",
    patientName: "Emma Williams",
    time: "2:00 PM",
    type: "video",
    status: "upcoming",
  },
  {
    id: "4",
    patientId: "4",
    patientName: "David Brown",
    time: "4:00 PM",
    type: "in-person",
    status: "upcoming",
  },
];

export function UpcomingAppointments() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-5">
        <h3 className="text-lg font-semibold text-foreground">Today's Schedule</h3>
        <p className="text-sm text-muted-foreground">
          {mockAppointments.length} appointments scheduled
        </p>
      </div>
      <div className="divide-y divide-border">
        {mockAppointments.map((appointment, index) => (
          <div
            key={appointment.id}
            className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <User className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <Link
                to={`/patients/${appointment.patientId}`}
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                {appointment.patientName}
              </Link>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {appointment.time}
                </span>
                <span className="flex items-center gap-1">
                  {appointment.type === "video" ? (
                    <>
                      <Video className="h-3.5 w-3.5" />
                      Video Call
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3.5 w-3.5" />
                      In Person
                    </>
                  )}
                </span>
              </div>
            </div>
            <button
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow"
              )}
            >
              Start Session
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
