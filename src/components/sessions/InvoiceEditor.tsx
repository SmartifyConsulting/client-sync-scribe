import { useState, useCallback, useEffect } from "react";
import { X, FileText, DollarSign, Send, Loader2, Mic, Square, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { AudioWaveform } from "./AudioWaveform";
import { cn } from "@/lib/utils";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [selectedService, setSelectedService] = useState<string>("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: `Consultation session - ${patientName}`, amount: "" }
  ]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [rawTranscript, setRawTranscript] = useState("");
  const [activeLineItemId, setActiveLineItemId] = useState<string | null>(null);

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

  const handleTranscriptionComplete = useCallback((text: string) => {
    setRawTranscript(text);
    // Add transcribed text to the active line item or create a new one
    if (activeLineItemId) {
      updateLineItem(activeLineItemId, 'description', text);
    } else {
      const newItem: LineItem = {
        id: crypto.randomUUID(),
        description: text,
        amount: "",
      };
      setLineItems(prev => [...prev, newItem]);
    }
    toast({
      title: "Transcription Complete",
      description: "Invoice description has been populated from voice recording",
    });
  }, [toast, activeLineItemId]);

  const { 
    isRecording, 
    isTranscribing, 
    transcript,
    startRecording, 
    stopRecording,
  } = useAudioRecording({
    patientName,
    onTranscriptionComplete: handleTranscriptionComplete,
  });

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `INV-${year}${month}-${random}`;
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
      
      // Build combined description from all line items
      const combinedDescription = lineItems
        .filter(item => item.description.trim())
        .map(item => `${item.description}${item.amount ? ` - R${parseFloat(item.amount).toFixed(2)}` : ''}`)
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
        title: "Invoice Created",
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-border bg-card shadow-lg animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Create Invoice</h2>
              <p className="text-sm text-muted-foreground">Patient: {patientName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 divide-x divide-border">
          {/* Main Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 p-6 space-y-4 max-h-[60vh] overflow-y-auto">
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
                  <Plus className="h-3 w-3" />
                  Add Line
                </Button>
              </div>
              
              {lineItems.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-start p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Description..."
                      onFocus={() => setActiveLineItemId(item.id)}
                    />
                  </div>
                  <div className="w-28">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R</span>
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
                <span className="text-lg font-semibold text-foreground">R {totalAmount.toFixed(2)}</span>
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

          {/* Voice Recording Panel */}
          <div className="p-6 space-y-6 bg-muted/30">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                Voice Dictation
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Dictate the invoice description
              </p>
            </div>

            {/* Recording Button */}
            <div className="flex flex-col items-center gap-4 py-6">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isTranscribing}
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300",
                  isTranscribing && "opacity-50 cursor-not-allowed",
                  isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse-soft"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow"
                )}
              >
                {isTranscribing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : isRecording ? (
                  <Square className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>
              <p className="text-sm text-muted-foreground text-center">
                {isTranscribing
                  ? "Transcribing..."
                  : isRecording
                  ? "Recording... Tap to stop"
                  : "Tap to dictate description"}
              </p>
            </div>

            {/* Audio Waveform */}
            {(isRecording || isTranscribing) && (
              <div className="w-full">
                <AudioWaveform isRecording={isRecording} className="h-16" />
                {isTranscribing && (
                  <p className="text-xs text-center text-muted-foreground mt-2">Processing audio...</p>
                )}
              </div>
            )}

            {/* Transcript Preview */}
            {(transcript || rawTranscript) && !isRecording && !isTranscribing && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Transcribed Content</span>
                </div>
                <div className="rounded-lg border border-border bg-card p-3 max-h-32 overflow-y-auto">
                  <p className="text-sm text-muted-foreground">{rawTranscript || transcript}</p>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="space-y-2 pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Dictation Tips
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Describe the services provided</li>
                <li>• Mention consultation type</li>
                <li>• Include procedure details</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
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
  );
}