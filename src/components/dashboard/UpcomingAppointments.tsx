import { Link, useNavigate } from "react-router-dom";
import { Clock, User, Video, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";
import { SampleBadge } from "@/components/patients/SampleBadge";
import { isSamplePatient } from "@/lib/samplePatients";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  patientId: string | null;
  patientName: string;
  time: string;
  type: "in-person" | "video";
  title: string;
}

export function UpcomingAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const handleStartSession = (patientId: string) => {
    navigate(`/sessions?patient=${patientId}&autoStart=true`);
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;

        const today = new Date();
        const { data, error } = await supabase
          .from('appointments')
          .select('id, title, start_time, type, location, patient_id')
          .eq('user_id', user.id)
          .gte('start_time', startOfDay(today).toISOString())
          .lte('start_time', endOfDay(today).toISOString())
          .order('start_time', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          // Fetch patient names for appointments that have patient_id
          const patientIds = data.filter(a => a.patient_id).map(a => a.patient_id!);
          let patientMap: Record<string, string> = {};
          
          if (patientIds.length > 0) {
            const { data: patients } = await supabase
              .from('patients')
              .select('id, name')
              .in('id', patientIds);
            if (patients) {
              patientMap = Object.fromEntries(patients.map(p => [p.id, p.name]));
            }
          }

          const mapped: Appointment[] = data.map(apt => ({
            id: apt.id,
            patientId: apt.patient_id,
            patientName: apt.patient_id ? (patientMap[apt.patient_id] || apt.title) : apt.title,
            time: format(new Date(apt.start_time), "h:mm a"),
            type: apt.type === "video" || apt.location?.toLowerCase().includes("video") ? "video" : "in-person",
            title: apt.title,
          }));
          setAppointments(mapped);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-primary bg-card shadow-sm p-8">
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
          {appointments.length} appointment{appointments.length !== 1 ? "s" : ""} scheduled
        </p>
      </div>
      {appointments.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No appointments today.
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
                {appointment.patientId ? (
                  <Link
                    to={`/patients/${appointment.patientId}`}
                    className={cn("font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1", isSamplePatient({ name: appointment.patientName }) && "italic")}
                  >
                    {appointment.patientName}
                    {isSamplePatient({ name: appointment.patientName }) && <SampleBadge />}
                  </Link>
                ) : (
                  <span className={cn("font-medium text-foreground", isSamplePatient({ name: appointment.patientName }) && "italic")}>{appointment.patientName}</span>
                )}
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
              {appointment.patientId && (
                <Button
                  size="sm"
                  onClick={() => handleStartSession(appointment.patientId!)}
                >
                  Start Session
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
