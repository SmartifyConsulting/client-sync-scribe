import { useState, useEffect } from "react";
import { Receipt, Calendar, Download, CreditCard, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  description: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
  doctor_profile?: {
    full_name: string | null;
  };
}

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  paid: {
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle,
    label: "Paid",
  },
  pending: {
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
    label: "Pending",
  },
  overdue: {
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: AlertCircle,
    label: "Overdue",
  },
  cancelled: {
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    icon: AlertCircle,
    label: "Cancelled",
  },
};

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch doctor profiles and update status for overdue invoices
      const invoicesWithDoctors: Invoice[] = [];
      for (const inv of data || []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", inv.doctor_id)
          .maybeSingle();

        // Check if invoice is overdue
        let status = inv.status;
        if (status === "pending" && isPast(parseISO(inv.due_date))) {
          status = "overdue";
        }

        invoicesWithDoctors.push({
          ...inv,
          status,
          doctor_profile: profile || undefined,
        });
      }

      setInvoices(invoicesWithDoctors);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    return filter === "all" || inv.status === filter;
  });

  const totalPending = invoices
    .filter((inv) => inv.status === "pending")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const totalOverdue = invoices
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <p className="text-muted-foreground">View and manage your medical invoices</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter((i) => i.status === "pending").length} invoice(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</div>
            <p className="text-xs text-muted-foreground">
              {invoices.filter((i) => i.status === "overdue").length} invoice(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(invoices.reduce((sum, inv) => sum + Number(inv.amount), 0))}
            </div>
            <p className="text-xs text-muted-foreground">{invoices.length} invoice(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>Your complete invoice history</CardDescription>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {["all", "pending", "overdue", "paid", "cancelled"].map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
              >
                {status === "all" ? "All" : statusConfig[status]?.label || status}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInvoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {invoices.length === 0
                  ? "No invoices found. Your invoices will appear here once your doctor creates them."
                  : "No invoices match your filter criteria."
                }
              </p>
            ) : (
              filteredInvoices.map((invoice) => {
                const config = statusConfig[invoice.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                return (
                  <div
                    key={invoice.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Receipt className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">{invoice.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(Number(invoice.amount))}</p>
                          <Badge className={config.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Issued: {format(parseISO(invoice.created_at), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {format(parseISO(invoice.due_date), "MMM d, yyyy")}
                        </span>
                        {invoice.doctor_profile?.full_name && (
                          <span>From: {invoice.doctor_profile.full_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                      {(invoice.status === "pending" || invoice.status === "overdue") && (
                        <Button size="sm" className="gap-1">
                          <CreditCard className="h-4 w-4" />
                          Pay
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
