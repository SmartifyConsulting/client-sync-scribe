import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Loader2 } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";

interface MonthlyAdherenceSummaryProps {
  patientId: string;
}

interface AdherenceRow {
  id: string;
  scheduled_date: string;
  status: string;
  confidence_score: number | null;
  auto_approved_at: string | null;
}

export function MonthlyAdherenceSummary({ patientId }: MonthlyAdherenceSummaryProps) {
  // Last 6 months window
  const sinceDate = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["monthly-adherence-summary", patientId, sinceDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_adherence")
        .select("id, scheduled_date, status, confidence_score, auto_approved_at")
        .eq("patient_id", patientId)
        .gte("scheduled_date", sinceDate)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return (data || []) as AdherenceRow[];
    },
  });

  // Group by YYYY-MM
  const byMonth = new Map<string, AdherenceRow[]>();
  for (const r of rows) {
    const key = r.scheduled_date.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(r);
  }
  const months = Array.from(byMonth.entries()).sort(([a], [b]) => b.localeCompare(a));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-primary" />
          Monthly Adherence Summary
        </CardTitle>
        <CardDescription>
          How your tracked doses confirmed over the last few months
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : months.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No medication tracking data yet.
          </p>
        ) : (
          <div className="space-y-3">
            {months.map(([month, list]) => {
              const total = list.length;
              const confirmed = list.filter(
                (r) => r.status === "completed"
              ).length;
              const rated = list.filter(
                (r) => typeof r.confidence_score === "number"
              );
              const avg =
                rated.length > 0
                  ? Math.round(
                      rated.reduce((s, r) => s + (r.confidence_score ?? 0), 0) /
                        rated.length
                    )
                  : null;
              const wasAutoApproved = list.some((r) => r.auto_approved_at);
              const monthLabel = format(
                new Date(`${month}-01T00:00:00Z`),
                "MMMM yyyy"
              );

              return (
                <div
                  key={month}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {monthLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {confirmed}/{total} doses confirmed
                      {avg !== null ? ` · ${avg}% average confidence` : ""}
                    </p>
                  </div>
                  {wasAutoApproved && (
                    <Badge
                      variant="secondary"
                      className="bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30"
                    >
                      Auto-approved
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
