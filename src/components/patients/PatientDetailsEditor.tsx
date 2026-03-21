import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { Pencil, Check, X, Loader2, AlertCircle, Plus, Trash2, Ruler, Scale, StickyNote, Star, Pill, Heart, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Patient, Surgery, Pharmacy, FamilyHistoryEntry } from "@/hooks/usePatients";
import { useToast } from "@/hooks/use-toast";

const PatientDocuments = lazy(() => import("@/pages/patient/PatientDocuments"));
const MyDoctors = lazy(() => import("@/pages/patient/MyDoctors"));
const PatientRoundTable = lazy(() => import("@/pages/patient/PatientRoundTable"));
const MyRewards = lazy(() => import("@/pages/patient/MyRewards"));
const PatientCalendar = lazy(() => import("@/pages/patient/PatientCalendar"));

interface PatientDetailsEditorProps {
  patient: Patient;
  onSave: (updates: Partial<Patient>) => Promise<any>;
  isSelfService?: boolean;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const ORGAN_OPTIONS = [
  "Heart", "Lungs", "Kidneys", "Liver", "Pancreas", "Corneas", "Skin", "Bone Marrow", "Intestines",
];

const sectionFrame = "rounded-xl border border-border bg-card p-4 shadow-sm";

export function PatientDetailsEditor({ patient, onSave, isSelfService = false }: PatientDetailsEditorProps) {
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
    reporting_to_email: "",
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
    blood_type: "",
    organ_donor: false,
  });
  const [organDonorOrgans, setOrganDonorOrgans] = useState<string[]>([]);
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [familyHistory, setFamilyHistory] = useState<FamilyHistoryEntry[]>([]);
  const [newSurgery, setNewSurgery] = useState({ name: "", date: "", notes: "" });
  const [showAddSurgery, setShowAddSurgery] = useState(false);
  const [newPharmacy, setNewPharmacy] = useState({ name: "", email: "" });
  const [showAddPharmacy, setShowAddPharmacy] = useState(false);
  const [newFamilyEntry, setNewFamilyEntry] = useState({ relation: "", condition: "" });
  const [showAddFamily, setShowAddFamily] = useState(false);

  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name || "",
        email: patient.email || "",
        phone: patient.phone || "",
        dob: patient.dob || "",
        occupation: patient.occupation || "",
        employer: patient.employer || "",
        reporting_to_email: patient.reporting_to_email || "",
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
        blood_type: patient.blood_type || "",
        organ_donor: patient.organ_donor || false,
      });
      setOrganDonorOrgans(patient.organ_donor_organs || []);
      setSurgeries(patient.surgeries || []);
      setFamilyHistory(patient.family_history || []);
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
      reporting_to_email: data.reporting_to_email || null,
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
      blood_type: data.blood_type || null,
      family_history: familyHistory,
      organ_donor: data.organ_donor,
      organ_donor_organs: organDonorOrgans,
    });
    setSaving(false);
    setHasChanges(false);
  }, [onSave, pharmacies, familyHistory, organDonorOrgans]);

  useEffect(() => {
    if (!isEditing || !hasChanges) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      performSave(formData, surgeries);
    }, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [formData, surgeries, pharmacies, familyHistory, organDonorOrgans, isEditing, hasChanges, performSave]);

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const toggleOrganDonorOrgan = (organ: string) => {
    setOrganDonorOrgans(prev => prev.includes(organ) ? prev.filter(o => o !== organ) : [...prev, organ]);
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

  const handleAddFamilyEntry = () => {
    if (!newFamilyEntry.relation.trim() || !newFamilyEntry.condition.trim()) {
      toast({ title: "Required", description: "Both relation and condition are required", variant: "destructive" });
      return;
    }
    setFamilyHistory(prev => [...prev, { id: crypto.randomUUID(), relation: newFamilyEntry.relation.trim(), condition: newFamilyEntry.condition.trim() }]);
    setNewFamilyEntry({ relation: "", condition: "" });
    setShowAddFamily(false);
    setHasChanges(true);
  };

  const handleRemoveFamilyEntry = (id: string) => {
    setFamilyHistory(prev => prev.filter(f => f.id !== id));
    setHasChanges(true);
  };

  const handleCancel = () => {
    setFormData({
      name: patient.name || "", email: patient.email || "", phone: patient.phone || "",
      dob: patient.dob || "", occupation: patient.occupation || "", employer: patient.employer || "",
      reporting_to_email: patient.reporting_to_email || "",
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
      blood_type: patient.blood_type || "",
      organ_donor: patient.organ_donor || false,
    });
    setOrganDonorOrgans(patient.organ_donor_organs || []);
    setSurgeries(patient.surgeries || []);
    setFamilyHistory(patient.family_history || []);
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

  const ViewField = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value || "Not provided"}</p>
    </div>
  );

  // Shared organ donor display
  const OrganDonorView = () => (
    <div>
      <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> Organ Donor</h3>
      {patient.organ_donor ? (
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300">Yes</span>
          {(patient.organ_donor_organs?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {patient.organ_donor_organs!.map(organ => (
                <span key={organ} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{organ}</span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">No</span>
      )}
    </div>
  );

  // ==================== VIEW MODE ====================
  if (!isEditing) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Patient Details</h2>
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => setIsEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>

        <Tabs defaultValue="personal">
          <TabsList className="bg-primary">
            <TabsTrigger value="personal" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Personal Information</TabsTrigger>
            <TabsTrigger value="medical" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Medical Information</TabsTrigger>
            {isSelfService && <TabsTrigger value="documents" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">My Documents</TabsTrigger>}
            {isSelfService && <TabsTrigger value="doctors" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">My Doctors</TabsTrigger>}
          </TabsList>

          {/* === PERSONAL INFORMATION TAB === */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className={sectionFrame}>
              <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Personal Details</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ViewField label="Full Name" value={patient.name} />
                <ViewField label="ID/Passport Number" value={patient.id_passport_number} />
                <ViewField label="Gender" value={patient.gender} />
                <ViewField label="Date of Birth" value={patient.dob ? format(new Date(patient.dob), "MMMM d, yyyy") : null} />
                <ViewField label="Email" value={patient.email} />
                <ViewField label="Phone" value={patient.phone} />
                <ViewField label="Marital Status" value={patient.marital_status} />
                <ViewField label="Referred By" value={patient.referred_by} />
              </div>
            </div>

            <div className={sectionFrame}>
              <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Addresses</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <ViewField label="Physical Address" value={patient.physical_address || patient.address} />
                <ViewField label="Postal Address" value={patient.same_as_physical ? "Same as physical address" : patient.postal_address} />
              </div>
            </div>

            <div className={sectionFrame}>
              <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Next of Kin</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ViewField label="Name" value={patient.next_of_kin_name} />
                <ViewField label="Relationship" value={patient.next_of_kin_relationship} />
                <ViewField label="Phone" value={patient.next_of_kin_phone} />
                <ViewField label="Email" value={patient.next_of_kin_email} />
              </div>
            </div>

            <div className={sectionFrame}>
              <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Employer</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ViewField label="Employer" value={patient.employer} />
                <ViewField label="Occupation" value={patient.occupation} />
                <ViewField label="Reporting To (Email)" value={patient.reporting_to_email} />
              </div>
            </div>

            <div className={sectionFrame}>
              <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5" /> General Notes
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">{patient.notes || "No notes recorded"}</p>
            </div>
          </TabsContent>

          {/* === MEDICAL INFORMATION TAB — TWO COLUMNS === */}
          <TabsContent value="medical" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Column 1: Medical Insurance & Pharmacies */}
              <div className="space-y-4">
                <div className={sectionFrame}>
                  <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Medical Insurance</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ViewField label="Insurance Provider" value={patient.medical_aid} />
                    <ViewField label="Insurance Product" value={patient.medical_insurance_product} />
                    <ViewField label="Insurance Number" value={patient.medical_aid_number} />
                    <ViewField label="Primary Member" value={patient.primary_member} />
                    <ViewField label="Claims Email" value={patient.claims_email} />
                    <ViewField label="General Practitioner" value={patient.general_practitioner} />
                  </div>
                </div>

                <div className={sectionFrame}>
                  <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Pharmacies</h3>
                  {pharmacies.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No pharmacies recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {pharmacies.map((pharmacy) => (
                        <div key={pharmacy.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                          <div>
                            <p className="text-sm font-medium text-foreground flex items-center gap-2">
                              {pharmacy.name}
                              {pharmacy.is_primary && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Primary</span>}
                            </p>
                            {pharmacy.email && <p className="text-xs text-muted-foreground">{pharmacy.email}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Physical, Blood, Allergies, Surgeries, Family History, Organ Donor */}
              <div className="space-y-4">
                <div className={sectionFrame}>
                  <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Physical Measurements</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <Ruler className="h-4 w-4 text-primary" />
                      <div><p className="text-xs text-muted-foreground">Height</p><p className="text-sm font-medium text-foreground">{patient.height_cm ? `${patient.height_cm} cm` : "—"}</p></div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <Scale className="h-4 w-4 text-primary" />
                      <div><p className="text-xs text-muted-foreground">Weight</p><p className="text-sm font-medium text-foreground">{patient.weight_kg ? `${patient.weight_kg} kg` : "—"}</p></div>
                    </div>
                    {bmi && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <div><p className="text-xs text-muted-foreground">BMI</p><p className="text-sm font-medium text-foreground">{bmi}</p></div>
                      </div>
                    )}
                  </div>
                </div>

                <div className={sectionFrame}>
                  <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Blood Type</h3>
                  <p className="text-sm text-foreground">{patient.blood_type || "Not recorded"}</p>
                </div>

                <div className={sectionFrame}>
                  <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Allergies</h3>
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
                    <p className="text-sm text-foreground">{patient.allergies || "None recorded"}</p>
                  </div>
                </div>

                <div className={sectionFrame}>
                  <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5"><Pill className="h-3.5 w-3.5" /> Chronic Medication</h3>
                  {patient.is_chronic ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive"><Pill className="h-3 w-3" />Chronic</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not on chronic medication</span>
                  )}
                </div>

                <div className={sectionFrame}>
                  <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Surgeries and Dates</h3>
                  {surgeries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No surgeries recorded</p>
                  ) : (
                    <div className="space-y-1.5">
                      {surgeries.map((surgery) => (
                        <div key={surgery.id} className="p-2 rounded-lg bg-muted/30 border border-border/50">
                          <p className="text-sm font-medium text-foreground">{surgery.name}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(surgery.date), "MMMM d, yyyy")}</p>
                          {surgery.notes && <p className="text-xs text-muted-foreground mt-0.5">{surgery.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={sectionFrame}>
                  <h3 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Family History</h3>
                  {familyHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No family history recorded</p>
                  ) : (
                    <div className="space-y-1.5">
                      {familyHistory.map((entry) => (
                        <div key={entry.id} className="p-2 rounded-lg bg-muted/30 border border-border/50">
                          <p className="text-sm font-medium text-foreground">{entry.relation}</p>
                          <p className="text-xs text-muted-foreground">{entry.condition}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={sectionFrame}>
                  <OrganDonorView />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* === MY DOCUMENTS TAB (only for self-service) === */}
          {isSelfService && (
            <TabsContent value="documents" className="mt-4">
              <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <PatientDocuments />
              </Suspense>
            </TabsContent>
          )}

          {/* === MY DOCTORS TAB (only for self-service) === */}
          {isSelfService && (
            <TabsContent value="doctors" className="mt-4">
              <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <MyDoctors />
              </Suspense>
            </TabsContent>
          )}
        </Tabs>
      </div>
    );
  }

  // ==================== EDIT MODE ====================
  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">Edit Patient Details</h2>
          {saving && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Saving...</span>}
          {!saving && !hasChanges && isEditing && <span className="flex items-center gap-1.5 text-xs text-green-600"><Check className="h-3 w-3" />Saved</span>}
        </div>
        <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleCancel} disabled={saving}><X className="h-3.5 w-3.5" />Done</Button>
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="bg-primary">
          <TabsTrigger value="personal" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Personal Information</TabsTrigger>
          <TabsTrigger value="medical" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Medical Information</TabsTrigger>
          {isSelfService && <TabsTrigger value="documents" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">My Documents</TabsTrigger>}
          {isSelfService && <TabsTrigger value="doctors" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">My Doctors</TabsTrigger>}
        </TabsList>

        {/* === PERSONAL TAB (EDIT) === */}
        <TabsContent value="personal" className="space-y-4 mt-4">
          <div className={sectionFrame}>
            <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Personal Information</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1"><Label className="text-xs" htmlFor="name">Full Name *</Label><Input id="name" className="text-sm" value={formData.name} onChange={(e) => updateFormData({ name: e.target.value })} placeholder="Patient name" /></div>
              <div className="space-y-1"><Label className="text-xs" htmlFor="id_passport_number">ID/Passport Number</Label><Input id="id_passport_number" className="text-sm" value={formData.id_passport_number} onChange={(e) => updateFormData({ id_passport_number: e.target.value })} placeholder="ID or passport number" /></div>
              <div className="space-y-1"><Label className="text-xs" htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => updateFormData({ gender: value })}>
                  <SelectTrigger id="gender" className="text-sm"><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select></div>
              <div className="space-y-1"><Label className="text-xs" htmlFor="dob">Date of Birth</Label><Input id="dob" className="text-sm" type="date" value={formData.dob} onChange={(e) => updateFormData({ dob: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs" htmlFor="email">Email</Label><Input id="email" className="text-sm" type="email" value={formData.email} onChange={(e) => updateFormData({ email: e.target.value })} placeholder="patient@email.com" /></div>
              <div className="space-y-1"><Label className="text-xs" htmlFor="phone">Phone</Label><Input id="phone" className="text-sm" value={formData.phone} onChange={(e) => updateFormData({ phone: e.target.value })} placeholder="+1 (555) 123-4567" /></div>
              <div className="space-y-1"><Label className="text-xs" htmlFor="marital_status">Marital Status</Label>
                <Select value={formData.marital_status} onValueChange={(value) => updateFormData({ marital_status: value })}>
                  <SelectTrigger id="marital_status" className="text-sm"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent><SelectItem value="Single">Single</SelectItem><SelectItem value="Married">Married</SelectItem><SelectItem value="Divorced">Divorced</SelectItem><SelectItem value="Widowed">Widowed</SelectItem></SelectContent>
                </Select></div>
              <div className="space-y-1"><Label className="text-xs" htmlFor="referred_by">Referred By</Label><Input id="referred_by" className="text-sm" value={formData.referred_by} onChange={(e) => updateFormData({ referred_by: e.target.value })} placeholder="Referral source" /></div>
            </div>
          </div>

          <div className={sectionFrame}>
            <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Addresses</h3>
            <div className="space-y-3">
              <div className="space-y-1"><Label className="text-xs" htmlFor="physical_address">Physical Address</Label><Textarea id="physical_address" className="text-sm" value={formData.physical_address} onChange={(e) => updateFormData({ physical_address: e.target.value })} placeholder="Enter physical address" rows={2} /></div>
              <div className="flex items-center space-x-2"><Checkbox id="same_as_physical" checked={formData.same_as_physical} onCheckedChange={(checked) => updateFormData({ same_as_physical: checked as boolean })} /><Label htmlFor="same_as_physical" className="text-xs">Postal address same as physical address</Label></div>
              {!formData.same_as_physical && (<div className="space-y-1"><Label className="text-xs" htmlFor="postal_address">Postal Address</Label><Textarea id="postal_address" className="text-sm" value={formData.postal_address} onChange={(e) => updateFormData({ postal_address: e.target.value })} placeholder="Enter postal address" rows={2} /></div>)}
            </div>
          </div>

          <div className={sectionFrame}>
            <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Next of Kin</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1"><Label className="text-xs" htmlFor="next_of_kin_name">Name</Label><Input id="next_of_kin_name" className="text-sm" value={formData.next_of_kin_name} onChange={(e) => updateFormData({ next_of_kin_name: e.target.value })} placeholder="Full name" /></div>
              <div className="space-y-1"><Label className="text-xs" htmlFor="next_of_kin_relationship">Relationship</Label><Input id="next_of_kin_relationship" className="text-sm" value={formData.next_of_kin_relationship} onChange={(e) => updateFormData({ next_of_kin_relationship: e.target.value })} placeholder="e.g. Spouse, Parent" /></div>
              <div className="space-y-1"><Label className="text-xs" htmlFor="next_of_kin_phone">Phone</Label><Input id="next_of_kin_phone" className="text-sm" value={formData.next_of_kin_phone} onChange={(e) => updateFormData({ next_of_kin_phone: e.target.value })} placeholder="Phone number" /></div>
              <div className="space-y-1"><Label className="text-xs" htmlFor="next_of_kin_email">Email</Label><Input id="next_of_kin_email" className="text-sm" type="email" value={formData.next_of_kin_email} onChange={(e) => updateFormData({ next_of_kin_email: e.target.value })} placeholder="Email address" /></div>
            </div>
          </div>

          <div className={sectionFrame}>
            <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Employer</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1"><Label className="text-xs" htmlFor="employer">Employer</Label><Input id="employer" className="text-sm" value={formData.employer} onChange={(e) => updateFormData({ employer: e.target.value })} placeholder="Company name" /></div>
              <div className="space-y-1"><Label className="text-xs" htmlFor="occupation">Occupation</Label><Input id="occupation" className="text-sm" value={formData.occupation} onChange={(e) => updateFormData({ occupation: e.target.value })} placeholder="Job title" /></div>
              <div className="space-y-1"><Label className="text-xs" htmlFor="reporting_to_email">Reporting To (Email)</Label><Input id="reporting_to_email" className="text-sm" type="email" value={formData.reporting_to_email} onChange={(e) => updateFormData({ reporting_to_email: e.target.value })} placeholder="manager@company.com" /></div>
            </div>
          </div>

          <div className={sectionFrame}>
            <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" /> General Notes
            </h3>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateFormData({ notes: e.target.value })}
              placeholder="General notes about this patient..."
              rows={4}
              className="text-sm"
            />
          </div>
        </TabsContent>

        {/* === MEDICAL TAB (EDIT) — TWO COLUMNS === */}
        <TabsContent value="medical" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Column 1: Insurance & Pharmacies */}
            <div className="space-y-4">
              <div className={sectionFrame}>
                <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Medical Insurance</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1"><Label className="text-xs">Insurance Provider</Label><Input className="text-sm" value={formData.medical_aid} onChange={(e) => updateFormData({ medical_aid: e.target.value })} placeholder="Insurance provider" /></div>
                  <div className="space-y-1"><Label className="text-xs">Insurance Product</Label><Input className="text-sm" value={formData.medical_insurance_product} onChange={(e) => updateFormData({ medical_insurance_product: e.target.value })} placeholder="Product name" /></div>
                  <div className="space-y-1"><Label className="text-xs">Insurance Number</Label><Input className="text-sm" value={formData.medical_aid_number} onChange={(e) => updateFormData({ medical_aid_number: e.target.value })} placeholder="Member number" /></div>
                  <div className="space-y-1"><Label className="text-xs">Primary Member</Label><Input className="text-sm" value={formData.primary_member} onChange={(e) => updateFormData({ primary_member: e.target.value })} placeholder="Primary member name" /></div>
                  <div className="space-y-1"><Label className="text-xs">Claims Email</Label><Input className="text-sm" type="email" value={formData.claims_email} onChange={(e) => updateFormData({ claims_email: e.target.value })} placeholder="claims@insurance.com" /></div>
                  <div className="space-y-1"><Label className="text-xs">General Practitioner</Label><Input className="text-sm" value={formData.general_practitioner} onChange={(e) => updateFormData({ general_practitioner: e.target.value })} placeholder="GP name" /></div>
                </div>
              </div>

              <div className={sectionFrame}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Pharmacies</h3>
                  {!showAddPharmacy && <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => setShowAddPharmacy(true)}><Plus className="h-3 w-3" />Add</Button>}
                </div>
                {showAddPharmacy && (
                  <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mb-3 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1"><Label className="text-xs">Name *</Label><Input className="text-sm" value={newPharmacy.name} onChange={(e) => setNewPharmacy(prev => ({ ...prev, name: e.target.value }))} placeholder="Pharmacy name" /></div>
                      <div className="space-y-1"><Label className="text-xs">Email</Label><Input className="text-sm" type="email" value={newPharmacy.email} onChange={(e) => setNewPharmacy(prev => ({ ...prev, email: e.target.value }))} placeholder="pharmacy@email.com" /></div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowAddPharmacy(false); setNewPharmacy({ name: "", email: "" }); }}>Cancel</Button>
                      <Button size="sm" className="text-xs h-7" onClick={handleAddPharmacy}>Add</Button>
                    </div>
                  </div>
                )}
                {pharmacies.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pharmacies recorded</p>
                ) : (
                  <div className="space-y-1.5">
                    {pharmacies.map((pharmacy) => (
                      <div key={pharmacy.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleSetPrimaryPharmacy(pharmacy.id)} className="text-xs text-primary hover:underline">
                            {pharmacy.is_primary ? <Star className="h-3.5 w-3.5 fill-primary text-primary" /> : <Star className="h-3.5 w-3.5 text-muted-foreground" />}
                          </button>
                          <div>
                            <p className="text-sm font-medium text-foreground">{pharmacy.name}</p>
                            {pharmacy.email && <p className="text-xs text-muted-foreground">{pharmacy.email}</p>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemovePharmacy(pharmacy.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Physical, Blood, Allergies, Chronic, Surgeries, Family History, Organ Donor */}
            <div className="space-y-4">
              <div className={sectionFrame}>
                <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Physical Measurements</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1"><Label className="text-xs" htmlFor="height_cm">Height (cm)</Label><Input id="height_cm" className="text-sm" type="number" step="0.1" value={formData.height_cm} onChange={(e) => updateFormData({ height_cm: e.target.value })} placeholder="e.g., 175" /></div>
                  <div className="space-y-1"><Label className="text-xs" htmlFor="weight_kg">Weight (kg)</Label><Input id="weight_kg" className="text-sm" type="number" step="0.1" value={formData.weight_kg} onChange={(e) => updateFormData({ weight_kg: e.target.value })} placeholder="e.g., 70" /></div>
                </div>
              </div>

              <div className={sectionFrame}>
                <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Blood Type</h3>
                <Select value={formData.blood_type} onValueChange={(value) => updateFormData({ blood_type: value })}>
                  <SelectTrigger className="w-[180px] text-sm"><SelectValue placeholder="Select blood type" /></SelectTrigger>
                  <SelectContent>
                    {BLOOD_TYPES.map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className={sectionFrame}>
                <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />Allergies</h3>
                <Textarea id="allergies" className="text-sm" value={formData.allergies} onChange={(e) => updateFormData({ allergies: e.target.value })} placeholder="List any allergies (medications, food, etc.)" rows={2} />
              </div>

              <div className={sectionFrame}>
                <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide flex items-center gap-1.5"><Pill className="h-3.5 w-3.5" />Chronic Medication</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_chronic"
                    checked={patient.is_chronic || false}
                    onCheckedChange={(checked) => { onSave({ is_chronic: checked as boolean }); }}
                  />
                  <Label htmlFor="is_chronic" className="text-xs">Patient is on chronic medication</Label>
                  {patient.is_chronic && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                      <Pill className="h-2.5 w-2.5" />Chronic
                    </span>
                  )}
                </div>
              </div>

              <div className={sectionFrame}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Surgeries and Dates</h3>
                  {!showAddSurgery && <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => setShowAddSurgery(true)}><Plus className="h-3 w-3" />Add</Button>}
                </div>
                {showAddSurgery && (
                  <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mb-3 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1"><Label className="text-xs">Surgery Name *</Label><Input className="text-sm" value={newSurgery.name} onChange={(e) => setNewSurgery(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Appendectomy" /></div>
                      <div className="space-y-1"><Label className="text-xs">Date *</Label><Input className="text-sm" type="date" value={newSurgery.date} onChange={(e) => setNewSurgery(prev => ({ ...prev, date: e.target.value }))} /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Notes (optional)</Label><Input className="text-sm" value={newSurgery.notes} onChange={(e) => setNewSurgery(prev => ({ ...prev, notes: e.target.value }))} placeholder="Additional notes" /></div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowAddSurgery(false); setNewSurgery({ name: "", date: "", notes: "" }); }}>Cancel</Button>
                      <Button size="sm" className="text-xs h-7" onClick={handleAddSurgery}>Add</Button>
                    </div>
                  </div>
                )}
                {surgeries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No surgeries recorded</p>
                ) : (
                  <div className="space-y-1.5">
                    {surgeries.map((surgery) => (
                      <div key={surgery.id} className="flex items-start justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                          <p className="text-sm font-medium text-foreground">{surgery.name}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(surgery.date), "MMMM d, yyyy")}</p>
                          {surgery.notes && <p className="text-xs text-muted-foreground mt-0.5">{surgery.notes}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveSurgery(surgery.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={sectionFrame}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Family History</h3>
                  {!showAddFamily && <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => setShowAddFamily(true)}><Plus className="h-3 w-3" />Add</Button>}
                </div>
                {showAddFamily && (
                  <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mb-3 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1"><Label className="text-xs">Relation *</Label><Input className="text-sm" value={newFamilyEntry.relation} onChange={(e) => setNewFamilyEntry(prev => ({ ...prev, relation: e.target.value }))} placeholder="e.g., Mother" /></div>
                      <div className="space-y-1"><Label className="text-xs">Condition *</Label><Input className="text-sm" value={newFamilyEntry.condition} onChange={(e) => setNewFamilyEntry(prev => ({ ...prev, condition: e.target.value }))} placeholder="e.g., Diabetes" /></div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowAddFamily(false); setNewFamilyEntry({ relation: "", condition: "" }); }}>Cancel</Button>
                      <Button size="sm" className="text-xs h-7" onClick={handleAddFamilyEntry}>Add</Button>
                    </div>
                  </div>
                )}
                {familyHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No family history recorded</p>
                ) : (
                  <div className="space-y-1.5">
                    {familyHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                          <p className="text-sm font-medium text-foreground">{entry.relation}</p>
                          <p className="text-xs text-muted-foreground">{entry.condition}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveFamilyEntry(entry.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Organ Donor */}
              <div className={sectionFrame}>
                <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> Organ Donor</h3>
                <div className="flex items-center gap-3 mb-3">
                  <Switch
                    checked={formData.organ_donor}
                    onCheckedChange={(checked) => {
                      updateFormData({ organ_donor: checked });
                      if (!checked) {
                        setOrganDonorOrgans([]);
                        setHasChanges(true);
                      }
                    }}
                  />
                  <Label className="text-xs">{formData.organ_donor ? "Yes" : "No"}</Label>
                </div>
                {formData.organ_donor && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ORGAN_OPTIONS.map(organ => (
                      <div key={organ} className="flex items-center space-x-2">
                        <Checkbox
                          id={`organ-${organ}`}
                          checked={organDonorOrgans.includes(organ)}
                          onCheckedChange={() => toggleOrganDonorOrgan(organ)}
                        />
                        <Label htmlFor={`organ-${organ}`} className="text-xs">{organ}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* === DOCUMENTS TAB (EDIT — same as view) === */}
        {isSelfService && (
          <TabsContent value="documents" className="mt-4">
            <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
              <PatientDocuments />
            </Suspense>
          </TabsContent>
        )}

        {/* === MY DOCTORS TAB (EDIT — same as view) === */}
        {isSelfService && (
          <TabsContent value="doctors" className="mt-4">
            <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
              <MyDoctors />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
