import { useState, useEffect, useMemo } from "react";
import { format, differenceInDays, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";
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
  Download,
  Mail,
  Plus,
  ChevronsUpDown,
  Check,
  Send
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { buildPaidInvoiceHtml } from "@/lib/paidInvoice";
import { buildInvoiceHtml } from "@/lib/invoiceHtml";
import { buildDocumentPdfBase64, pdfFileName } from "@/features/documents/utils/documentPdf";
import { DocumentPreview } from "@/components/sessions/DocumentPreview";
import { Eye } from "lucide-react";

interface Patient {
  id: string;
  name: string;
}

interface ServicePrice {
  id: string;
  service_name: string;
  default_price: number;
  currency: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  description: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
  session_id?: string | null;
  patient: {
    id: string;
    name: string;
  } | null;
}

type StatusFilter = "all" | "issued" | "paid" | "overdue" | "issued_overdue" | "archived";

const CURRENCIES = [
  { code: "ZAR", symbol: "R" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "BWP", symbol: "P" },
  { code: "NGN", symbol: "₦" },
  { code: "SZL", symbol: "E" },
  { code: "LSL", symbol: "M" },
];

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
          <CheckCircle className="h-4 w-4" />
          Paid
        </Badge>
      );
    case "overdue":
      return (
        <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 gap-1">
          <AlertTriangle className="h-4 w-4" />
          Overdue
        </Badge>
      );
    case "archived":
      return (
        <Badge className="bg-muted text-muted-foreground hover:bg-muted gap-1">
          <Archive className="h-4 w-4" />
          Archived
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 gap-1">
          <Clock className="h-4 w-4" />
          Issued
        </Badge>
      );
  }
}

export default function DoctorInvoices({ hideHeader = false }: { hideHeader?: boolean }) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("issued_overdue");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [editForm, setEditForm] = useState({ description: "", amount: "", dueDate: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportDateFrom, setReportDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [reportDateTo, setReportDateTo] = useState<Date | undefined>(endOfMonth(new Date()));
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [previewHtml, setPreviewHtml] = useState<{ html: string; title: string } | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  
  // Create invoice state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSelectorOpen, setPatientSelectorOpen] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [selectedService, setSelectedService] = useState<ServicePrice | null>(null);
  const [serviceSelectorOpen, setServiceSelectorOpen] = useState(false);
  const [invoiceCurrency, setInvoiceCurrency] = useState("ZAR");
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    description: "",
    amount: "",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchInvoices();
    fetchPatients();
    fetchServicePrices();
  }, []);

  const fetchServicePrices = async () => {
    try {
      const { data, error } = await supabase
        .from('service_prices')
        .select('*')
        .order('service_name');
      
      if (error) throw error;
      setServicePrices(data || []);
      // Set default currency if services exist
      if (data && data.length > 0) {
        setInvoiceCurrency(data[0].currency);
      }
    } catch (error) {
      console.error("Error fetching service prices:", error);
    }
  };

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find(c => c.code === code)?.symbol || code;
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id, invoice_number, description, amount, status, due_date, paid_at, created_at, session_id,
          patient:patients(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices((data as any) || []);
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

  // Send a PAID-stamped invoice copy to the medical aid claims email.
  // Used both by the auto-submit path (in markAsPaid) and the manual button.
  const sendPaidInvoiceToMedicalAid = async (invoice: Invoice, opts: { silent?: boolean } = {}) => {
    if (!invoice.patient?.id) return false;

    try {
      // Pull patient details + linked patient profile (for auto-email toggle).
      const { data: patientData } = await supabase
        .from("patients")
        .select("id, name, email, physical_address, postal_address, address, medical_aid, medical_aid_number, primary_member, claims_email, patient_user_id")
        .eq("id", invoice.patient.id)
        .maybeSingle();

      if (!patientData?.claims_email) {
        if (!opts.silent) {
          toast({
            title: "No Claims Email",
            description: "Add a Medical Aid Claims Email on the patient profile to send claims.",
            variant: "destructive",
          });
        }
        return false;
      }

      const paidAt = invoice.paid_at ? new Date(invoice.paid_at) : new Date();

      const html = await buildPaidInvoiceHtml(
        {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          description: invoice.description,
          amount: invoice.amount,
          due_date: invoice.due_date,
          paid_at: invoice.paid_at,
          session_id: invoice.session_id ?? null,
          patient: invoice.patient,
        },
        patientData,
        profile,
        paidAt,
        invoiceCurrency,
      );

      // Persist a "Invoice (Paid)" document so it shows up in the documents tab.
      // Only insert if one doesn't already exist for this invoice.
      try {
        const { data: existingPaidDoc } = await supabase
          .from("documents")
          .select("id")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "")
          .eq("template_name", "Invoice (Paid)")
          .ilike("name", `%${invoice.invoice_number}%`)
          .limit(1)
          .maybeSingle();

        if (!existingPaidDoc) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("documents").insert({
              user_id: user.id,
              patient_id: invoice.patient.id,
              session_id: invoice.session_id ?? null,
              name: `Invoice ${invoice.invoice_number} — PAID`,
              template_name: "Invoice (Paid)",
              content: html,
              patient_name: invoice.patient.name,
              is_draft: false,
            } as any);
          }
        }
      } catch (docErr) {
        console.error("Error persisting paid invoice document:", docErr);
      }

      const pdfBase64 = await buildDocumentPdfBase64(html);

      const { error: emailErr } = await supabase.functions.invoke("send-document-email", {
        body: {
          to: patientData.claims_email,
          cc: patientData.email || undefined,
          subject: `Invoice ${invoice.invoice_number} (PAID) - ${patientData.name}`,
          documentName: `Invoice ${invoice.invoice_number} — PAID`,
          documentId: invoice.id,
          documentHtml: html,
          senderName: profile?.full_name || "Doctor",
          practiceName: profile?.practice_number || undefined,
          attachments: pdfBase64
            ? [{ filename: pdfFileName(`Invoice-${invoice.invoice_number}-PAID`), content: pdfBase64 }]
            : undefined,
        },
      });

      if (emailErr) throw emailErr;

      toast({
        title: "Sent to Medical Aid",
        description: patientData.email
          ? `Paid invoice emailed to ${patientData.claims_email}, cc ${patientData.email}`
          : `Paid invoice emailed to ${patientData.claims_email}`,
      });
      return true;
    } catch (err: any) {
      console.error("Error sending paid invoice to medical aid:", err);
      if (!opts.silent) {
        toast({
          title: "Send Failed",
          description: err.message || "Failed to send paid invoice to medical aid",
          variant: "destructive",
        });
      }
      return false;
    }
  };

  // Email the invoice straight to the patient. Never CCs / sends to the
  // medical aid — that only happens once the invoice is stamped paid
  // (see sendPaidInvoiceToMedicalAid above).
  const sendInvoiceToPatient = async (invoice: Invoice) => {
    if (!invoice.patient?.id) return;
    setUpdatingId(invoice.id);
    try {
      const { data: patientData } = await supabase
        .from("patients")
        .select("id, name, email, physical_address, postal_address, address, medical_aid, medical_aid_number, primary_member")
        .eq("id", invoice.patient.id)
        .maybeSingle();

      if (!patientData?.email) {
        toast({
          title: "No Patient Email",
          description: "Add an email address on the patient profile to send invoices.",
          variant: "destructive",
        });
        return;
      }

      const isPaid = getInvoiceStatus(invoice) === "paid";
      const html = await buildInvoiceHtml({
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          description: invoice.description,
          amount: invoice.amount,
          due_date: invoice.due_date,
          created_at: invoice.created_at,
          paid_at: invoice.paid_at,
          session_id: invoice.session_id ?? null,
          patient: invoice.patient,
        },
        patient: patientData as any,
        profile: profile as any,
        currency: invoiceCurrency,
        paid: isPaid,
      });

      const pdfBase64 = await buildDocumentPdfBase64(html);

      const { error: emailErr } = await supabase.functions.invoke("send-document-email", {
        body: {
          to: patientData.email,
          subject: `Invoice ${invoice.invoice_number}${isPaid ? " (PAID)" : ""} - ${patientData.name}`,
          documentName: `Invoice ${invoice.invoice_number}`,
          documentId: invoice.id,
          documentHtml: html,
          senderName: profile?.full_name || "Doctor",
          practiceName: profile?.practice_number || undefined,
          attachments: pdfBase64
            ? [{ filename: pdfFileName(`Invoice-${invoice.invoice_number}`), content: pdfBase64 }]
            : undefined,
        },
      });
      if (emailErr) throw emailErr;

      toast({ title: "Invoice Sent", description: `Emailed to ${patientData.email}` });
    } catch (err: any) {
      console.error("Error sending invoice to patient:", err);
      toast({
        title: "Send Failed",
        description: err.message || "Failed to send invoice to patient",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const markAsPaid = async (invoiceId: string) => {
    setUpdatingId(invoiceId);
    try {
      const paidAtIso = new Date().toISOString();
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid', 
          paid_at: paidAtIso 
        })
        .eq('id', invoiceId);

      if (error) throw error;

      const updatedInvoice = invoices.find(inv => inv.id === invoiceId);

      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId 
          ? { ...inv, status: 'paid', paid_at: paidAtIso }
          : inv
      ));

      toast({
        title: "Invoice Updated",
        description: "Invoice marked as paid",
      });

      // Auto-forward the PAID-stamped invoice to the claims email
      // (only if patient has enabled the auto-email toggle).
      if (updatedInvoice?.patient?.id) {
        try {
          const { data: patientData } = await supabase
            .from('patients')
            .select('claims_email, patient_user_id')
            .eq('id', updatedInvoice.patient.id)
            .maybeSingle();

          if (!patientData?.claims_email) {
            toast({
              title: "No Claims Email",
              description: "Add a Medical Aid Claims Email on the patient profile to enable auto-submit.",
            });
          } else if (patientData?.patient_user_id) {
            const { data: patientProfile } = await supabase
              .from('profiles')
              .select('auto_email_invoice_to_insurance')
              .eq('id', patientData.patient_user_id)
              .maybeSingle();

            if (patientProfile?.auto_email_invoice_to_insurance) {
              await sendPaidInvoiceToMedicalAid(
                { ...(updatedInvoice as Invoice), paid_at: paidAtIso, status: 'paid' },
                { silent: false },
              );
            }
          }
        } catch (claimError) {
          console.error("Error forwarding claim:", claimError);
        }
      }
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

  // Build a (rendered) preview HTML for any invoice — paid or unpaid.
  const previewInvoice = async (invoice: Invoice) => {
    setLoadingPreviewId(invoice.id);
    try {
      const { data: patientData } = invoice.patient?.id
        ? await supabase
            .from("patients")
            .select("id, name, physical_address, postal_address, address, medical_aid, medical_aid_number, primary_member, claims_email")
            .eq("id", invoice.patient.id)
            .maybeSingle()
        : { data: null } as any;

      const html = await buildInvoiceHtml({
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          description: invoice.description,
          amount: invoice.amount,
          due_date: invoice.due_date,
          created_at: invoice.created_at,
          paid_at: invoice.paid_at,
          session_id: invoice.session_id ?? null,
          patient: invoice.patient,
        },
        patient: patientData,
        profile,
        currency: invoiceCurrency,
        paid: getInvoiceStatus(invoice) === "paid",
      });
      setPreviewHtml({ html, title: `Invoice ${invoice.invoice_number}` });
    } catch (err: any) {
      console.error("Preview error:", err);
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    } finally {
      setLoadingPreviewId(null);
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

  const generateReportPdf = () => {
    if (!reportDateFrom || !reportDateTo) return null;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice Report", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Practice info
    if (profile?.full_name) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(profile.full_name, pageWidth / 2, yPos, { align: "center" });
      yPos += 6;
    }
    if (profile?.practice_number) {
      doc.setFontSize(10);
      doc.text(`Practice No: ${profile.practice_number}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 10;
    }

    // Date range
    doc.setFontSize(11);
    doc.text(
      `Period: ${format(reportDateFrom, "dd MMM yyyy")} - ${format(reportDateTo, "dd MMM yyyy")}`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    yPos += 15;

    // Summary Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 20, yPos);
    yPos += 8;

    const currencySymbol = getCurrencySymbol(invoiceCurrency);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Invoices: ${reportTotals.invoiceCount}`, 20, yPos);
    yPos += 6;
    doc.text(`Total Amount: ${currencySymbol} ${reportTotals.total.toFixed(2)}`, 20, yPos);
    yPos += 6;
    doc.text(`Paid: ${currencySymbol} ${reportTotals.paidTotal.toFixed(2)}`, 20, yPos);
    yPos += 6;
    doc.text(`Outstanding: ${currencySymbol} ${reportTotals.unpaidTotal.toFixed(2)}`, 20, yPos);
    yPos += 15;

    // Monthly Breakdown Table
    if (reportData.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Monthly Breakdown", 20, yPos);
      yPos += 10;

      // Table headers
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const colWidths = [50, 25, 35, 35, 35];
      const cols = ["Month", "Invoices", "Total", "Paid", "Outstanding"];
      let xPos = 20;
      cols.forEach((col, i) => {
        doc.text(col, xPos, yPos);
        xPos += colWidths[i];
      });
      yPos += 2;
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 6;

      // Table rows
      doc.setFont("helvetica", "normal");
      reportData.forEach((month) => {
        xPos = 20;
        doc.text(month.monthLabel, xPos, yPos);
        xPos += colWidths[0];
        doc.text(String(month.invoices.length), xPos, yPos);
        xPos += colWidths[1];
        doc.text(`${currencySymbol} ${month.total.toFixed(2)}`, xPos, yPos);
        xPos += colWidths[2];
        doc.text(`${currencySymbol} ${month.paidTotal.toFixed(2)}`, xPos, yPos);
        xPos += colWidths[3];
        doc.text(`${currencySymbol} ${month.unpaidTotal.toFixed(2)}`, xPos, yPos);
        yPos += 6;
      });

      // Totals row
      yPos += 2;
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 6;
      doc.setFont("helvetica", "bold");
      xPos = 20;
      doc.text("Total", xPos, yPos);
      xPos += colWidths[0];
      doc.text(String(reportTotals.invoiceCount), xPos, yPos);
      xPos += colWidths[1];
      doc.text(`${currencySymbol} ${reportTotals.total.toFixed(2)}`, xPos, yPos);
      xPos += colWidths[2];
      doc.text(`${currencySymbol} ${reportTotals.paidTotal.toFixed(2)}`, xPos, yPos);
      xPos += colWidths[3];
      doc.text(`${currencySymbol} ${reportTotals.unpaidTotal.toFixed(2)}`, xPos, yPos);
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}`, pageWidth / 2, pageHeight - 10, { align: "center" });

    return doc;
  };

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      const doc = generateReportPdf();
      if (doc) {
        const fileName = `Invoice_Report_${format(reportDateFrom!, "yyyy-MM-dd")}_to_${format(reportDateTo!, "yyyy-MM-dd")}.pdf`;
        doc.save(fileName);
        toast({
          title: "PDF Exported",
          description: "Invoice report has been downloaded",
        });
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleEmailReport = async () => {
    if (!emailAddress || !emailAddress.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("send-invoice-report", {
        body: {
          email: emailAddress,
          doctorName: profile?.full_name || "Doctor",
          practiceNumber: profile?.practice_number || "",
          dateFrom: reportDateFrom ? format(reportDateFrom, "yyyy-MM-dd") : "",
          dateTo: reportDateTo ? format(reportDateTo, "yyyy-MM-dd") : "",
          reportData: reportData.map(m => ({
            month: m.monthLabel,
            invoiceCount: m.invoices.length,
            total: m.total.toFixed(2),
            paid: m.paidTotal.toFixed(2),
            outstanding: m.unpaidTotal.toFixed(2),
          })),
          totals: {
            invoiceCount: reportTotals.invoiceCount,
            total: reportTotals.total.toFixed(2),
            paid: reportTotals.paidTotal.toFixed(2),
            outstanding: reportTotals.unpaidTotal.toFixed(2),
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Invoice report sent to ${emailAddress}`,
      });
      setEmailAddress("");
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send invoice report email",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `INV-${year}${month}-${random}`;
  };

  const handleCreateInvoice = async () => {
    if (!selectedPatient) {
      toast({
        title: "No Patient Selected",
        description: "Please select a patient first",
        variant: "destructive",
      });
      return;
    }

    if (!newInvoiceForm.amount || parseFloat(newInvoiceForm.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingInvoice(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const invoiceNumber = generateInvoiceNumber();
      
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          patient_id: selectedPatient.id,
          doctor_id: user.id,
          invoice_number: invoiceNumber,
          description: newInvoiceForm.description || `Consultation - ${selectedPatient.name}`,
          amount: parseFloat(newInvoiceForm.amount),
          due_date: newInvoiceForm.dueDate,
          status: 'pending',
        })
        .select(`*, patient:patients(id, name)`)
        .single();

      if (error) throw error;

      setInvoices(prev => [data, ...prev]);
      
      toast({
        title: "Invoice Created",
        description: `Invoice ${invoiceNumber} has been created successfully`,
      });

      // Reset form
      setShowCreateDialog(false);
      setSelectedPatient(null);
      setSelectedService(null);
      setNewInvoiceForm({
        description: "",
        amount: "",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("animate-fade-in", hideHeader ? "space-y-4" : "space-y-6")}>
      {/* Header with Create and Report Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {!hideHeader && (
          <div>
            <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
            <p className="mt-1 text-muted-foreground text-xs">
              Manage and track all patient invoices
            </p>
          </div>
        )}
        <div className="flex gap-2">
          {/* Create Invoice Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Select a patient and enter invoice details
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Patient Selector with Search */}
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <Popover open={patientSelectorOpen} onOpenChange={setPatientSelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={patientSelectorOpen}
                        className="w-full justify-between"
                      >
                        {selectedPatient ? (
                          <span className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {selectedPatient.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Select a patient...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search patients..." />
                        <CommandList>
                          <CommandEmpty>No patient found.</CommandEmpty>
                          <CommandGroup>
                            {patients.map((patient) => (
                              <CommandItem
                                key={patient.id}
                                value={patient.name}
                                onSelect={() => {
                                  setSelectedPatient(patient);
                                  setPatientSelectorOpen(false);
                                  if (!newInvoiceForm.description) {
                                    setNewInvoiceForm(prev => ({
                                      ...prev,
                                      description: `Consultation - ${patient.name}`
                                    }));
                                  }
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedPatient?.id === patient.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                {patient.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Service Selector */}
                {servicePrices.length > 0 && (
                  <div className="space-y-2">
                    <Label>Service (Optional)</Label>
                    <Popover open={serviceSelectorOpen} onOpenChange={setServiceSelectorOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={serviceSelectorOpen}
                          className="w-full justify-between"
                        >
                          {selectedService ? (
                            <span className="flex items-center gap-2">
                              {selectedService.service_name} - {getCurrencySymbol(selectedService.currency)} {Number(selectedService.default_price).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Select a service...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search services..." />
                          <CommandList>
                            <CommandEmpty>No service found.</CommandEmpty>
                            <CommandGroup>
                              {servicePrices.map((service) => (
                                <CommandItem
                                  key={service.id}
                                  value={service.service_name}
                                  onSelect={() => {
                                    setSelectedService(service);
                                    setServiceSelectorOpen(false);
                                    setInvoiceCurrency(service.currency);
                                    setNewInvoiceForm(prev => ({
                                      ...prev,
                                      description: service.service_name,
                                      amount: String(service.default_price),
                                    }));
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedService?.id === service.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex justify-between w-full">
                                    <span>{service.service_name}</span>
                                    <span className="text-muted-foreground">
                                      {getCurrencySymbol(service.currency)} {Number(service.default_price).toFixed(2)}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Select a service to auto-fill description and amount. You can override the price below.
                    </p>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="new-description">Description</Label>
                  <Textarea
                    id="new-description"
                    value={newInvoiceForm.description}
                    onChange={(e) => setNewInvoiceForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Invoice description..."
                    className="min-h-[80px]"
                  />
                </div>

                {/* Amount and Due Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-amount">Amount ({getCurrencySymbol(invoiceCurrency)})</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {getCurrencySymbol(invoiceCurrency)}
                      </span>
                      <Input
                        id="new-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newInvoiceForm.amount}
                        onChange={(e) => setNewInvoiceForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-dueDate">Due Date</Label>
                    <Input
                      id="new-dueDate"
                      type="date"
                      value={newInvoiceForm.dueDate}
                      onChange={(e) => setNewInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setShowCreateDialog(false);
                    setSelectedPatient(null);
                    setSelectedService(null);
                    setNewInvoiceForm({
                      description: "",
                      amount: "",
                      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 gap-2" 
                  onClick={handleCreateInvoice}
                  disabled={isCreatingInvoice || !selectedPatient}
                >
                  {isCreatingInvoice ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Create Invoice
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Report Dialog */}
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
                <p className="text-xl font-bold">{getCurrencySymbol(invoiceCurrency)} {reportTotals.total.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-3 border-green-500/30 bg-green-500/5">
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-xl font-bold text-green-600">{getCurrencySymbol(invoiceCurrency)} {reportTotals.paidTotal.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-3 border-amber-500/30 bg-amber-500/5">
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold text-amber-600">{getCurrencySymbol(invoiceCurrency)} {reportTotals.unpaidTotal.toFixed(2)}</p>
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
                        <TableCell className="text-right">{getCurrencySymbol(invoiceCurrency)} {month.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-600">{getCurrencySymbol(invoiceCurrency)} {month.paidTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-amber-600">{getCurrencySymbol(invoiceCurrency)} {month.unpaidTotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="border-t-2 font-bold bg-muted/50">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-center">{reportTotals.invoiceCount}</TableCell>
                      <TableCell className="text-right">{getCurrencySymbol(invoiceCurrency)} {reportTotals.total.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600">{getCurrencySymbol(invoiceCurrency)} {reportTotals.paidTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-amber-600">{getCurrencySymbol(invoiceCurrency)} {reportTotals.unpaidTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Export Actions */}
            <div className="flex flex-col gap-4 pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="gap-2 flex-1"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf || reportData.length === 0}
                >
                  {isExportingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="flex-1"
                />
                <Button
                  className="gap-2"
                  onClick={handleEmailReport}
                  disabled={isSendingEmail || reportData.length === 0 || !emailAddress}
                >
                  {isSendingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Email Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-primary bg-card p-4 shadow-sm">
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
        <div className="rounded-xl border border-primary bg-card p-4 shadow-sm">
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
        <div className="rounded-xl border border-primary bg-card p-4 shadow-sm">
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
        <div className="rounded-xl border border-primary bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{getCurrencySymbol(invoiceCurrency)} {stats.totalOutstanding.toFixed(2)}</p>
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
      <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <TableHead className="text-primary-foreground">Invoice #</TableHead>
              <TableHead className="text-primary-foreground">Patient</TableHead>
              <TableHead className="text-primary-foreground">Description</TableHead>
              <TableHead className="text-primary-foreground">Amount</TableHead>
              <TableHead className="text-primary-foreground">Due Date</TableHead>
              <TableHead className="text-primary-foreground">Status</TableHead>
              <TableHead className="text-right text-primary-foreground">Actions</TableHead>
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
                  <TableRow
                    key={invoice.id}
                    className={cn(
                      Number(invoice.amount) === 0 && status !== "paid" && status !== "archived" &&
                        "bg-amber-500/5 hover:bg-amber-500/10",
                    )}
                  >
                    <TableCell>
                      <button
                        onClick={() => setViewingInvoice(invoice)}
                        className="font-medium text-primary hover:underline cursor-pointer"
                      >
                        {invoice.invoice_number}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span>{invoice.patient?.name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{invoice.description}</TableCell>
                    <TableCell className="font-semibold">
                      {Number(invoice.amount) === 0 && status !== "paid" ? (
                        <span className="text-amber-600">
                          {getCurrencySymbol(invoiceCurrency)} 0.00
                        </span>
                      ) : (
                        <>{getCurrencySymbol(invoiceCurrency)} {Number(invoice.amount).toFixed(2)}</>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Set Amount — pending zero-amount auto-invoices */}
                        {Number(invoice.amount) === 0 && status !== "paid" && status !== "archived" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-sm border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                            onClick={() => openEditDialog(invoice)}
                            title="This invoice has no amount — click to set it"
                          >
                            Set amount
                          </Button>
                        )}

                        {/* Preview — every row */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => previewInvoice(invoice)}
                          disabled={loadingPreviewId === invoice.id}
                          title="Preview invoice"
                        >
                          {loadingPreviewId === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>

                        {/* Edit — every row */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(invoice)}
                          title="Edit invoice"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Send to patient — never CCs / goes to the medical aid; that only happens once paid */}
                        {status !== "archived" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => sendInvoiceToPatient(invoice)}
                            disabled={updatingId === invoice.id}
                            title="Email invoice to patient"
                          >
                            {updatingId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </Button>
                        )}

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
                          <>
                            <span className="text-xs text-muted-foreground">
                              Paid {format(new Date(invoice.paid_at), 'dd MMM')}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 h-8 text-sm"
                              onClick={() => sendPaidInvoiceToMedicalAid(invoice)}
                              title="Send PAID invoice to Medical Aid claims email"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Send to Medical Aid
                            </Button>
                          </>
                        )}
                        {status !== "archived" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => archiveInvoice(invoice.id)} className="text-muted-foreground">
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
          <div className="w-full max-w-lg rounded-xl border border-primary bg-card p-6 shadow-lg animate-fade-in">
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
                  <Label htmlFor="edit-amount">Amount ({getCurrencySymbol(invoiceCurrency)})</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {getCurrencySymbol(invoiceCurrency)}
                    </span>
                    <Input
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.amount}
                      onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="pl-8"
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

      {/* HTML Preview Modal (uses buildInvoiceHtml renderer) */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-xl border border-primary bg-card shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{previewHtml.title}</h2>
                  <p className="text-xs text-muted-foreground">Invoice preview</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPreviewHtml(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto bg-muted/30 p-4">
              <iframe
                title={previewHtml.title}
                srcDoc={previewHtml.html}
                className="w-full h-[70vh] bg-white rounded-lg border border-border"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border p-4">
              <Button variant="outline" onClick={() => setPreviewHtml(null)}>
                Close
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const w = window.open("", "_blank");
                  if (w) {
                    w.document.write(previewHtml.html);
                    w.document.close();
                    w.focus();
                    setTimeout(() => w.print(), 300);
                  }
                }}
              >
                <Download className="h-4 w-4" />
                Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal - Template Format */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-primary bg-card shadow-lg animate-fade-in">
            {getInvoiceStatus(viewingInvoice) === "paid" && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                <div className="-rotate-[25deg] rounded-md border-4 border-red-600 px-8 py-2 text-5xl font-black tracking-[0.2em] text-red-600 opacity-30">
                  PAID
                </div>
              </div>
            )}
            {/* Invoice Template Header */}
            <div className="bg-primary text-primary-foreground p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">INVOICE</h1>
                  <p className="text-primary-foreground/80 text-sm mt-1">{viewingInvoice.invoice_number}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewingInvoice(null)}
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Practice Info */}
            <div className="p-6 border-b border-border">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">From</p>
                  <p className="font-semibold text-foreground">{profile?.full_name || "Doctor"}</p>
                  {profile?.practice_number && (
                    <p className="text-sm text-muted-foreground">Practice No: {profile.practice_number}</p>
                  )}
                  {profile?.doctor_number && (
                    <p className="text-sm text-muted-foreground">Registration No: {profile.doctor_number}</p>
                  )}
                  {profile?.practice_address && (
                    <p className="text-sm text-muted-foreground mt-1">{profile.practice_address}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Bill To</p>
                  <p className="font-semibold text-foreground">{viewingInvoice.patient?.name || "Unknown"}</p>
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="p-6 border-b border-border">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">{format(new Date(viewingInvoice.created_at), 'dd MMMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-medium">{format(new Date(viewingInvoice.due_date), 'dd MMMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(getInvoiceStatus(viewingInvoice))}</div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="p-6 border-b border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-sm text-muted-foreground">
                    <th className="text-left py-2 font-medium">Description</th>
                    <th className="text-right py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingInvoice.description.split('\n').map((line, idx) => {
                    const parts = line.split(' - ');
                    const hasAmount = parts.length > 1 && parts[parts.length - 1].match(/^[A-Z]?\$?R?[\d,.]+$/);
                    const description = hasAmount ? parts.slice(0, -1).join(' - ') : line;
                    const lineAmount = hasAmount ? parts[parts.length - 1] : null;
                    
                    return (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="py-3 text-foreground">{description}</td>
                        <td className="py-3 text-right text-foreground">
                          {lineAmount || ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="p-6 border-b border-border bg-muted/30">
              <div className="flex justify-end">
                <div className="w-48 space-y-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{getCurrencySymbol(invoiceCurrency)} {Number(viewingInvoice.amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            {viewingInvoice.paid_at && (
              <div className="p-6 border-b border-border bg-green-500/5">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Paid on {format(new Date(viewingInvoice.paid_at), 'dd MMMM yyyy')}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 p-6">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setViewingInvoice(null)}
              >
                Close
              </Button>
              {getInvoiceStatus(viewingInvoice) !== "paid" && getInvoiceStatus(viewingInvoice) !== "archived" && (
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    openEditDialog(viewingInvoice);
                    setViewingInvoice(null);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
