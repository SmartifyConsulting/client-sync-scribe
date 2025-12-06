import { useState } from "react";
import { Receipt, Calendar, Download, CreditCard, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, subDays, subMonths } from "date-fns";

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: Date;
  dueDate: Date;
  amount: number;
  description: string;
  doctor: string;
  status: "paid" | "pending" | "overdue";
}

const mockInvoices: Invoice[] = [
  {
    id: "1",
    invoiceNumber: "INV-2024-001",
    date: subDays(new Date(), 5),
    dueDate: subDays(new Date(), -10),
    amount: 850,
    description: "Consultation - Follow-up visit",
    doctor: "Dr. Georgia Adams",
    status: "pending",
  },
  {
    id: "2",
    invoiceNumber: "INV-2024-002",
    date: subDays(new Date(), 3),
    dueDate: subDays(new Date(), -12),
    amount: 400,
    description: "Blood test analysis",
    doctor: "Dr. Georgia Adams",
    status: "pending",
  },
  {
    id: "3",
    invoiceNumber: "INV-2023-045",
    date: subMonths(new Date(), 1),
    dueDate: subDays(new Date(), -15),
    amount: 1200,
    description: "Initial consultation",
    doctor: "Dr. Georgia Adams",
    status: "paid",
  },
  {
    id: "4",
    invoiceNumber: "INV-2023-044",
    date: subMonths(new Date(), 2),
    dueDate: subDays(new Date(), 30),
    amount: 650,
    description: "Annual check-up",
    doctor: "Dr. Georgia Adams",
    status: "paid",
  },
  {
    id: "5",
    invoiceNumber: "INV-2023-030",
    date: subMonths(new Date(), 3),
    dueDate: subDays(new Date(), 60),
    amount: 320,
    description: "Prescription renewal",
    doctor: "Dr. Georgia Adams",
    status: "overdue",
  },
];

const statusConfig = {
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
};

export default function Invoices() {
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");

  const filteredInvoices = mockInvoices.filter((inv) => {
    return filter === "all" || inv.status === filter;
  });

  const totalPending = mockInvoices
    .filter((inv) => inv.status === "pending")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalOverdue = mockInvoices
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);
  };

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
              {mockInvoices.filter((i) => i.status === "pending").length} invoice(s)
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
              {mockInvoices.filter((i) => i.status === "overdue").length} invoice(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total This Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(mockInvoices.reduce((sum, inv) => sum + inv.amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">{mockInvoices.length} invoice(s)</p>
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
            {(["all", "pending", "overdue", "paid"] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
              >
                {status === "all" ? "All" : statusConfig[status].label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInvoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No invoices found
              </p>
            ) : (
              filteredInvoices.map((invoice) => {
                const StatusIcon = statusConfig[invoice.status].icon;
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
                          <p className="font-semibold">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">{invoice.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(invoice.amount)}</p>
                          <Badge className={statusConfig[invoice.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[invoice.status].label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Issued: {format(invoice.date, "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {format(invoice.dueDate, "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                      {invoice.status !== "paid" && (
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
