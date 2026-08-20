import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Receipt, FileText, Plus, DollarSign, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LINE_SOURCE_TYPES = [
  { value: "procedure_fee", label: "Procedure Fee" },
  { value: "bed_charge", label: "Bed Charge" },
  { value: "other", label: "Other" },
];

interface InvoiceLine {
  id: string;
  description: string;
  source_type: string;
  quantity: number;
  unit_cost: number | null;
  line_total: number | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  procedure_name: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  issued_date: string | null;
}

interface PatientInvoiceViewProps {
  admissionId: string | null;
  patientId: string | null;
  hospitalId: string | null;
  procedureName: string;
  className?: string;
}

export function PatientInvoiceView({
  admissionId,
  patientId,
  hospitalId,
  procedureName,
  className,
}: PatientInvoiceViewProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [linesByInvoice, setLinesByInvoice] = useState<Record<string, InvoiceLine[]>>({});
  const [pendingUsageCount, setPendingUsageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [lineInvoiceId, setLineInvoiceId] = useState<string | null>(null);
  const [lineDescription, setLineDescription] = useState("");
  const [lineSourceType, setLineSourceType] = useState("procedure_fee");
  const [lineQuantity, setLineQuantity] = useState("1");
  const [lineUnitCost, setLineUnitCost] = useState("");
  const [savingLine, setSavingLine] = useState(false);

  const fetchData = async () => {
    if (!admissionId) return;
    setLoading(true);
    try {
      const { data: invoiceData } = await supabase
        .from("patient_invoices")
        .select("*")
        .eq("admission_id", admissionId)
        .order("created_at", { ascending: false });

      setInvoices(invoiceData || []);

      if (invoiceData && invoiceData.length > 0) {
        const linesMap: Record<string, InvoiceLine[]> = {};
        for (const inv of invoiceData) {
          const { data: lines } = await supabase
            .from("patient_invoice_lines")
            .select("*")
            .eq("invoice_id", inv.id);
          linesMap[inv.id] = lines || [];
        }
        setLinesByInvoice(linesMap);
      }

      const { count } = await supabase
        .from("procedure_stock_usage")
        .select("id", { count: "exact", head: true })
        .eq("admission_id", admissionId)
        .eq("procedure_name", procedureName)
        .eq("invoiced", false);

      setPendingUsageCount(count || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissionId, procedureName]);

  const handleGenerateInvoice = async () => {
    if (!admissionId || !patientId || !hospitalId || !user?.id) return;

    setGenerating(true);
    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
      await supabase.rpc("generate_procedure_invoice", {
        p_admission_id: admissionId,
        p_procedure_name: procedureName,
        p_patient_id: patientId,
        p_hospital_id: hospitalId,
        p_invoice_number: invoiceNumber,
        p_created_by: user.id,
      });
      await fetchData();
    } finally {
      setGenerating(false);
    }
  };

  const openAddLine = (invoiceId: string) => {
    setLineInvoiceId(invoiceId);
    setLineDescription("");
    setLineSourceType("procedure_fee");
    setLineQuantity("1");
    setLineUnitCost("");
    setLineDialogOpen(true);
  };

  const handleAddLine = async () => {
    if (!lineInvoiceId || !lineDescription || !lineUnitCost) return;
    setSavingLine(true);
    try {
      const qty = parseInt(lineQuantity, 10) || 1;
      const unitCost = parseFloat(lineUnitCost);
      const lineTotal = qty * unitCost;

      await supabase.from("patient_invoice_lines").insert({
        invoice_id: lineInvoiceId,
        description: lineDescription,
        source_type: lineSourceType,
        quantity: qty,
        unit_cost: unitCost,
        line_total: lineTotal,
      });

      const invoice = invoices.find((i) => i.id === lineInvoiceId);
      if (invoice) {
        const newSubtotal = invoice.subtotal + lineTotal;
        await supabase
          .from("patient_invoices")
          .update({ subtotal: newSubtotal, total_amount: newSubtotal + invoice.tax_amount })
          .eq("id", lineInvoiceId);
      }

      setLineDialogOpen(false);
      await fetchData();
    } finally {
      setSavingLine(false);
    }
  };

  const markInvoiceIssued = async (invoiceId: string) => {
    await supabase
      .from("patient_invoices")
      .update({ status: "issued", issued_date: new Date().toISOString().slice(0, 10) })
      .eq("id", invoiceId);
    await fetchData();
  };

  const markInvoicePaid = async (invoiceId: string, totalAmount: number) => {
    await supabase
      .from("patient_invoices")
      .update({ status: "paid", paid_amount: totalAmount })
      .eq("id", invoiceId);
    await fetchData();
  };

  if (!admissionId) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No admission selected
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {pendingUsageCount > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {pendingUsageCount} item{pendingUsageCount !== 1 ? "s" : ""} ready to invoice
                </p>
                <p className="text-xs text-muted-foreground">
                  Stock used for {procedureName} not yet billed
                </p>
              </div>
              <Button size="sm" onClick={handleGenerateInvoice} disabled={generating}>
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Receipt className="mr-2 h-4 w-4" />
                    Generate Invoice
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No invoices generated yet
        </p>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="rounded-xl border border-primary bg-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {invoice.invoice_number}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {invoice.procedure_name}
                  </p>
                </div>
                <Badge
                  variant={invoice.status === "paid" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {invoice.status}
                </Badge>
              </div>

              <div className="space-y-2 mb-3">
                {(linesByInvoice[invoice.id] || []).map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span>
                      {line.quantity}x {line.description}
                    </span>
                    <span className="text-muted-foreground">
                      R{(line.line_total || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>R{invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tax</span>
                    <span>R{invoice.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1">
                  <span>Total</span>
                  <span>R{invoice.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                {invoice.status === "draft" && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddLine(invoice.id)}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Line
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markInvoiceIssued(invoice.id)}>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Mark Issued
                    </Button>
                  </>
                )}
                {invoice.status === "issued" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markInvoicePaid(invoice.id, invoice.total_amount)}>
                    <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                    Mark Paid
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={lineDialogOpen} onOpenChange={setLineDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Invoice Line</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input value={lineDescription} onChange={(e) => setLineDescription(e.target.value)} placeholder="e.g. Surgeon's fee" className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={lineSourceType} onValueChange={setLineSourceType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LINE_SOURCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Quantity</Label>
                <Input type="number" min="1" value={lineQuantity} onChange={(e) => setLineQuantity(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit Cost (R)</Label>
                <Input type="number" step="0.01" value={lineUnitCost} onChange={(e) => setLineUnitCost(e.target.value)} className="h-9" />
              </div>
            </div>
            <Button onClick={handleAddLine} disabled={!lineDescription || !lineUnitCost || savingLine} className="w-full">
              {savingLine ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Line"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
