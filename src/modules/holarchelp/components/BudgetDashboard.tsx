import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, TrendingUp, Plus, Receipt, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BudgetLine {
  department_budget_id: string;
  department_name: string;
  category: string;
  allocated_amount: number;
  actual_spend: number;
  remaining: number;
  percent_used: number;
}

const CATEGORIES = ["supplies", "staffing", "equipment", "maintenance"];

function currentQuarter(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${q}`;
}

function quarterDateRange(period: string): { start: string; end: string } {
  const match = period.match(/^(\d{4})-Q(\d)$/);
  if (!match) {
    const now = new Date();
    return { start: now.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
  }
  const year = parseInt(match[1], 10);
  const q = parseInt(match[2], 10);
  const startMonth = (q - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
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

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [category, setCategory] = useState("supplies");
  const [allocatedAmount, setAllocatedAmount] = useState("");
  const [period, setPeriod] = useState(budgetPeriod || currentQuarter());
  const [savingBudget, setSavingBudget] = useState(false);

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseBudgetId, setExpenseBudgetId] = useState<string | null>(null);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);

  const fetchBudget = useCallback(async () => {
    if (!hospitalId || !budgetPeriod) return;
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
  }, [hospitalId, budgetPeriod]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  useEffect(() => {
    setPeriod(budgetPeriod || currentQuarter());
  }, [budgetPeriod]);

  const handleCreateBudget = async () => {
    if (!hospitalId || !deptName || !allocatedAmount) return;
    setSavingBudget(true);
    try {
      const { start, end } = quarterDateRange(period);
      await supabase.from("department_budgets").insert({
        hospital_id: hospitalId,
        department_name: deptName,
        category,
        budget_period: period,
        period_start: start,
        period_end: end,
        allocated_amount: parseFloat(allocatedAmount),
      });
      setDeptName("");
      setCategory("supplies");
      setAllocatedAmount("");
      setBudgetDialogOpen(false);
      await fetchBudget();
    } finally {
      setSavingBudget(false);
    }
  };

  const openExpenseDialog = (budgetId: string) => {
    setExpenseBudgetId(budgetId);
    setExpenseAmount("");
    setExpenseDescription("");
    setExpenseDialogOpen(true);
  };

  const handleRecordExpense = async () => {
    if (!expenseBudgetId || !expenseAmount) return;
    setSavingExpense(true);
    try {
      await supabase.from("budget_actuals").insert({
        department_budget_id: expenseBudgetId,
        transaction_type: "other",
        amount: parseFloat(expenseAmount),
        description: expenseDescription || null,
      });
      setExpenseDialogOpen(false);
      await fetchBudget();
    } finally {
      setSavingExpense(false);
    }
  };

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
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Budget — {budgetPeriod}
        </p>
        <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Department Budget</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Department</Label>
                <Input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g. Emergency Department" className="h-9" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Period</Label>
                  <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-Q3" className="h-9" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Allocated Amount (R)</Label>
                <Input type="number" step="0.01" value={allocatedAmount} onChange={(e) => setAllocatedAmount(e.target.value)} className="h-9" />
              </div>
              <Button onClick={handleCreateBudget} disabled={!deptName || !allocatedAmount || savingBudget} className="w-full">
                {savingBudget ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Budget"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">R{totalActual.toFixed(0)}</span>
            <span className="text-sm text-muted-foreground">of R{totalAllocated.toFixed(0)}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                overallPercent >= 90 ? "bg-destructive" : overallPercent >= 75 ? "bg-warning" : "bg-primary"
              )}
              style={{ width: `${Math.min(overallPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{overallPercent.toFixed(1)}% of total budget used</p>
        </CardContent>
      </Card>

      {budgetLines.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No budget lines set for this period — click New Budget above
        </p>
      ) : (
        <div className="space-y-2">
          {budgetLines.map((line) => (
            <Card key={line.department_budget_id} className="rounded-xl border border-primary bg-card p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold">{line.department_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{line.category}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  {line.percent_used >= 90 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  <Badge variant={line.percent_used >= 90 ? "destructive" : line.percent_used >= 75 ? "secondary" : "outline"}>
                    {line.percent_used}%
                  </Badge>
                </div>
              </div>

              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mb-2">
                <div
                  className={cn(
                    "h-full transition-all",
                    line.percent_used >= 90 ? "bg-destructive" : line.percent_used >= 75 ? "bg-warning" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(line.percent_used, 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>R{line.actual_spend.toFixed(0)} spent</span>
                <span>R{line.remaining.toFixed(0)} remaining</span>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => openExpenseDialog(line.department_budget_id)}
              >
                <Receipt className="h-3.5 w-3.5 mr-1.5" />
                Record Expense
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Amount (R)</Label>
              <Input type="number" step="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} placeholder="What was this spend for?" className="h-9" />
            </div>
            <Button onClick={handleRecordExpense} disabled={!expenseAmount || savingExpense} className="w-full">
              {savingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
