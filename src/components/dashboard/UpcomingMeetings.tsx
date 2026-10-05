import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, User, Video, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, addDays, isToday, isTomorrow } from "date-fns";

interface Meeting {
  id: string;
  patientId: string | null;
  patientName: string;
  startTime: string;
  type: "in-person" | "video";
}

const dayLabel = (d: Date) => (isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "EEE d MMM"));

/** Next 7 days of scheduled client meetings. */
export function UpcomingMeetings() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;

        const from = startOfDay(new Date());
        const to = addDays(from, 7);
        const { data, error } = await supabase
          .from("appointments")
          .select("id, title, start_time, type, location, patient_id")
          .eq("user_id", user.id)
          .gte("start_time", from.toISOString())
          .lt("start_time", to.toISOString())
          .order("start_time", { ascending: true });
        if (error) throw error;

        const patientIds = Array.from(new Set((data ?? []).filter((a) => a.patient_id).map((a) => a.patient_id!)));
        let nameById: Record<string, string> = {};
        if (patientIds.length > 0) {
          const { data: patients } = await supabase.from("patients").select("id, name").in("id", patientIds);
          nameById = Object.fromEntries((patients ?? []).map((p) => [p.id, p.name]));
        }

        setMeetings((data ?? []).map((a) => ({
          id: a.id,
          patientId: a.patient_id,
          patientName: a.patient_id ? (nameById[a.patient_id] || a.title) : a.title,
          startTime: a.start_time,
          type: a.type === "video" || a.location?.toLowerCase().includes("video") ? "video" : "in-person",
        })));
      } catch (error) {
        console.error("Error fetching upcoming meetings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  return (
    <Card className="border-t-4 border-t-primary">
      <CardHeader className="pb-2"><CardTitle className="text-base">Upcoming Meetings</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-1/3" />
          </div>
        ) : meetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meetings scheduled in the next 7 days.</p>
        ) : (
          <ul className="divide-y text-sm">
            {meetings.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
                  <User className="h-4 w-4 text-accent-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  {m.patientId ? (
                    <Link to={`/patients/${m.patientId}`} className="font-medium text-foreground hover:text-primary transition-colors truncate block">
                      {m.patientName}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground truncate block">{m.patientName}</span>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{dayLabel(new Date(m.startTime))} · {format(new Date(m.startTime), "h:mm a")}</span>
                    <span className="flex items-center gap-1">
                      {m.type === "video" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                      {m.type === "video" ? "Video" : "In person"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/calendar?date=${format(new Date(m.startTime), "yyyy-MM-dd")}`)}
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  View
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
