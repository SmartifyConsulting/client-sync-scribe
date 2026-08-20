import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BudgetLine {
  department_name: string;
  category: string;
  allocated_amount: number;
  actual_spend: number;
  remaining: number;
  percent_used: number;
}

interface BudgetDashboardProps {
  hospitalId: string | null;
  budgetPeriod: string;
  className?: string;
}

export function BudgetDashboard({
  hospitalId,
  budgetPeriod,
  className,
}: BudgetDashboardProps) {
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hospitalId || !budgetPeriod) return;

    const fetchBudget = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.rpc("get_budget_vs_actual", {
          p_hospital_id: hospitalId,
          p_budget_period: budgetPeriod,
        });
        setBudgetLines(data || []);
      } finally {
        setLoading(false);
      }
    };

    fetchBudget();
  }, [hospitalId, budgetPeriod]);

  if (!hospitalId) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No hospital selected
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalAllocated = budgetLines.reduce((sum, b) => sum + b.allocated_amount, 0);
  const totalActual = budgetLines.reduce((sum, b) => sum + b.actual_spend, 0);
  const overallPercent = totalAllocated > 0 ? (totalActual / totalAllocated) * 100 : 0;

  return (
    <div className={cn("space-y-4", className)}>
      <Card
        className={cn(
          overallPercent >= 90
            ? "border-destructive/30 bg-destructive/5"
            : overallPercent >= 75
              ? "border-warning/30 bg-warning/5"
              : "border-primary/30 bg-primary/5"
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Budget Overview — {budgetPeriod}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">R{totalActual.toFixed(0)}</span>
            <span className="text-sm text-muted-foreground">
              of R{totalAllocated.toFixed(0)}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                overallPercent >= 90
                  ? "bg-destructive"
                  : overallPercent >= 75
                    ? "bg-warning"
                    : "bg-primary"
              )}
              style={{ width: `${Math.min(overallPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {overallPercent.toFixed(1)}% of total budget used
          </p>
        </CardContent>
      </Card>

      {budgetLines.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No budget lines set for this period
        </p>
      ) : (
        <div className="space-y-2">
          {budgetLines.map((line, i) => (
            <Card key={i} className="rounded-xl border border-primary bg-card p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold">{line.department_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {line.category}
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  {line.percent_used >= 90 && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <Badge
                    variant={
                      line.percent_used >= 90
                        ? "destructive"
                        : line.percent_used >= 75
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {line.percent_used}%
                  </Badge>
                </div>
              </div>

              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mb-2">
                <div
                  className={cn(
                    "h-full transition-all",
                    line.percent_used >= 90
                      ? "bg-destructive"
                      : line.percent_used >= 75
                        ? "bg-warning"
                        : "bg-primary"
                  )}
                  style={{ width: `${Math.min(line.percent_used, 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>R{line.actual_spend.toFixed(0)} spent</span>
                <span>R{line.remaining.toFixed(0)} remaining</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
