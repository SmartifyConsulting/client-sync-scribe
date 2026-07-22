import { useState, useEffect } from "react";
import { Receipt, Calendar, Download, CreditCard, CheckCircle, Clock, AlertCircle, Loader2, Send, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PatientInfo {
  name: string;
  email: string | null;
  claims_email: string | null;
  medical_aid: string | null;
  medical_aid_number: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  description: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
  patient_id: string;
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
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patientInfoMap, setPatientInfoMap] = useState<Record<string, PatientInfo>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [submittingClaimId, setSubmittingClaimId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

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

      // Fetch doctor profiles, patient info, and update status for overdue invoices
      const invoicesWithDoctors: Invoice[] = [];
      const patientMap: Record<string, PatientInfo> = {};

      for (const inv of data || []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", inv.doctor_id)
          .maybeSingle();

        // Fetch patient info if not already fetched
        if (!patientMap[inv.patient_id]) {
          const { data: patientData } = await supabase
            .from("patients")
            .select("name, email, claims_email, medical_aid, medical_aid_number")
            .eq("id", inv.patient_id)
            .maybeSingle();

          if (patientData) {
            patientMap[inv.patient_id] = patientData;
          }
        }

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

      setPatientInfoMap(patientMap);
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

  const handlePayInvoice = async (invoiceId: string) => {
    setPayingInvoiceId(invoiceId);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ 
          status: "paid", 
          paid_at: new Date().toISOString() 
        })
        .eq("id", invoiceId);

      if (error) throw error;

      toast({
        title: "Payment Successful",
        description: "Your invoice has been marked as paid.",
      });

      // Refresh invoices
      fetchInvoices();
    } catch (error) {
      console.error("Error paying invoice:", error);
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const handleSubmitClaim = async (invoice: Invoice) => {
    const patientInfo = patientInfoMap[invoice.patient_id];
    if (!patientInfo?.claims_email) return;

    setSubmittingClaimId(invoice.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("submit-insurance-claim", {
        body: {
          invoiceId: invoice.id,
          claimsEmail: patientInfo.claims_email,
          patientName: patientInfo.name,
          patientEmail: patientInfo.email,
          invoiceNumber: invoice.invoice_number,
          amount: invoice.amount,
          description: invoice.description,
          doctorName: invoice.doctor_profile?.full_name || "Doctor",
          dueDate: format(parseISO(invoice.due_date), "MMM d, yyyy"),
          medicalInsurance: patientInfo.medical_aid,
          medicalInsuranceNumber: patientInfo.medical_aid_number,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Claim Submitted",
        description: `Invoice ${invoice.invoice_number} has been submitted to your medical insurance.`,
      });
    } catch (error) {
      console.error("Error submitting claim:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your claim. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingClaimId(null);
    }
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
        <p className="text-muted-foreground text-xs">View and manage your medical invoices</p>
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
                          <button
                            onClick={() => setViewingInvoice(invoice)}
                            className="font-semibold text-primary hover:underline cursor-pointer text-left"
                          >
                            {invoice.invoice_number}
                          </button>
                          <p className="text-sm text-muted-foreground">{invoice.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(Number(invoice.amount))}</p>
                          <Badge className={config.color}>
                            <StatusIcon className="h-4 w-4 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Issued: {format(parseISO(invoice.created_at), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
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
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleSubmitClaim(invoice)}
                                disabled={!patientInfoMap[invoice.patient_id]?.claims_email || submittingClaimId === invoice.id}
                              >
                                {submittingClaimId === invoice.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                                Claim
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {patientInfoMap[invoice.patient_id]?.claims_email
                              ? `Submit to ${patientInfoMap[invoice.patient_id].claims_email}`
                              : "No claims email address configured"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {(invoice.status === "pending" || invoice.status === "overdue") && (
                        <Button 
                          size="sm" 
                          className="gap-1"
                          onClick={() => handlePayInvoice(invoice.id)}
                          disabled={payingInvoiceId === invoice.id}
                        >
                          {payingInvoiceId === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
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

      {/* View Invoice Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-primary bg-card p-6 shadow-lg animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Invoice Details</h2>
                  <p className="text-sm text-muted-foreground">{viewingInvoice.invoice_number}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewingInvoice(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              {viewingInvoice.doctor_profile?.full_name && (
                <div>
                  <p className="text-sm text-muted-foreground">From Doctor</p>
                  <p className="font-medium">{viewingInvoice.doctor_profile.full_name}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium">{viewingInvoice.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold text-lg">{formatCurrency(Number(viewingInvoice.amount))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <Badge className={statusConfig[viewingInvoice.status]?.color || statusConfig.pending.color}>
                      {statusConfig[viewingInvoice.status]?.label || viewingInvoice.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Issued On</p>
                  <p className="font-medium">{format(parseISO(viewingInvoice.created_at), 'dd MMMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{format(parseISO(viewingInvoice.due_date), 'dd MMMM yyyy')}</p>
                </div>
              </div>

              {viewingInvoice.paid_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Paid On</p>
                  <p className="font-medium">{format(parseISO(viewingInvoice.paid_at), 'dd MMMM yyyy')}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-6 border-t border-border mt-6">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setViewingInvoice(null)}
              >
                Close
              </Button>
              {(viewingInvoice.status === "pending" || viewingInvoice.status === "overdue") && (
                <Button 
                  className="flex-1 gap-1"
                  onClick={() => {
                    handlePayInvoice(viewingInvoice.id);
                    setViewingInvoice(null);
                  }}
                >
                  <CreditCard className="h-4 w-4" />
                  Mark as Paid
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
