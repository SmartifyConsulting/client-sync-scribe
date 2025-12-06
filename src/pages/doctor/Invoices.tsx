import { useState, useEffect, useMemo } from "react";
import { format, differenceInDays, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { 
  Receipt, 
  Search, 
  Filter, 
  Loader2, 
  User, 
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Pencil,
  Archive,
  MoreHorizontal,
  X,
  FileText,
  Download
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  invoice_number: string;
  description: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
  patient: {
    id: string;
    name: string;
  } | null;
}

type StatusFilter = "all" | "issued" | "paid" | "overdue" | "issued_overdue" | "archived";

function getInvoiceStatus(invoice: Invoice): "issued" | "paid" | "overdue" | "archived" {
  if (invoice.status === "archived") {
    return "archived";
  }
  if (invoice.status === "paid" || invoice.paid_at) {
    return "paid";
  }
  
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  const daysPastDue = differenceInDays(today, dueDate);
  
  if (daysPastDue > 7) {
    return "overdue";
  }
  
  return "issued";
}

function getStatusBadge(status: "issued" | "paid" | "overdue" | "archived") {
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 gap-1">
          <CheckCircle className="h-3 w-3" />
          Paid
        </Badge>
      );
    case "overdue":
      return (
        <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </Badge>
      );
    case "archived":
      return (
        <Badge className="bg-muted text-muted-foreground hover:bg-muted gap-1">
          <Archive className="h-3 w-3" />
          Archived
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 gap-1">
          <Clock className="h-3 w-3" />
          Issued
        </Badge>
      );
  }
}

export default function DoctorInvoices() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("issued_overdue");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState({ description: "", amount: "", dueDate: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportDateFrom, setReportDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [reportDateTo, setReportDateTo] = useState<Date | undefined>(endOfMonth(new Date()));

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          patient:patients(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (invoiceId: string) => {
    setUpdatingId(invoiceId);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid', 
          paid_at: new Date().toISOString() 
        })
        .eq('id', invoiceId);

      if (error) throw error;

      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId 
          ? { ...inv, status: 'paid', paid_at: new Date().toISOString() }
          : inv
      ));

      toast({
        title: "Invoice Updated",
        description: "Invoice marked as paid",
      });
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const archiveInvoice = async (invoiceId: string) => {
    setUpdatingId(invoiceId);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'archived' })
        .eq('id', invoiceId);

      if (error) throw error;

      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId 
          ? { ...inv, status: 'archived' }
          : inv
      ));

      toast({
        title: "Invoice Archived",
        description: "Invoice has been archived",
      });
    } catch (error: any) {
      console.error("Error archiving invoice:", error);
      toast({
        title: "Error",
        description: "Failed to archive invoice",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const openEditDialog = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditForm({
      description: invoice.description,
      amount: String(invoice.amount),
      dueDate: invoice.due_date,
    });
  };

  const saveInvoiceEdit = async () => {
    if (!editingInvoice) return;

    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          description: editForm.description,
          amount: parseFloat(editForm.amount),
          due_date: editForm.dueDate,
        })
        .eq('id', editingInvoice.id);

      if (error) throw error;

      setInvoices(prev => prev.map(inv => 
        inv.id === editingInvoice.id 
          ? { 
              ...inv, 
              description: editForm.description,
              amount: parseFloat(editForm.amount),
              due_date: editForm.dueDate,
            }
          : inv
      ));

      toast({
        title: "Invoice Updated",
        description: "Invoice details have been saved",
      });
      setEditingInvoice(null);
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const status = getInvoiceStatus(invoice);
      
      // Status filter - exclude archived by default unless specifically viewing archived
      if (statusFilter !== "archived" && statusFilter !== "all" && status === "archived") {
        return false;
      }
      if (statusFilter === "issued_overdue" && (status === "paid" || status === "archived")) {
        return false;
      }
      if (statusFilter === "issued" && status !== "issued") {
        return false;
      }
      if (statusFilter === "paid" && status !== "paid") {
        return false;
      }
      if (statusFilter === "overdue" && status !== "overdue") {
        return false;
      }
      if (statusFilter === "archived" && status !== "archived") {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        return (
          invoice.invoice_number.toLowerCase().includes(search) ||
          invoice.patient?.name.toLowerCase().includes(search) ||
          invoice.description.toLowerCase().includes(search)
        );
      }
      
      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const activeInvoices = invoices.filter(i => getInvoiceStatus(i) !== "archived");
    const issued = activeInvoices.filter(i => getInvoiceStatus(i) === "issued").length;
    const paid = activeInvoices.filter(i => getInvoiceStatus(i) === "paid").length;
    const overdue = activeInvoices.filter(i => getInvoiceStatus(i) === "overdue").length;
    const archived = invoices.filter(i => getInvoiceStatus(i) === "archived").length;
    const totalOutstanding = activeInvoices
      .filter(i => getInvoiceStatus(i) !== "paid")
      .reduce((sum, i) => sum + Number(i.amount), 0);
    
    return { issued, paid, overdue, archived, totalOutstanding };
  }, [invoices]);

  // Report data grouped by month
  const reportData = useMemo(() => {
    if (!reportDateFrom || !reportDateTo) return [];

    const filteredByDate = invoices.filter(invoice => {
      const invoiceDate = parseISO(invoice.created_at);
      return isWithinInterval(invoiceDate, { start: reportDateFrom, end: reportDateTo });
    });

    // Group by month
    const monthlyGroups: Record<string, { invoices: Invoice[]; total: number; paidTotal: number; unpaidTotal: number }> = {};
    
    filteredByDate.forEach(invoice => {
      const monthKey = format(parseISO(invoice.created_at), 'yyyy-MM');
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = { invoices: [], total: 0, paidTotal: 0, unpaidTotal: 0 };
      }
      monthlyGroups[monthKey].invoices.push(invoice);
      monthlyGroups[monthKey].total += Number(invoice.amount);
      
      const status = getInvoiceStatus(invoice);
      if (status === 'paid') {
        monthlyGroups[monthKey].paidTotal += Number(invoice.amount);
      } else {
        monthlyGroups[monthKey].unpaidTotal += Number(invoice.amount);
      }
    });

    // Convert to array sorted by month
    return Object.entries(monthlyGroups)
      .map(([month, data]) => ({
        month,
        monthLabel: format(parseISO(`${month}-01`), 'MMMM yyyy'),
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [invoices, reportDateFrom, reportDateTo]);

  const reportTotals = useMemo(() => {
    return reportData.reduce(
      (acc, month) => ({
        total: acc.total + month.total,
        paidTotal: acc.paidTotal + month.paidTotal,
        unpaidTotal: acc.unpaidTotal + month.unpaidTotal,
        invoiceCount: acc.invoiceCount + month.invoices.length,
      }),
      { total: 0, paidTotal: 0, unpaidTotal: 0, invoiceCount: 0 }
    );
  }, [reportData]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Report Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="mt-1 text-muted-foreground">
            Manage and track all patient invoices
          </p>
        </div>
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice Report</DialogTitle>
              <DialogDescription>
                View invoice summary by date range with monthly totals
              </DialogDescription>
            </DialogHeader>
            
            {/* Date Range Selector */}
            <div className="flex flex-wrap gap-4 items-end py-4 border-b">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !reportDateFrom && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {reportDateFrom ? format(reportDateFrom, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={reportDateFrom}
                      onSelect={setReportDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !reportDateTo && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {reportDateTo ? format(reportDateTo, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={reportDateTo}
                      onSelect={setReportDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Report Summary */}
            <div className="grid gap-4 md:grid-cols-4 py-4">
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-xl font-bold">{reportTotals.invoiceCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold">R {reportTotals.total.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-3 border-green-500/30 bg-green-500/5">
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-xl font-bold text-green-600">R {reportTotals.paidTotal.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-3 border-amber-500/30 bg-amber-500/5">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold text-amber-600">R {reportTotals.unpaidTotal.toFixed(2)}</p>
              </div>
            </div>

            {/* Monthly Breakdown */}
            {reportData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invoices found in the selected date range
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold">Monthly Breakdown</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-center">Invoices</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((month) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">{month.monthLabel}</TableCell>
                        <TableCell className="text-center">{month.invoices.length}</TableCell>
                        <TableCell className="text-right">R {month.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-600">R {month.paidTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-amber-600">R {month.unpaidTotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="border-t-2 font-bold bg-muted/50">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-center">{reportTotals.invoiceCount}</TableCell>
                      <TableCell className="text-right">R {reportTotals.total.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600">R {reportTotals.paidTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-amber-600">R {reportTotals.unpaidTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.issued}</p>
              <p className="text-sm text-muted-foreground">Issued</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.overdue}</p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.paid}</p>
              <p className="text-sm text-muted-foreground">Paid</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">R {stats.totalOutstanding.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Outstanding</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="issued_overdue">Issued & Overdue</SelectItem>
              <SelectItem value="all">All Invoices</SelectItem>
              <SelectItem value="issued">Issued Only</SelectItem>
              <SelectItem value="overdue">Overdue Only</SelectItem>
              <SelectItem value="paid">Paid Only</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Receipt className="h-8 w-8" />
                    <p>No invoices found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => {
                const status = getInvoiceStatus(invoice);
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span>{invoice.patient?.name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{invoice.description}</TableCell>
                    <TableCell className="font-semibold">R {Number(invoice.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {status !== "paid" && status !== "archived" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsPaid(invoice.id)}
                            disabled={updatingId === invoice.id}
                          >
                            {updatingId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Mark Paid"
                            )}
                          </Button>
                        )}
                        {status === "paid" && invoice.paid_at && (
                          <span className="text-xs text-muted-foreground">
                            Paid {format(new Date(invoice.paid_at), 'dd MMM')}
                          </span>
                        )}
                        {status !== "paid" && status !== "archived" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(invoice)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Invoice
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => archiveInvoice(invoice.id)}
                                className="text-muted-foreground"
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Pencil className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Edit Invoice</h2>
                  <p className="text-sm text-muted-foreground">{editingInvoice.invoice_number}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingInvoice(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Invoice description..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount (R)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.amount}
                      onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-dueDate">Due Date</Label>
                  <Input
                    id="edit-dueDate"
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setEditingInvoice(null)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 gap-2" 
                  onClick={saveInvoiceEdit}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
