import { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, Check, X, Loader2, AlertCircle, Plus, Trash2, Ruler, Scale, StickyNote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Patient, Surgery, Pharmacy } from "@/hooks/usePatients";
import { useToast } from "@/hooks/use-toast";

interface PatientDetailsEditorProps {
  patient: Patient;
  onSave: (updates: Partial<Patient>) => Promise<any>;
}

export function PatientDetailsEditor({ patient, onSave }: PatientDetailsEditorProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    occupation: "",
    employer: "",
    referred_by: "",
    marital_status: "",
    id_passport_number: "",
    gender: "",
    physical_address: "",
    postal_address: "",
    same_as_physical: false,
    medical_aid: "",
    medical_insurance_product: "",
    medical_aid_number: "",
    primary_member: "",
    claims_email: "",
    general_practitioner: "",
    allergies: "",
    next_of_kin_name: "",
    next_of_kin_phone: "",
    next_of_kin_email: "",
    next_of_kin_relationship: "",
    height_cm: "",
    weight_kg: "",
    pharmacy_name: "",
    pharmacy_email: "",
    notes: "",
  });
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [newSurgery, setNewSurgery] = useState({ name: "", date: "", notes: "" });
  const [showAddSurgery, setShowAddSurgery] = useState(false);
  const [newPharmacy, setNewPharmacy] = useState({ name: "", email: "" });
  const [showAddPharmacy, setShowAddPharmacy] = useState(false);

  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name || "",
        email: patient.email || "",
        phone: patient.phone || "",
        dob: patient.dob || "",
        occupation: patient.occupation || "",
        employer: patient.employer || "",
        referred_by: patient.referred_by || "",
        marital_status: patient.marital_status || "",
        id_passport_number: patient.id_passport_number || "",
        gender: patient.gender || "",
        physical_address: patient.physical_address || "",
        postal_address: patient.postal_address || "",
        same_as_physical: patient.same_as_physical || false,
        medical_aid: patient.medical_aid || "",
        medical_insurance_product: patient.medical_insurance_product || "",
        medical_aid_number: patient.medical_aid_number || "",
        primary_member: patient.primary_member || "",
        claims_email: patient.claims_email || "",
        general_practitioner: patient.general_practitioner || "",
        allergies: patient.allergies || "",
        next_of_kin_name: patient.next_of_kin_name || "",
        next_of_kin_phone: patient.next_of_kin_phone || "",
        next_of_kin_email: patient.next_of_kin_email || "",
        next_of_kin_relationship: patient.next_of_kin_relationship || "",
        height_cm: patient.height_cm?.toString() || "",
        weight_kg: patient.weight_kg?.toString() || "",
        pharmacy_name: patient.pharmacy_name || "",
        pharmacy_email: patient.pharmacy_email || "",
        notes: patient.notes || "",
      });
      setSurgeries(patient.surgeries || []);
      // Migrate legacy single pharmacy into pharmacies array if needed
      const existingPharmacies = patient.pharmacies || [];
      if (existingPharmacies.length === 0 && (patient.pharmacy_name || patient.pharmacy_email)) {
        setPharmacies([{ id: crypto.randomUUID(), name: patient.pharmacy_name || "", email: patient.pharmacy_email || "", is_primary: true }]);
      } else {
        setPharmacies(existingPharmacies);
      }
      setHasChanges(false);
    }
  }, [patient]);

  const performSave = useCallback(async (data: typeof formData, surgeriesData: Surgery[]) => {
    if (!data.name.trim()) return;
    
    setSaving(true);
    await onSave({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      dob: data.dob || null,
      occupation: data.occupation || null,
      employer: data.employer || null,
      referred_by: data.referred_by || null,
      marital_status: data.marital_status || null,
      id_passport_number: data.id_passport_number || null,
      gender: data.gender || null,
      physical_address: data.physical_address || null,
      postal_address: data.same_as_physical ? data.physical_address : (data.postal_address || null),
      same_as_physical: data.same_as_physical,
      medical_aid: data.medical_aid || null,
      medical_aid_number: data.medical_aid_number || null,
      primary_member: data.primary_member || null,
      general_practitioner: data.general_practitioner || null,
      next_of_kin_name: data.next_of_kin_name || null,
      next_of_kin_phone: data.next_of_kin_phone || null,
      next_of_kin_email: data.next_of_kin_email || null,
      next_of_kin_relationship: data.next_of_kin_relationship || null,
      medical_insurance_product: data.medical_insurance_product || null,
      claims_email: data.claims_email || null,
      allergies: data.allergies || null,
      height_cm: data.height_cm ? parseFloat(data.height_cm) : null,
      weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
      surgeries: surgeriesData,
      pharmacies: pharmacies,
      pharmacy_name: pharmacies.find(p => p.is_primary)?.name || data.pharmacy_name || null,
      pharmacy_email: pharmacies.find(p => p.is_primary)?.email || data.pharmacy_email || null,
      notes: data.notes || null,
    });
    setSaving(false);
    setHasChanges(false);
  }, [onSave, pharmacies]);

  useEffect(() => {
    if (!isEditing || !hasChanges) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      performSave(formData, surgeries);
    }, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [formData, surgeries, pharmacies, isEditing, hasChanges, performSave]);

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleAddSurgery = () => {
    if (!newSurgery.name.trim() || !newSurgery.date) {
      toast({ title: "Required Fields", description: "Please enter surgery name and date", variant: "destructive" });
      return;
    }
    const surgery: Surgery = { id: crypto.randomUUID(), name: newSurgery.name.trim(), date: newSurgery.date, notes: newSurgery.notes.trim() || undefined };
    setSurgeries(prev => [...prev, surgery]);
    setNewSurgery({ name: "", date: "", notes: "" });
    setShowAddSurgery(false);
    setHasChanges(true);
  };

  const handleRemoveSurgery = (id: string) => {
    setSurgeries(prev => prev.filter(s => s.id !== id));
    setHasChanges(true);
  };

  const handleAddPharmacy = () => {
    if (!newPharmacy.name.trim()) {
      toast({ title: "Required", description: "Pharmacy name is required", variant: "destructive" });
      return;
    }
    const pharmacy: Pharmacy = {
      id: crypto.randomUUID(),
      name: newPharmacy.name.trim(),
      email: newPharmacy.email.trim() || "",
      is_primary: pharmacies.length === 0,
    };
    setPharmacies(prev => [...prev, pharmacy]);
    setNewPharmacy({ name: "", email: "" });
    setShowAddPharmacy(false);
    setHasChanges(true);
  };

  const handleRemovePharmacy = (id: string) => {
    setPharmacies(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (updated.length > 0 && !updated.some(p => p.is_primary)) {
        updated[0].is_primary = true;
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handleSetPrimaryPharmacy = (id: string) => {
    setPharmacies(prev => prev.map(p => ({ ...p, is_primary: p.id === id })));
    setHasChanges(true);
  };

  const handleCancel = () => {
    setFormData({
      name: patient.name || "", email: patient.email || "", phone: patient.phone || "",
      dob: patient.dob || "", occupation: patient.occupation || "", employer: patient.employer || "",
      referred_by: patient.referred_by || "", marital_status: patient.marital_status || "",
      id_passport_number: patient.id_passport_number || "", gender: patient.gender || "",
      physical_address: patient.physical_address || "", postal_address: patient.postal_address || "",
      same_as_physical: patient.same_as_physical || false, medical_aid: patient.medical_aid || "",
      medical_insurance_product: patient.medical_insurance_product || "",
      medical_aid_number: patient.medical_aid_number || "", primary_member: patient.primary_member || "",
      claims_email: patient.claims_email || "", general_practitioner: patient.general_practitioner || "",
      allergies: patient.allergies || "", next_of_kin_name: patient.next_of_kin_name || "",
      next_of_kin_phone: patient.next_of_kin_phone || "", next_of_kin_email: patient.next_of_kin_email || "",
      next_of_kin_relationship: patient.next_of_kin_relationship || "",
      height_cm: patient.height_cm?.toString() || "", weight_kg: patient.weight_kg?.toString() || "",
      pharmacy_name: patient.pharmacy_name || "", pharmacy_email: patient.pharmacy_email || "",
      notes: patient.notes || "",
    });
    setSurgeries(patient.surgeries || []);
    setIsEditing(false);
  };

  const calculateBMI = () => {
    const height = patient.height_cm;
    const weight = patient.weight_kg;
    if (height && weight && height > 0) {
      const heightInMeters = height / 100;
      return (weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return null;
  };

  const bmi = calculateBMI();
  const primaryPharmacy = pharmacies.find(p => p.is_primary) || pharmacies[0];

  // ==================== VIEW MODE ====================
  if (!isEditing) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Patient Details</h2>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </div>

        {/* 1. Personal Information */}
        <div className="rounded-xl border border-primary bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Pencil className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Personal Information</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><p className="text-sm text-muted-foreground">Full Name</p><p className="mt-1 text-foreground">{patient.name}</p></div>
            <div><p className="text-sm text-muted-foreground">ID/Passport Number</p><p className="mt-1 text-foreground">{patient.id_passport_number || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Gender</p><p className="mt-1 text-foreground">{patient.gender || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Date of Birth</p><p className="mt-1 text-foreground">{patient.dob ? format(new Date(patient.dob), "MMMM d, yyyy") : "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Email</p><p className="mt-1 text-foreground">{patient.email || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Phone</p><p className="mt-1 text-foreground">{patient.phone || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Marital Status</p><p className="mt-1 text-foreground">{patient.marital_status || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Referred By</p><p className="mt-1 text-foreground">{patient.referred_by || "Not provided"}</p></div>
          </div>
        </div>

        {/* 2. Addresses */}
        <div className="rounded-xl border border-primary bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <StickyNote className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Addresses</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-sm text-muted-foreground">Physical Address</p><p className="mt-1 text-foreground">{patient.physical_address || patient.address || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Postal Address</p><p className="mt-1 text-foreground">{patient.same_as_physical ? "Same as physical address" : (patient.postal_address || "Not provided")}</p></div>
          </div>
        </div>

        {/* 3. Next of Kin */}
        <div className="rounded-xl border border-primary bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Pencil className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Next of Kin</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-sm text-muted-foreground">Name</p><p className="mt-1 text-foreground">{patient.next_of_kin_name || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Relationship</p><p className="mt-1 text-foreground">{patient.next_of_kin_relationship || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Phone</p><p className="mt-1 text-foreground">{patient.next_of_kin_phone || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Email</p><p className="mt-1 text-foreground">{patient.next_of_kin_email || "Not provided"}</p></div>
          </div>
        </div>

        {/* 4. Employer */}
        <div className="rounded-xl border border-primary bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Pencil className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Employer</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-sm text-muted-foreground">Employer</p><p className="mt-1 text-foreground">{patient.employer || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Occupation</p><p className="mt-1 text-foreground">{patient.occupation || "Not provided"}</p></div>
          </div>
        </div>

        {/* 5. Medical Insurance */}
        <div className="rounded-xl border border-primary bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Pencil className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Medical Insurance</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><p className="text-sm text-muted-foreground">Insurance Provider</p><p className="mt-1 text-foreground">{patient.medical_aid || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Insurance Product</p><p className="mt-1 text-foreground">{patient.medical_insurance_product || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Insurance Number</p><p className="mt-1 text-foreground">{patient.medical_aid_number || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Primary Member</p><p className="mt-1 text-foreground">{patient.primary_member || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">Claims Email</p><p className="mt-1 text-foreground">{patient.claims_email || "Not provided"}</p></div>
            <div><p className="text-sm text-muted-foreground">General Practitioner</p><p className="mt-1 text-foreground">{patient.general_practitioner || "Not provided"}</p></div>
          </div>
        </div>

        {/* 6. Pharmacies */}
        <div className="rounded-xl border border-primary bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Pencil className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Pharmacies</h3>
          </div>
          {pharmacies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pharmacies recorded</p>
          ) : (
            <div className="space-y-2">
              {pharmacies.map((pharmacy) => (
                <div key={pharmacy.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <p className="font-medium text-foreground flex items-center gap-2">
                      {pharmacy.name}
                      {pharmacy.is_primary && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Primary</span>}
                    </p>
                    {pharmacy.email && <p className="text-sm text-muted-foreground">{pharmacy.email}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7. Physical Measurements */}
        <div className="rounded-xl border border-primary bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Ruler className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Physical Measurements</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Ruler className="h-5 w-5 text-primary" />
              <div><p className="text-sm text-muted-foreground">Height</p><p className="font-medium text-foreground">{patient.height_cm ? `${patient.height_cm} cm` : "Not recorded"}</p></div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Scale className="h-5 w-5 text-primary" />
              <div><p className="text-sm text-muted-foreground">Weight</p><p className="font-medium text-foreground">{patient.weight_kg ? `${patient.weight_kg} kg` : "Not recorded"}</p></div>
            </div>
            {bmi && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 sm:col-span-2">
                <div><p className="text-sm text-muted-foreground">BMI</p><p className="font-medium text-foreground">{bmi}</p></div>
              </div>
            )}
          </div>
        </div>

        {/* 8. Allergies */}
        <div className="rounded-xl border border-primary bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <AlertCircle className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Allergies</h3>
          </div>
          <div className="rounded-lg bg-muted/30 p-4 border border-border/50">
            <p className="text-foreground">{patient.allergies || "None recorded"}</p>
          </div>
        </div>

        {/* 9. Surgeries and Dates */}
        <div className="rounded-xl border border-primary bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Pencil className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Surgeries and Dates</h3>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setIsEditing(true); setShowAddSurgery(true); }}>
              <Plus className="h-3.5 w-3.5" /> Add Surgery
            </Button>
          </div>
          {surgeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No surgeries recorded</p>
          ) : (
            <div className="space-y-2">
              {surgeries.map((surgery) => (
                <div key={surgery.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <p className="font-medium text-foreground">{surgery.name}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(surgery.date), "MMMM d, yyyy")}</p>
                    {surgery.notes && <p className="text-sm text-muted-foreground mt-1">{surgery.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 10. General Notes */}
        <div className="rounded-xl border border-primary bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <StickyNote className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">General Notes</h3>
          </div>
          <div className="rounded-lg bg-muted/30 p-4 border border-border/50 min-h-[80px]">
            <p className="text-foreground whitespace-pre-wrap">{patient.notes || "No notes recorded"}</p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== EDIT MODE ====================
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Edit Patient Details</h2>
          {saving && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Saving...</span>}
          {!saving && !hasChanges && isEditing && <span className="flex items-center gap-1.5 text-xs text-green-600"><Check className="h-3 w-3" />Saved</span>}
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleCancel} disabled={saving}><X className="h-4 w-4" />Done</Button>
      </div>

      {/* 1. Personal Information */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Personal Information</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="name">Full Name *</Label><Input id="name" value={formData.name} onChange={(e) => updateFormData({ name: e.target.value })} placeholder="Patient name" /></div>
          <div className="space-y-2"><Label htmlFor="id_passport_number">ID/Passport Number</Label><Input id="id_passport_number" value={formData.id_passport_number} onChange={(e) => updateFormData({ id_passport_number: e.target.value })} placeholder="ID or passport number" /></div>
          <div className="space-y-2"><Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender} onValueChange={(value) => updateFormData({ gender: value })}>
              <SelectTrigger id="gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
            </Select></div>
          <div className="space-y-2"><Label htmlFor="dob">Date of Birth</Label><Input id="dob" type="date" value={formData.dob} onChange={(e) => updateFormData({ dob: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={(e) => updateFormData({ email: e.target.value })} placeholder="patient@email.com" /></div>
          <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={formData.phone} onChange={(e) => updateFormData({ phone: e.target.value })} placeholder="+1 (555) 123-4567" /></div>
          <div className="space-y-2"><Label htmlFor="marital_status">Marital Status</Label>
            <Select value={formData.marital_status} onValueChange={(value) => updateFormData({ marital_status: value })}>
              <SelectTrigger id="marital_status"><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent><SelectItem value="Single">Single</SelectItem><SelectItem value="Married">Married</SelectItem><SelectItem value="Divorced">Divorced</SelectItem><SelectItem value="Widowed">Widowed</SelectItem></SelectContent>
            </Select></div>
          <div className="space-y-2"><Label htmlFor="referred_by">Referred By</Label><Input id="referred_by" value={formData.referred_by} onChange={(e) => updateFormData({ referred_by: e.target.value })} placeholder="Referral source" /></div>
        </div>
      </div>

      {/* 2. Addresses */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Addresses</h3>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="physical_address">Physical Address</Label><Textarea id="physical_address" value={formData.physical_address} onChange={(e) => updateFormData({ physical_address: e.target.value })} placeholder="Enter physical address" rows={2} /></div>
          <div className="flex items-center space-x-2"><Checkbox id="same_as_physical" checked={formData.same_as_physical} onCheckedChange={(checked) => updateFormData({ same_as_physical: checked as boolean })} /><Label htmlFor="same_as_physical" className="text-sm">Postal address same as physical address</Label></div>
          {!formData.same_as_physical && (<div className="space-y-2"><Label htmlFor="postal_address">Postal Address</Label><Textarea id="postal_address" value={formData.postal_address} onChange={(e) => updateFormData({ postal_address: e.target.value })} placeholder="Enter postal address" rows={2} /></div>)}
        </div>
      </div>

      {/* 3. Next of Kin */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Next of Kin</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2"><Label htmlFor="next_of_kin_name">Name</Label><Input id="next_of_kin_name" value={formData.next_of_kin_name} onChange={(e) => updateFormData({ next_of_kin_name: e.target.value })} placeholder="Full name" /></div>
          <div className="space-y-2"><Label htmlFor="next_of_kin_relationship">Relationship</Label><Input id="next_of_kin_relationship" value={formData.next_of_kin_relationship} onChange={(e) => updateFormData({ next_of_kin_relationship: e.target.value })} placeholder="e.g. Spouse, Parent" /></div>
          <div className="space-y-2"><Label htmlFor="next_of_kin_phone">Phone</Label><Input id="next_of_kin_phone" value={formData.next_of_kin_phone} onChange={(e) => updateFormData({ next_of_kin_phone: e.target.value })} placeholder="Phone number" /></div>
          <div className="space-y-2"><Label htmlFor="next_of_kin_email">Email</Label><Input id="next_of_kin_email" type="email" value={formData.next_of_kin_email} onChange={(e) => updateFormData({ next_of_kin_email: e.target.value })} placeholder="Email address" /></div>
        </div>
      </div>

      {/* 4. Employer */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Employer</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="employer">Employer</Label><Input id="employer" value={formData.employer} onChange={(e) => updateFormData({ employer: e.target.value })} placeholder="Company name" /></div>
          <div className="space-y-2"><Label htmlFor="occupation">Occupation</Label><Input id="occupation" value={formData.occupation} onChange={(e) => updateFormData({ occupation: e.target.value })} placeholder="Job title" /></div>
        </div>
      </div>

      {/* 5. Medical Insurance */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Medical Insurance</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="medical_aid">Insurance Provider</Label><Input id="medical_aid" value={formData.medical_aid} onChange={(e) => updateFormData({ medical_aid: e.target.value })} placeholder="Insurance provider" /></div>
          <div className="space-y-2"><Label htmlFor="medical_insurance_product">Insurance Product</Label><Input id="medical_insurance_product" value={formData.medical_insurance_product} onChange={(e) => updateFormData({ medical_insurance_product: e.target.value })} placeholder="e.g., Executive Plan" /></div>
          <div className="space-y-2"><Label htmlFor="medical_aid_number">Insurance Number</Label><Input id="medical_aid_number" value={formData.medical_aid_number} onChange={(e) => updateFormData({ medical_aid_number: e.target.value })} placeholder="Member number" /></div>
          <div className="space-y-2"><Label htmlFor="primary_member">Primary Member</Label><Input id="primary_member" value={formData.primary_member} onChange={(e) => updateFormData({ primary_member: e.target.value })} placeholder="Primary member name" /></div>
          <div className="space-y-2"><Label htmlFor="claims_email">Claims Email</Label><Input id="claims_email" type="email" value={formData.claims_email} onChange={(e) => updateFormData({ claims_email: e.target.value })} placeholder="claims@insurance.com" /></div>
          <div className="space-y-2"><Label htmlFor="general_practitioner">General Practitioner</Label><Input id="general_practitioner" value={formData.general_practitioner} onChange={(e) => updateFormData({ general_practitioner: e.target.value })} placeholder="GP name" /></div>
        </div>
      </div>

      {/* 6. Pharmacies */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Pharmacies</h3>
          {!showAddPharmacy && <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddPharmacy(true)}><Plus className="h-3.5 w-3.5" />Add Pharmacy</Button>}
        </div>

        {showAddPharmacy && (
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 mb-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Pharmacy Name *</Label><Input value={newPharmacy.name} onChange={(e) => setNewPharmacy(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Clicks Pharmacy" /></div>
              <div className="space-y-2"><Label>Pharmacy Email</Label><Input type="email" value={newPharmacy.email} onChange={(e) => setNewPharmacy(prev => ({ ...prev, email: e.target.value }))} placeholder="pharmacy@email.com" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowAddPharmacy(false); setNewPharmacy({ name: "", email: "" }); }}>Cancel</Button>
              <Button size="sm" onClick={handleAddPharmacy}>Add Pharmacy</Button>
            </div>
          </div>
        )}

        {pharmacies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pharmacies recorded</p>
        ) : (
          <div className="space-y-2">
            {pharmacies.map((pharmacy) => (
              <div key={pharmacy.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleSetPrimaryPharmacy(pharmacy.id)} className="shrink-0" title="Set as primary">
                    <Star className={`h-4 w-4 ${pharmacy.is_primary ? 'fill-primary text-primary' : 'text-muted-foreground hover:text-primary'}`} />
                  </button>
                  <div>
                    <p className="font-medium text-foreground flex items-center gap-2">
                      {pharmacy.name}
                      {pharmacy.is_primary && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Primary</span>}
                    </p>
                    {pharmacy.email && <p className="text-sm text-muted-foreground">{pharmacy.email}</p>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemovePharmacy(pharmacy.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Physical Measurements */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Physical Measurements</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="height_cm">Height (cm)</Label><Input id="height_cm" type="number" step="0.1" value={formData.height_cm} onChange={(e) => updateFormData({ height_cm: e.target.value })} placeholder="e.g., 175" /></div>
          <div className="space-y-2"><Label htmlFor="weight_kg">Weight (kg)</Label><Input id="weight_kg" type="number" step="0.1" value={formData.weight_kg} onChange={(e) => updateFormData({ weight_kg: e.target.value })} placeholder="e.g., 70" /></div>
        </div>
      </div>

      {/* 8. Allergies */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide flex items-center gap-1.5"><AlertCircle className="h-4 w-4" />Allergies</h3>
        <Textarea id="allergies" value={formData.allergies} onChange={(e) => updateFormData({ allergies: e.target.value })} placeholder="List any allergies (medications, food, etc.)" rows={2} />
      </div>

      {/* 9. Surgeries and Dates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Surgeries and Dates</h3>
          {!showAddSurgery && <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddSurgery(true)}><Plus className="h-3.5 w-3.5" />Add Surgery</Button>}
        </div>
        {showAddSurgery && (
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 mb-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Surgery Name *</Label><Input value={newSurgery.name} onChange={(e) => setNewSurgery(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Appendectomy" /></div>
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={newSurgery.date} onChange={(e) => setNewSurgery(prev => ({ ...prev, date: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Notes (optional)</Label><Input value={newSurgery.notes} onChange={(e) => setNewSurgery(prev => ({ ...prev, notes: e.target.value }))} placeholder="Additional notes" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowAddSurgery(false); setNewSurgery({ name: "", date: "", notes: "" }); }}>Cancel</Button>
              <Button size="sm" onClick={handleAddSurgery}>Add Surgery</Button>
            </div>
          </div>
        )}
        {surgeries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No surgeries recorded</p>
        ) : (
          <div className="space-y-2">
            {surgeries.map((surgery) => (
              <div key={surgery.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div>
                  <p className="font-medium text-foreground">{surgery.name}</p>
                  <p className="text-sm text-muted-foreground">{format(new Date(surgery.date), "MMMM d, yyyy")}</p>
                  {surgery.notes && <p className="text-sm text-muted-foreground mt-1">{surgery.notes}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemoveSurgery(surgery.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 10. General Notes */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide flex items-center gap-2"><StickyNote className="h-4 w-4" />General Notes</h3>
        <Textarea id="notes" value={formData.notes} onChange={(e) => updateFormData({ notes: e.target.value })} placeholder="Enter any additional notes..." className="min-h-[120px] resize-none rounded-xl" rows={4} />
      </div>
    </div>
  );
}
