import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Receipt, DollarSign, Send, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientInvoiceRow {
  id: string;
  invoice_number: string;
  procedure_name: string | null;
  status: string;
  total_amount: number;
  issued_date: string | null;
  created_at: string;
  patient_id: string;
  patient_name: string;
}

const STATUS_FILTERS = ["all", "draft", "issued", "paid", "partially_paid", "disputed"];

interface PatientBillingPanelProps {
  hospitalId: string | null;
  className?: string;
}

export function PatientBillingPanel({ hospitalId, className }: PatientBillingPanelProps) {
  const [invoices, setInvoices] = useState<PatientInvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchInvoices = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("patient_invoices")
        .select("id, invoice_number, procedure_name, status, total_amount, issued_date, created_at, patient_id, patients(name)")
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false })
        .limit(100);

      setInvoices(
        (data || []).map((row: any) => ({
          id: row.id,
          invoice_number: row.invoice_number,
          procedure_name: row.procedure_name,
          status: row.status,
          total_amount: row.total_amount,
          issued_date: row.issued_date,
          created_at: row.created_at,
          patient_id: row.patient_id,
          patient_name: row.patients?.name || "Unknown patient",
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const markIssued = async (id: string) => {
    await supabase
      .from("patient_invoices")
      .update({ status: "issued", issued_date: new Date().toISOString().slice(0, 10) })
      .eq("id", id);
    await fetchInvoices();
  };

  const markPaid = async (id: string, totalAmount: number) => {
    await supabase.from("patient_invoices").update({ status: "paid", paid_amount: totalAmount }).eq("id", id);
    await fetchInvoices();
  };

  const filtered = statusFilter === "all" ? invoices : invoices.filter((i) => i.status === statusFilter);

  const totalOutstanding = invoices
    .filter((i) => i.status === "issued" || i.status === "partially_paid")
    .reduce((sum, i) => sum + i.total_amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total_amount, 0);

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

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 gap-2">
        <Card className="rounded-xl border border-warning/40 bg-warning/5 p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-xl font-bold">R{totalOutstanding.toFixed(2)}</p>
        </Card>
        <Card className="rounded-xl border border-green-500/40 bg-green-500/5 p-4">
          <p className="text-xs text-muted-foreground">Collected</p>
          <p className="text-xl font-bold">R{totalPaid.toFixed(2)}</p>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Patient Invoices
        </p>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize text-xs">
                {s === "all" ? "All statuses" : s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No patient invoices{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""} yet
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <Card key={inv.id} className="rounded-xl border border-primary bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{inv.patient_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {inv.invoice_number} · {inv.procedure_name || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <Badge
                      variant={
                        inv.status === "paid"
                          ? "default"
                          : inv.status === "disputed"
                            ? "destructive"
                            : "secondary"
                      }
                      className="capitalize text-[10px]"
                    >
                      {inv.status.replace("_", " ")}
                    </Badge>
                    <p className="text-sm font-bold mt-0.5">R{inv.total_amount.toFixed(2)}</p>
                  </div>
                  {inv.status === "draft" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markIssued(inv.id)}>
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Issue
                    </Button>
                  )}
                  {inv.status === "issued" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markPaid(inv.id, inv.total_amount)}>
                      <DollarSign className="h-3.5 w-3.5 mr-1" />
                      Mark Paid
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                    <Link to={`/provider/hospital/patient/${inv.patient_id}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
