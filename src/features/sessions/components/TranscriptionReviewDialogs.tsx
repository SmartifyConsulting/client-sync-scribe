import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Pill, Receipt, UserPlus, Trash2, Plus } from "lucide-react";

interface MedCertData {
  patient_name?: string;
  diagnosis: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

interface PrescriptionMed {
  medication: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
}

interface PrescriptionData {
  medications: PrescriptionMed[];
}

interface InvoiceItem {
  description: string;
  amount: number;
}

interface InvoiceData {
  items: InvoiceItem[];
  total?: number;
}

interface ReferralData {
  specialist_type: string;
  doctor_name?: string;
  reason: string;
  urgency?: string;
}

// Medical Certificate Review Dialog
export function MedCertReviewDialog({
  open,
  onOpenChange,
  data,
  patientName,
  onApprove,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MedCertData;
  patientName: string;
  onApprove: (data: MedCertData) => void;
  loading?: boolean;
}) {
  const [formData, setFormData] = useState<MedCertData>({ ...data, patient_name: data.patient_name || patientName });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Review Medical Certificate
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Patient Name</Label>
            <Input value={formData.patient_name || ""} onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })} />
          </div>
          <div>
            <Label>Diagnosis / Reason</Label>
            <Textarea value={formData.diagnosis} onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Additional Notes</Label>
            <Textarea value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Skip</Button>
          <Button onClick={() => onApprove(formData)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Approve & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Prescription Review Dialog
export function PrescriptionReviewDialog({
  open,
  onOpenChange,
  data,
  onApprove,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PrescriptionData;
  onApprove: (data: PrescriptionData) => void;
  loading?: boolean;
}) {
  const [meds, setMeds] = useState<PrescriptionMed[]>([...data.medications]);

  const updateMed = (index: number, field: keyof PrescriptionMed, value: string) => {
    const updated = [...meds];
    updated[index] = { ...updated[index], [field]: value };
    setMeds(updated);
  };

  const removeMed = (index: number) => setMeds(meds.filter((_, i) => i !== index));
  const addMed = () => setMeds([...meds, { medication: "", dosage: "", frequency: "" }]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Review Prescription
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {meds.map((med, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Medication {i + 1}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeMed(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input placeholder="Medication name" value={med.medication} onChange={(e) => updateMed(i, "medication", e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Dosage" value={med.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} />
                <Input placeholder="Frequency" value={med.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Duration" value={med.duration || ""} onChange={(e) => updateMed(i, "duration", e.target.value)} />
                <Input placeholder="Instructions" value={med.instructions || ""} onChange={(e) => updateMed(i, "instructions", e.target.value)} />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1" onClick={addMed}>
            <Plus className="h-4 w-4" /> Add Medication
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Skip</Button>
          <Button onClick={() => onApprove({ medications: meds })} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Approve & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Invoice Review Dialog
export function InvoiceReviewDialog({
  open,
  onOpenChange,
  data,
  onApprove,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: InvoiceData;
  onApprove: (data: InvoiceData) => void;
  loading?: boolean;
}) {
  const [items, setItems] = useState<InvoiceItem[]>([...data.items]);

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const addItem = () => setItems([...items, { description: "", amount: 0 }]);
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Review Invoice
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input className="flex-1" placeholder="Service" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
              <Input className="w-24" type="number" placeholder="Amount" value={item.amount} onChange={(e) => updateItem(i, "amount", parseFloat(e.target.value) || 0)} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1" onClick={addItem}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
          <div className="flex justify-between font-semibold pt-2 border-t">
            <span>Total</span>
            <span>R {total.toFixed(2)}</span>
          </div>
        </div>
        <DialogFooter>

          <Button onClick={() => onApprove({ items, total })} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Approve & Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Referral Review Dialog
export function ReferralReviewDialog({
  open,
  onOpenChange,
  data,
  onApprove,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReferralData;
  onApprove: (data: ReferralData) => void;
  loading?: boolean;
}) {
  const [formData, setFormData] = useState<ReferralData>({ ...data });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Review Referral Letter
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Specialist Type</Label>
            <Input value={formData.specialist_type} onChange={(e) => setFormData({ ...formData, specialist_type: e.target.value })} />
          </div>
          <div>
            <Label>Doctor Name (if known)</Label>
            <Input value={formData.doctor_name || ""} onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })} />
          </div>
          <div>
            <Label>Reason for Referral</Label>
            <Textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
          </div>
          <div>
            <Label>Urgency</Label>
            <Input value={formData.urgency || "routine"} onChange={(e) => setFormData({ ...formData, urgency: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Skip</Button>
          <Button onClick={() => onApprove(formData)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Approve & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { MedCertData, PrescriptionData, PrescriptionMed, InvoiceData, InvoiceItem, ReferralData };
