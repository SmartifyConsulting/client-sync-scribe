import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, Video } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const dayLabel = (d: Date) => (isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "EEEE d MMM"));

/** The client's next scheduled meeting with their Wealth Manager. */
export function NextMeetingWithWM() {
  const { user } = useAuth();
  const { data: meeting } = useQuery({
    queryKey: ["client-next-meeting", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, title, start_time, type, location, user_id")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      const { data: wm } = await supabase.from("profiles").select("full_name").eq("id", data.user_id).maybeSingle();
      return { ...data, wmName: wm?.full_name || "Your Wealth Manager" };
    },
  });

  if (!meeting) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" /> No upcoming meeting scheduled yet.
      </div>
    );
  }

  const start = new Date(meeting.start_time);
  const isVideo = meeting.type === "video" || meeting.location?.toLowerCase().includes("video");

  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <CalendarDays className="h-4 w-4 text-primary" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{dayLabel(start)} · {format(start, "h:mm a")}</p>
        <p className="text-xs text-muted-foreground">
          With {meeting.wmName}
          <span className="mx-1">·</span>
          <span className="inline-flex items-center gap-1">
            {isVideo ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
            {isVideo ? "Video call" : "In person"}
          </span>
        </p>
      </div>
    </div>
  );
}
