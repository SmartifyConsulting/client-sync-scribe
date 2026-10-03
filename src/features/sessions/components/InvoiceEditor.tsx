import { useState, useEffect } from "react";
import { X, FileText, Send, Loader2, Save, Plus, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SendDocumentButton } from "./SendDocumentButton";
import { DocumentPreview } from "./DocumentPreview";
import { useTemplateWithHeaderFooter } from "@/hooks/useTemplateWithHeaderFooter";
import { useProfile } from "@/hooks/useProfile";

interface LineItem {
  id: string;
  description: string;
  amount: string;
}

interface PatientDetails {
  name: string;
  medical_aid: string | null;
  medical_aid_number: string | null;
}

interface ServicePrice {
  id: string;
  service_name: string;
  default_price: number;
  currency: string;
}

interface InvoiceEditorProps {
  patientId: string;
  patientName: string;
  sessionId?: string;
  onClose: () => void;
  onSave: (invoice: { id: string; invoice_number: string; amount: number }) => void;
}

export function InvoiceEditor({ patientId, patientName, sessionId, onClose, onSave }: InvoiceEditorProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { formattedContent: savedTemplate, headerFooter } = useTemplateWithHeaderFooter("Invoice");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [selectedService, setSelectedService] = useState<string>("");
  const [currency, setCurrency] = useState<string>("ZAR");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: `Consultation session - ${patientName}`, amount: "" }
  ]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [showPreview, setShowPreview] = useState(false);

  const CURRENCIES = [
    { code: "ZAR", symbol: "R" },
    { code: "NGN", symbol: "₦" },
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
    { code: "BWP", symbol: "P" },
    // (NAD removed)
    { code: "SZL", symbol: "E" },
    { code: "LSL", symbol: "M" },
  ];

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find(c => c.code === code)?.symbol || code;
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  // Fetch patient details and service prices
  useEffect(() => {
    const fetchData = async () => {
      // Fetch patient details
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('name, medical_aid, medical_aid_number')
        .eq('id', patientId)
        .single();

      if (!patientError && patientData) {
        setPatientDetails(patientData);
        const medicalAidInfo = patientData.medical_aid && patientData.medical_aid_number 
          ? ` (${patientData.medical_aid} - ${patientData.medical_aid_number})`
          : '';
        setLineItems([
          { id: crypto.randomUUID(), description: `Consultation session - ${patientData.name}${medicalAidInfo}`, amount: "" }
        ]);
      }

      // Fetch service prices
      const { data: servicesData, error: servicesError } = await supabase
        .from('service_prices')
        .select('*')
        .order('service_name');

      if (!servicesError && servicesData) {
        setServicePrices(servicesData);
        if (servicesData.length > 0) {
          setCurrency(servicesData[0].currency);
        }
      }
    };

    fetchData();
  }, [patientId]);

  // Handle service selection - adds a new line item
  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    const service = servicePrices.find(s => s.id === serviceId);
    if (service) {
      const medicalAidInfo = patientDetails?.medical_aid && patientDetails?.medical_aid_number 
        ? ` (${patientDetails.medical_aid} - ${patientDetails.medical_aid_number})`
        : '';
      const newItem: LineItem = {
        id: crypto.randomUUID(),
        description: `${service.service_name} - ${patientDetails?.name || patientName}${medicalAidInfo}`,
        amount: service.default_price.toString(),
      };
      setLineItems(prev => [...prev, newItem]);
      setSelectedService("");
    }
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: "",
      amount: "",
    };
    setLineItems(prev => [...prev, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: 'description' | 'amount', value: string) => {
    setLineItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `INV-${year}${month}-${random}`;
  };

  const generateContent = () => {
    const itemLines = lineItems
      .filter(item => item.description.trim())
      .map(item => `${item.description} - ${getCurrencySymbol(currency)}${parseFloat(item.amount || '0').toFixed(2)}`)
      .join('\n');

    const invoiceBody = `INVOICE

Invoice Number: ${generateInvoiceNumber()}
Date: ${new Date().toLocaleDateString()}
Due Date: ${new Date(dueDate).toLocaleDateString()}
Patient: ${patientName}

─────────────────────────────────────

${itemLines}

─────────────────────────────────────

Total: ${getCurrencySymbol(currency)} ${totalAmount.toFixed(2)}`;

    // If we have a saved template with header/footer, use it as wrapper
    if (savedTemplate) {
      return savedTemplate
        .replace(/\[DATE\]/g, new Date().toLocaleDateString())
        .replace(/\[InvoiceDate\]/g, new Date().toLocaleDateString())
        .replace(/\[PATIENT_NAME\]/g, patientName)
        .replace(/\[PatientName\]/g, patientName)
        .replace(/\[INVOICE_CONTENT\]/g, invoiceBody)
        .replace(/\[InvoiceNumber\]/g, generateInvoiceNumber())
        .replace(/\[DueDate\]/g, new Date(dueDate).toLocaleDateString())
        .replace(/\[TotalAmount\]/g, `${getCurrencySymbol(currency)} ${totalAmount.toFixed(2)}`)
        // Legacy templates hardcode "INV-" before [InvoiceNumber]; the number already has it.
        .replace(/\bINV-(?:INV-)+/gi, "INV-");
    }

    return invoiceBody;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totalAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const invoiceNumber = generateInvoiceNumber();
      
      const combinedDescription = lineItems
        .filter(item => item.description.trim())
        .map(item => `${item.description}${item.amount ? ` - ${getCurrencySymbol(currency)}${parseFloat(item.amount).toFixed(2)}` : ''}`)
        .join('\n');
      
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          patient_id: patientId,
          doctor_id: user.id,
          session_id: sessionId || null,
          invoice_number: invoiceNumber,
          description: combinedDescription,
          amount: totalAmount,
          due_date: dueDate,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Fee statement Created",
        description: `Invoice ${invoiceNumber} has been created successfully`,
      });

      onSave({
        id: data.id,
        invoice_number: data.invoice_number,
        amount: data.amount,
      });
      onClose();
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showPreview) {
    return (
      <DocumentPreview
        title="Fee statement"
        subtitle={`Patient: ${patientName}`}
        content={generateContent()}
        logoUrl={profile?.logo_url || headerFooter?.header?.center?.imageUrl || undefined}
        fontFamily={headerFooter?.font_family || undefined}
        headerFooter={headerFooter}
        onClose={() => setShowPreview(false)}
        closeLabel="Back to Form"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-xl border border-primary bg-card shadow-lg animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Create Fee statement</h2>
              <p className="text-sm text-muted-foreground">Patient: {patientName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Service Selection */}
          {servicePrices.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="service">Add Service</Label>
              <Select value={selectedService} onValueChange={handleServiceSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a service to add..." />
                </SelectTrigger>
                <SelectContent>
                  {servicePrices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.service_name} - {service.currency} {service.default_price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="gap-1">
                <Plus className="h-4 w-4" />
                Add Line
              </Button>
            </div>
            
            {lineItems.map((item) => (
              <div key={item.id} className="flex gap-2 items-start p-3 rounded-xl border border-border bg-muted/20">
                <div className="flex-1 space-y-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                    placeholder="Description..."
                  />
                </div>
                <div className="w-28">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{getCurrencySymbol(currency)}</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.amount}
                      onChange={(e) => updateLineItem(item.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </div>
                {lineItems.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeLineItem(item.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            {/* Total */}
            <div className="flex justify-end items-center gap-4 pt-2 border-t border-border">
              <span className="text-sm font-medium text-muted-foreground">Total:</span>
              <span className="text-lg font-semibold text-foreground">{getCurrencySymbol(currency)} {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowPreview(true)} className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <SendDocumentButton
              patientId={patientId}
              patientName={patientName}
              documentLabel="Invoice"
              getContent={generateContent}
              preferredField="claims_email"
              headerFooter={headerFooter}
              fontFamily={headerFooter?.font_family || undefined}
            />
            <Button onClick={handleSubmit} className="gap-2" disabled={isSubmitting || totalAmount <= 0}>
              {isSubmitting ? (
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
        </div>
      </div>
    </div>
  );
}
