import { Link, useNavigate } from "react-router-dom";
import { Clock, User, Video, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Patient {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  time: string;
  type: "in-person" | "video";
}

export function UpcomingAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const handleStartSession = (patientId: string) => {
    navigate(`/sessions?patient=${patientId}`);
  };

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const { data: patients } = await supabase
          .from('patients')
          .select('id, name')
          .eq('status', 'active')
          .limit(4);

        if (patients && patients.length > 0) {
          // Create mock appointments from real patients
          const times = ["9:00 AM", "10:30 AM", "2:00 PM", "4:00 PM"];
          const types: ("in-person" | "video")[] = ["video", "in-person", "video", "in-person"];
          
          const mockAppointments = patients.map((patient, index) => ({
            id: `apt-${index}`,
            patientId: patient.id,
            patientName: patient.name,
            time: times[index % times.length],
            type: types[index % types.length],
          }));
          setAppointments(mockAppointments);
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary bg-card shadow-sm">
      <div className="rounded-t-xl bg-primary p-5">
        <h3 className="text-lg font-semibold text-primary-foreground">Today's Schedule</h3>
        <p className="text-sm text-primary-foreground/80">
          {appointments.length} appointments scheduled
        </p>
      </div>
      {appointments.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No appointments today. Add patients to see them here.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {appointments.map((appointment, index) => (
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
              <Button
                size="sm"
                onClick={() => handleStartSession(appointment.patientId)}
              >
                Start Session
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
