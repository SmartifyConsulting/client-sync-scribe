import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import { Eye, Monitor, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type ViewRow = {
  id: string;
  viewer_id: string;
  viewer_name: string;
  viewer_role: string;
  screen: string;
  viewed_at: string;
};

type Grouping = "date-user" | "screen-user";

const dateLabel = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMMM yyyy");
};

export default function MyViews() {
  const [grouping, setGrouping] = useState<Grouping>("date-user");

  const { data: views = [], isLoading } = useQuery({
    queryKey: ["my-profile-views"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_profile_views" as any);
      if (error) throw error;
      return (data || []) as ViewRow[];
    },
  });

  const groups = useMemo(() => {
    const outer = new Map<string, Map<string, ViewRow[]>>();
    views.forEach((v) => {
      const outerKey = grouping === "date-user" ? dateLabel(v.viewed_at) : v.screen;
      const innerKey = v.viewer_name;
      if (!outer.has(outerKey)) outer.set(outerKey, new Map());
      const inner = outer.get(outerKey)!;
      if (!inner.has(innerKey)) inner.set(innerKey, []);
      inner.get(innerKey)!.push(v);
    });
    return Array.from(outer.entries());
  }, [views, grouping]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            My Views
          </h1>
          <p className="text-sm text-muted-foreground">
            Everyone who has viewed your profile, the screen they used and when.
          </p>
        </div>
        <Select value={grouping} onValueChange={(v) => setGrouping(v as Grouping)}>
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue placeholder="Grouping" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-user">Group by Date</SelectItem>
            <SelectItem value="screen-user">Group by Screen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No one has viewed your profile yet.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([outerKey, inner]) => (
            <div key={outerKey} className="rounded-xl border border-primary/40 bg-card overflow-hidden">
              <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-2">
                {grouping === "date-user" ? (
                  <Eye className="h-4 w-4 text-primary" />
                ) : (
                  <Monitor className="h-4 w-4 text-primary" />
                )}
                <h2 className="text-sm font-semibold text-foreground">{outerKey}</h2>
                <Badge variant="secondary" className="ml-auto text-2xs">
                  {Array.from(inner.values()).reduce((n, rows) => n + rows.length, 0)} views
                </Badge>
              </div>
              <div className="divide-y">
                {Array.from(inner.entries()).map(([viewer, rows]) => (
                  <div key={viewer} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{viewer}</span>
                      <Badge variant="outline" className="text-2xs capitalize">
                        {rows[0].viewer_role}
                      </Badge>
                    </div>
                    <ul className="mt-2 space-y-1 pl-6">
                      {rows.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span className="truncate">
                            {grouping === "date-user" ? r.screen : dateLabel(r.viewed_at)}
                          </span>
                          <span className="shrink-0">{format(new Date(r.viewed_at), "d MMM yyyy · h:mm a")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
