import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { AddressAutocomplete } from "@/components/patients/AddressAutocomplete";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Pencil, Check, X, Loader2, AlertCircle, Plus, Trash2, Ruler, Scale, StickyNote, Star, Pill, Heart, User, MapPin, Users, Briefcase, ShieldCheck, Store, Activity, Droplets, Scissors, GitBranch, Share2, Camera, Mail, Link2, Eye, Phone, HeartPulse, Settings, ChevronDown, Bell, LayoutDashboard, CheckSquare } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Patient, Surgery, Pharmacy, FamilyHistoryEntry, NextOfKinMember, CurrentMedication, ConditionDiagnosis } from "@/hooks/usePatients";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";

const PatientDocuments = lazy(() => import("@/pages/patient/PatientDocuments"));
const MyDoctors = lazy(() => import("@/pages/patient/MyDoctors"));
const PatientRoundTable = lazy(() => import("@/pages/patient/PatientRoundTable"));
const PatientCalendarLazy = lazy(() => import("@/pages/patient/PatientCalendar"));

const SettingsContentLazy = lazy(() => import("@/components/settings/SettingsContent").then(m => ({ default: m.SettingsContent })));
const SessionHistoryTableLazy = lazy(() => import("@/components/patients/SessionHistoryTable").then(m => ({ default: m.SessionHistoryTable })));
const PatientDashboardLazy = lazy(() => import("@/pages/patient/PatientDashboard"));
const PatientTasksLazy = lazy(() => import("@/pages/patient/PatientTasks"));

interface PatientDetailsEditorProps {
  patient: Patient;
  onSave: (updates: Partial<Patient>) => Promise<any>;
  isSelfService?: boolean;
  userEmail?: string;
  lollipopCount?: number;
  rewardsLoading?: boolean;
  section?: string;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const ORGAN_OPTIONS = [
  "Heart", "Lungs", "Kidneys", "Liver", "Pancreas", "Corneas", "Skin", "Bone Marrow", "Intestines",
];

const RELATIONSHIP_OPTIONS = ["Spouse", "Parent", "Child", "Sibling", "Grandparent", "Friend", "Partner", "Guardian"];

const COUNTRY_CODES = [
  { code: "+27", label: "🇿🇦 +27" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+61", label: "🇦🇺 +61" },
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+49", label: "🇩🇪 +49" },
  { code: "+33", label: "🇫🇷 +33" },
  { code: "+86", label: "🇨🇳 +86" },
  { code: "+81", label: "🇯🇵 +81" },
  { code: "+55", label: "🇧🇷 +55" },
  { code: "+234", label: "🇳🇬 +234" },
  { code: "+254", label: "🇰🇪 +254" },
  { code: "+971", label: "🇦🇪 +971" },
];

const sectionFrame = "rounded-xl border border-primary bg-card p-4 shadow-sm";

// Reusable collapsible section header with neutral background and black text
// Supports optional per-section edit/save/cancel icons
const SectionHeader = ({ icon: Icon, label, extra, isEditing, isSaving, hasChanges, onEdit, onSave, onCancel }: {
  icon: any; label: string; extra?: React.ReactNode;
  isEditing?: boolean; isSaving?: boolean; hasChanges?: boolean;
  onEdit?: () => void; onSave?: () => void; onCancel?: () => void;
}) => (
  <CollapsibleTrigger className="flex w-full items-center justify-between bg-[#F5F4F1] rounded-lg px-3 py-2 group">
    <h3 className="text-xs font-semibold text-foreground tracking-wide flex items-center gap-1.5 text-left">
      <Icon className="h-3.5 w-3.5" /> {label}
    </h3>
    <div className="flex items-center gap-2">
      {extra}
      {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      {isEditing && hasChanges && onSave && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onSave(); }} className="p-0.5 rounded hover:bg-green-100 text-green-600" title="Save">
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
      {isEditing && onCancel && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onCancel(); }} className="p-0.5 rounded hover:bg-red-100 text-red-500" title="Cancel">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {!isEditing && onEdit && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-0.5 rounded hover:bg-muted text-muted-foreground" title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <ChevronDown className="h-4 w-4 text-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
    </div>
  </CollapsibleTrigger>
);

// Phone input with country code
const PhoneInput = ({ value, onChange, placeholder = "Phone number" }: { value: string; onChange: (v: string) => void; placeholder?: string }) => {
  const getCountryCode = (phone: string) => {
    for (const cc of COUNTRY_CODES) {
      if (phone.startsWith(cc.code)) return cc.code;
    }
    return "+27";
  };
  const getNumber = (phone: string) => {
    const cc = getCountryCode(phone);
    return phone.startsWith(cc) ? phone.slice(cc.length).trim() : phone;
  };
  const [countryCode, setCountryCode] = useState(getCountryCode(value || ""));
  const [number, setNumber] = useState(getNumber(value || ""));

  useEffect(() => {
    if (value) {
      setCountryCode(getCountryCode(value));
      setNumber(getNumber(value));
    }
  }, [value]);

  const handleChange = (newCode: string, newNum: string) => {
    setCountryCode(newCode);
    setNumber(newNum);
    onChange(newNum ? `${newCode} ${newNum}` : "");
  };

  return (
    <div className="flex gap-1">
      <Select value={countryCode} onValueChange={(v) => handleChange(v, number)}>
        <SelectTrigger className="w-[90px] text-xs shrink-0"><SelectValue /></SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map(cc => <SelectItem key={cc.code} value={cc.code}>{cc.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input className="text-sm flex-1" value={number} onChange={(e) => handleChange(countryCode, e.target.value)} placeholder={placeholder} />
    </div>
  );
};

// Relationship select with "Other" option
const RelationshipSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [showOther, setShowOther] = useState(!RELATIONSHIP_OPTIONS.includes(value) && !!value);

  if (showOther) {
    return (
      <div className="flex gap-1">
        <Input className="text-sm flex-1" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Type relationship" />
        <Button variant="ghost" size="sm" className="text-xs h-9 shrink-0" onClick={() => { setShowOther(false); onChange(""); }}>List</Button>
      </div>
    );
  }

  return (
    <Select value={RELATIONSHIP_OPTIONS.includes(value) ? value : ""} onValueChange={(v) => { if (v === "__other__") { setShowOther(true); onChange(""); } else onChange(v); }}>
      <SelectTrigger className="text-sm"><SelectValue placeholder="Select relationship" /></SelectTrigger>
      <SelectContent>
        {RELATIONSHIP_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        <SelectItem value="__other__">Other...</SelectItem>
      </SelectContent>
    </Select>
  );
};

// Format surgery date based on precision
const formatSurgeryDate = (date: string, precision?: string) => {
  try {
    if (precision === 'year') return date.slice(0, 4);
    if (precision === 'month') {
      const [y, m] = date.split('-');
      const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      return `${months[parseInt(m) - 1]} ${y}`;
    }
    return format(new Date(date), "MMMM d, yyyy");
  } catch { return date; }
};

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();
  useEffect(() => {
    if (target <= 0) { setCount(0); return; }
    startRef.current = undefined;
    const duration = 1500;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);
  return <span>{count}</span>;
}

const SECTION_TABS: Record<string, string[]> = {
  home: ["dashboard"],
  health: ["personal", "medical"],
  care: ["doctors", "sessions", "roundtable"],
  admin: ["calendar", "tasks", "documents"],
};

export function PatientDetailsEditor({ patient, onSave, isSelfService = false, userEmail, lollipopCount = 0, rewardsLoading = false, section }: PatientDetailsEditorProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { isDoctor } = useUserRole();
  const [isEditing, setIsEditing] = useState(false);
  const [editingSections, setEditingSections] = useState<Record<string, boolean>>({});
  const [activeParentTab, setActiveParentTab] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Controlled tab state for dynamic navigation
  const getInitialTab = () => {
    if (isMobile && isSelfService && section && SECTION_TABS[section]) {
      return SECTION_TABS[section][0];
    }
    return "personal";
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    if (isMobile && isSelfService && section && SECTION_TABS[section]) {
      setActiveTab(SECTION_TABS[section][0]);
    }
  }, [section, isMobile, isSelfService]);

  // Split name helper
  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return { first: fullName, last: "" };
    return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
  };

  const initFirst = patient.first_name || splitName(patient.name).first;
  const initLast = patient.last_name || splitName(patient.name).last;

  const [formData, setFormData] = useState({
    first_name: initFirst,
    last_name: initLast,
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
  const [iceContacts, setIceContacts] = useState<any[]>([]);
  const [nokMembers, setNokMembers] = useState<NextOfKinMember[]>([]);
  const [currentMedications, setCurrentMedications] = useState<CurrentMedication[]>([]);
  const [conditionsDiagnoses, setConditionsDiagnoses] = useState<ConditionDiagnosis[]>([]);
  const [newSurgery, setNewSurgery] = useState({ name: "", date: "", notes: "", date_precision: "exact" as 'exact' | 'month' | 'year' });
  const [showAddSurgery, setShowAddSurgery] = useState(false);
  const [editingSurgeryId, setEditingSurgeryId] = useState<string | null>(null);
  const [newPharmacy, setNewPharmacy] = useState({ name: "", email: "", branch: "" });
  const [showAddPharmacy, setShowAddPharmacy] = useState(false);
  const [editingPharmacyId, setEditingPharmacyId] = useState<string | null>(null);
  const [newFamilyEntry, setNewFamilyEntry] = useState({ relation: "", condition: "" });
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [showAddICE, setShowAddICE] = useState(false);
  const [newICE, setNewICE] = useState({ name: "", phone: "", email: "", relationship: "" });
  const [showAddNOK, setShowAddNOK] = useState(false);
  const [newNOK, setNewNOK] = useState({ name: "", phone: "", email: "", relationship: "" });
  const [editingNOKId, setEditingNOKId] = useState<string | null>(null);
  const [editingICEId, setEditingICEId] = useState<string | null>(null);
  const [showAddMed, setShowAddMed] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", dosage: "", is_chronic: false, status: "current" as "current" | "past", start_date: "", end_date: "" });
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [showAddCondition, setShowAddCondition] = useState(false);
  const [newCondition, setNewCondition] = useState({ name: "", diagnosed_date: "", diagnosed_by: "", status: "active" as "active" | "resolved" });
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null);
  const [gpSearchResults, setGpSearchResults] = useState<any[]>([]);
  const [gpSearchOpen, setGpSearchOpen] = useState(false);
  const [gpSearchTerm, setGpSearchTerm] = useState("");

  // Fetch avatar for self-service patients
  useEffect(() => {
    if (isSelfService && patient.patient_user_id) {
      supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", patient.patient_user_id)
        .single()
        .then(({ data }) => {
          if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        });
    }
  }, [isSelfService, patient.patient_user_id]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patient.patient_user_id) return;
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${patient.patient_user_id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const newUrl = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", patient.patient_user_id);
      setAvatarUrl(newUrl);
      toast({ title: "Photo updated", description: "Your profile picture has been updated." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (patient) {
      const fn = patient.first_name || splitName(patient.name).first;
      const ln = patient.last_name || splitName(patient.name).last;
      setFormData({
        first_name: fn, last_name: ln, email: patient.email || "", phone: patient.phone || "",
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
        notes: patient.notes || "", blood_type: patient.blood_type || "", organ_donor: patient.organ_donor || false,
      });
      setOrganDonorOrgans(patient.organ_donor_organs || []);
      setSurgeries(patient.surgeries || []);
      setFamilyHistory(patient.family_history || []);
      setIceContacts(patient.ice_contacts || []);
      setNokMembers(patient.next_of_kin_members || []);
      setCurrentMedications(patient.current_medications || []);
      setConditionsDiagnoses(patient.conditions_diagnoses || []);
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
    if (!data.first_name.trim() && !data.last_name.trim()) return;
    const fullName = `${data.first_name.trim()} ${data.last_name.trim()}`.trim();
    const isChronic = currentMedications.some(m => m.is_chronic);
    setSaving(true);
    await onSave({
      name: fullName,
      first_name: data.first_name.trim() || null,
      last_name: data.last_name.trim() || null,
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
      ice_contacts: iceContacts,
      next_of_kin_members: nokMembers,
      current_medications: currentMedications,
      conditions_diagnoses: conditionsDiagnoses,
      is_chronic: isChronic,
    });
    setSaving(false);
    setHasChanges(false);
  }, [onSave, pharmacies, familyHistory, organDonorOrgans, iceContacts, nokMembers, currentMedications, conditionsDiagnoses]);

  useEffect(() => {
    if (!isEditing || !hasChanges) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      performSave(formData, surgeries);
    }, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [formData, surgeries, pharmacies, familyHistory, organDonorOrgans, iceContacts, nokMembers, currentMedications, conditionsDiagnoses, isEditing, hasChanges, performSave]);

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
    if (!isEditing) setIsEditing(true);
  };

  const toggleSectionEdit = (section: string) => {
    setEditingSections(prev => ({ ...prev, [section]: !prev[section] }));
    if (!isEditing) setIsEditing(true);
  };

  const cancelSectionEdit = (section: string) => {
    setEditingSections(prev => ({ ...prev, [section]: false }));
  };

  const saveSectionNow = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    performSave(formData, surgeries);
  };

  const isSectionEditing = (section: string) => editingSections[section] || false;

  const toggleOrganDonorOrgan = (organ: string) => {
    setOrganDonorOrgans(prev => prev.includes(organ) ? prev.filter(o => o !== organ) : [...prev, organ]);
    setHasChanges(true);
  };

  // Surgery handlers
  const handleAddSurgery = () => {
    if (!newSurgery.name.trim()) {
      toast({ title: "Required Fields", description: "Please enter surgery name", variant: "destructive" });
      return;
    }
    let dateVal = newSurgery.date;
    if (newSurgery.date_precision === 'year' && !dateVal) {
      toast({ title: "Required", description: "Please enter a year", variant: "destructive" }); return;
    }
    if (newSurgery.date_precision === 'month' && !dateVal) {
      toast({ title: "Required", description: "Please enter month/year", variant: "destructive" }); return;
    }
    if (newSurgery.date_precision === 'exact' && !dateVal) {
      toast({ title: "Required", description: "Please enter date", variant: "destructive" }); return;
    }

    if (editingSurgeryId) {
      setSurgeries(prev => prev.map(s => s.id === editingSurgeryId ? { ...s, name: newSurgery.name.trim(), date: dateVal, notes: newSurgery.notes.trim() || undefined, date_precision: newSurgery.date_precision } : s));
      setEditingSurgeryId(null);
    } else {
      const surgery: Surgery = { id: crypto.randomUUID(), name: newSurgery.name.trim(), date: dateVal, notes: newSurgery.notes.trim() || undefined, date_precision: newSurgery.date_precision };
      setSurgeries(prev => [...prev, surgery]);
    }
    setNewSurgery({ name: "", date: "", notes: "", date_precision: "exact" });
    setShowAddSurgery(false);
    setHasChanges(true);
  };

  const handleEditSurgery = (s: Surgery) => {
    setNewSurgery({ name: s.name, date: s.date, notes: s.notes || "", date_precision: s.date_precision || "exact" });
    setEditingSurgeryId(s.id);
    setShowAddSurgery(true);
  };

  const handleRemoveSurgery = (id: string) => {
    setSurgeries(prev => prev.filter(s => s.id !== id));
    setHasChanges(true);
  };

  // Pharmacy handlers
  const handleAddPharmacy = () => {
    if (!newPharmacy.name.trim()) {
      toast({ title: "Required", description: "Pharmacy name is required", variant: "destructive" }); return;
    }
    if (editingPharmacyId) {
      setPharmacies(prev => prev.map(p => p.id === editingPharmacyId ? { ...p, name: newPharmacy.name.trim(), email: newPharmacy.email.trim(), branch: newPharmacy.branch.trim() || undefined } : p));
      setEditingPharmacyId(null);
    } else {
      const pharmacy: Pharmacy = { id: crypto.randomUUID(), name: newPharmacy.name.trim(), email: newPharmacy.email.trim() || "", branch: newPharmacy.branch.trim() || undefined, is_primary: pharmacies.length === 0 };
      setPharmacies(prev => [...prev, pharmacy]);
    }
    setNewPharmacy({ name: "", email: "", branch: "" });
    setShowAddPharmacy(false);
    setHasChanges(true);
  };

  const handleEditPharmacy = (p: Pharmacy) => {
    setNewPharmacy({ name: p.name, email: p.email, branch: p.branch || "" });
    setEditingPharmacyId(p.id);
    setShowAddPharmacy(true);
  };

  const handleRemovePharmacy = (id: string) => {
    setPharmacies(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (updated.length > 0 && !updated.some(p => p.is_primary)) updated[0].is_primary = true;
      return updated;
    });
    setHasChanges(true);
  };

  const handleSetPrimaryPharmacy = (id: string) => {
    setPharmacies(prev => prev.map(p => ({ ...p, is_primary: p.id === id })));
    setHasChanges(true);
  };

  // Family history handlers
  const handleAddFamilyEntry = () => {
    if (!newFamilyEntry.relation.trim() || !newFamilyEntry.condition.trim()) {
      toast({ title: "Required", description: "Both relation and condition are required", variant: "destructive" }); return;
    }
    if (editingFamilyId) {
      setFamilyHistory(prev => prev.map(f => f.id === editingFamilyId ? { ...f, relation: newFamilyEntry.relation.trim(), condition: newFamilyEntry.condition.trim() } : f));
      setEditingFamilyId(null);
    } else {
      setFamilyHistory(prev => [...prev, { id: crypto.randomUUID(), relation: newFamilyEntry.relation.trim(), condition: newFamilyEntry.condition.trim() }]);
    }
    setNewFamilyEntry({ relation: "", condition: "" });
    setShowAddFamily(false);
    setHasChanges(true);
  };

  const handleEditFamilyEntry = (f: FamilyHistoryEntry) => {
    setNewFamilyEntry({ relation: f.relation, condition: f.condition });
    setEditingFamilyId(f.id);
    setShowAddFamily(true);
  };

  const handleRemoveFamilyEntry = (id: string) => {
    setFamilyHistory(prev => prev.filter(f => f.id !== id));
    setHasChanges(true);
  };

  // NOK members handlers
  const handleAddNOK = () => {
    if (!newNOK.name.trim()) { toast({ title: "Required", description: "Name is required", variant: "destructive" }); return; }
    if (editingNOKId) {
      setNokMembers(prev => prev.map(n => n.id === editingNOKId ? { ...n, ...newNOK, name: newNOK.name.trim() } : n));
      setEditingNOKId(null);
    } else {
      setNokMembers(prev => [...prev, { id: crypto.randomUUID(), ...newNOK, name: newNOK.name.trim() }]);
    }
    setNewNOK({ name: "", phone: "", email: "", relationship: "" });
    setShowAddNOK(false);
    setHasChanges(true);
  };

  const handleEditNOK = (n: NextOfKinMember) => {
    setNewNOK({ name: n.name, phone: n.phone, email: n.email, relationship: n.relationship });
    setEditingNOKId(n.id);
    setShowAddNOK(true);
  };

  // ICE contacts handlers
  const handleAddICE = () => {
    if (!newICE.name.trim()) { toast({ title: "Required", description: "Name is required", variant: "destructive" }); return; }
    if (editingICEId) {
      setIceContacts(prev => prev.map(c => c.id === editingICEId ? { ...c, ...newICE, name: newICE.name.trim() } : c));
      setEditingICEId(null);
    } else {
      setIceContacts(prev => [...prev, { id: crypto.randomUUID(), ...newICE, name: newICE.name.trim() }]);
    }
    setNewICE({ name: "", phone: "", email: "", relationship: "" });
    setShowAddICE(false);
    setHasChanges(true);
  };

  const handleEditICE = (c: any) => {
    setNewICE({ name: c.name, phone: c.phone, email: c.email, relationship: c.relationship });
    setEditingICEId(c.id);
    setShowAddICE(true);
  };

  // Current medications handlers
  const handleAddMed = () => {
    if (!newMed.name.trim()) { toast({ title: "Required", description: "Medication name is required", variant: "destructive" }); return; }
    if (editingMedId) {
      setCurrentMedications(prev => prev.map(m => m.id === editingMedId ? { ...m, name: newMed.name.trim(), dosage: newMed.dosage.trim() || undefined, is_chronic: newMed.is_chronic, status: newMed.status, start_date: newMed.start_date || undefined, end_date: newMed.end_date || undefined } : m));
      setEditingMedId(null);
    } else {
      setCurrentMedications(prev => [...prev, { id: crypto.randomUUID(), name: newMed.name.trim(), dosage: newMed.dosage.trim() || undefined, is_chronic: newMed.is_chronic, status: newMed.status, start_date: newMed.start_date || undefined, end_date: newMed.end_date || undefined }]);
    }
    setNewMed({ name: "", dosage: "", is_chronic: false, status: "current", start_date: "", end_date: "" });
    setShowAddMed(false);
    setHasChanges(true);
  };

  const handleEditMed = (m: CurrentMedication) => {
    setNewMed({ name: m.name, dosage: m.dosage || "", is_chronic: m.is_chronic, status: m.status || "current", start_date: m.start_date || "", end_date: m.end_date || "" });
    setEditingMedId(m.id);
    setShowAddMed(true);
  };

  // Conditions handlers
  const handleAddCondition = () => {
    if (!newCondition.name.trim()) { toast({ title: "Required", description: "Condition name is required", variant: "destructive" }); return; }
    if (editingConditionId) {
      setConditionsDiagnoses(prev => prev.map(c => c.id === editingConditionId ? { ...c, name: newCondition.name.trim(), diagnosed_date: newCondition.diagnosed_date || undefined, diagnosed_by: newCondition.diagnosed_by.trim() || undefined, status: newCondition.status } : c));
      setEditingConditionId(null);
    } else {
      setConditionsDiagnoses(prev => [...prev, { id: crypto.randomUUID(), name: newCondition.name.trim(), diagnosed_date: newCondition.diagnosed_date || undefined, diagnosed_by: newCondition.diagnosed_by.trim() || undefined, status: newCondition.status }]);
    }
    setNewCondition({ name: "", diagnosed_date: "", diagnosed_by: "", status: "active" });
    setShowAddCondition(false);
    setHasChanges(true);
  };

  const handleEditCondition = (c: ConditionDiagnosis) => {
    setNewCondition({ name: c.name, diagnosed_date: c.diagnosed_date || "", diagnosed_by: c.diagnosed_by || "", status: c.status });
    setEditingConditionId(c.id);
    setShowAddCondition(true);
  };

  const handleToggleMedChronic = (id: string) => {
    setCurrentMedications(prev => prev.map(m => m.id === id ? { ...m, is_chronic: !m.is_chronic } : m));
    setHasChanges(true);
  };

  // GP search
  const searchGP = async (term: string) => {
    setGpSearchTerm(term);
    updateFormData({ general_practitioner: term });
    if (term.length < 2) { setGpSearchResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, practice_number, doctor_number, specialty")
      .or(`full_name.ilike.%${term}%,practice_number.ilike.%${term}%,doctor_number.ilike.%${term}%`)
      .limit(5);
    setGpSearchResults(data || []);
    if ((data || []).length > 0) setGpSearchOpen(true);
  };

  const handleCancel = () => {
    const fn = patient.first_name || splitName(patient.name).first;
    const ln = patient.last_name || splitName(patient.name).last;
    setFormData({
      first_name: fn, last_name: ln, email: patient.email || "", phone: patient.phone || "",
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
      notes: patient.notes || "", blood_type: patient.blood_type || "", organ_donor: patient.organ_donor || false,
    });
    setOrganDonorOrgans(patient.organ_donor_organs || []);
    setSurgeries(patient.surgeries || []);
    setFamilyHistory(patient.family_history || []);
    setIceContacts(patient.ice_contacts || []);
    setNokMembers(patient.next_of_kin_members || []);
    setCurrentMedications(patient.current_medications || []);
    setConditionsDiagnoses(patient.conditions_diagnoses || []);
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
  const isChronic = currentMedications.some(m => m.is_chronic);

  const ViewField = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value || "Not provided"} disabled className="bg-muted/50" />
    </div>
  );

  // Profile banner for self-service patients
  const ProfileBanner = () => {
    if (!isSelfService) return null;
    const initials = patient.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
    return (
      <div className={sectionFrame + " mb-4"}>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-primary">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={patient.name} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className={`absolute inset-0 flex items-center justify-center rounded-full transition-opacity ${avatarUrl ? "bg-black/40 opacity-0 group-hover:opacity-100" : "bg-black/30"}`}>
                {uploadingAvatar ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
              </div>
            </div>
            {!avatarUrl && <span className="text-[10px] text-muted-foreground">Tap to add photo</span>}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Welcome back</p>
            <h3 className="text-sm font-semibold text-foreground">{patient.name}</h3>
            <p className="text-xs text-muted-foreground">
              {(() => {
                const first = (patient.first_name || splitName(patient.name).first || "user").toLowerCase().replace(/\s+/g, "");
                const last = (patient.last_name || splitName(patient.name).last || "patient").toLowerCase().replace(/\s+/g, "");
                return `${first}.${last}@holarc.health`;
              })()}
            </p>
            {!rewardsLoading && lollipopCount !== undefined && (
              <div className="mt-2">
                <p className="text-[10px] text-muted-foreground">You have earned</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    <AnimatedCounter target={lollipopCount} />
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">Vulas</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ICE share handler
  const handleShareICE = () => {
    const info = [
      `Patient: ${patient.name}`,
      `DOB: ${patient.dob || 'N/A'}`,
      `Blood Type: ${patient.blood_type || 'N/A'}`,
      `Allergies: ${patient.allergies || 'None'}`,
      `Medications: ${currentMedications.map(m => m.name).join(', ') || 'None'}`,
      `GP: ${patient.general_practitioner || 'N/A'}`,
    ].join('\n');

    if (navigator.share) {
      navigator.share({ title: 'ICE - Patient Information', text: info });
    } else {
      navigator.clipboard.writeText(info);
      toast({ title: "Copied", description: "ICE information copied to clipboard" });
    }
  };

  // Per-record share handler for NOK and ICE contacts
  const handleShareRecord = (type: 'nok' | 'ice', record: { id: string; name: string; phone: string; email: string }) => {
    const shareUrl = `${window.location.origin}/patient/${patient.id}`;
    const text = `${record.name} - Emergency Contact for ${patient.name}\n${shareUrl}`;

    if (type === 'ice') {
      setIceContacts(prev => prev.map(c => c.id === record.id ? { ...c, shared: true } : c));
    } else {
      setNokMembers(prev => prev.map(n => n.id === record.id ? { ...n, shared: true } : n));
    }
    setHasChanges(true);

    if (navigator.share) {
      navigator.share({ title: `Emergency Contact - ${record.name}`, text, url: shareUrl });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Link copied", description: `Share link for ${record.name} copied to clipboard` });
    }
  };

  // Handle ICE "Also Next of Kin" toggle
  const handleICEAsNOK = (iceId: string, checked: boolean) => {
    setIceContacts(prev => prev.map(c => c.id === iceId ? { ...c, is_also_nok: checked } : c));
    const contact = iceContacts.find(c => c.id === iceId);
    if (checked && contact) {
      const alreadyExists = nokMembers.some(n => n.name === contact.name && n.phone === contact.phone);
      if (!alreadyExists) {
        setNokMembers(prev => [...prev, { id: crypto.randomUUID(), name: contact.name, phone: contact.phone, email: contact.email, relationship: contact.relationship }]);
      }
    } else if (!checked && contact) {
      setNokMembers(prev => prev.filter(n => !(n.name === contact.name && n.phone === contact.phone)));
    }
    setHasChanges(true);
  };

  // Parent tab groups for desktop/tablet
  const PROFILE_TABS = ["personal", "medical"];
  const ADMIN_TABS = ["calendar", "tasks", "documents"];

  const handleParentTabClick = (parent: string, tabs: string[]) => {
    if (activeParentTab === parent) return;
    setActiveParentTab(parent);
    setActiveTab(tabs[0]);
  };

  // When activeTab changes, sync activeParentTab
  useEffect(() => {
    if (PROFILE_TABS.includes(activeTab)) setActiveParentTab("profile");
    else if (ADMIN_TABS.includes(activeTab)) setActiveParentTab("admin");
    else setActiveParentTab(null);
  }, [activeTab]);

  // Tab list renderer
  const renderTabsList = () => {
    const activeTabs = isMobile && isSelfService && section ? SECTION_TABS[section] || null : null;
    const show = (tab: string) => !activeTabs || activeTabs.includes(tab);
    const triggerClass = "data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs whitespace-nowrap";

    // Mobile: flat filtered tabs
    if (isMobile && isSelfService && section) {
      return (
        <TabsList className="bg-primary flex-nowrap overflow-x-auto scrollbar-hide w-full justify-start">
          {show("dashboard") && <TabsTrigger value="dashboard" className={triggerClass}>Dashboard</TabsTrigger>}
          {show("personal") && <TabsTrigger value="personal" className={triggerClass}>Personal Information</TabsTrigger>}
          {show("medical") && <TabsTrigger value="medical" className={triggerClass}>Medical Information</TabsTrigger>}
          {show("doctors") && <TabsTrigger value="doctors" className={triggerClass}>My H/Care Providers</TabsTrigger>}
          {show("sessions") && <TabsTrigger value="sessions" className={triggerClass}>My Sessions</TabsTrigger>}
          {show("calendar") && <TabsTrigger value="calendar" className={triggerClass}>My Calendar</TabsTrigger>}
          {show("tasks") && <TabsTrigger value="tasks" className={triggerClass}>My Tasks</TabsTrigger>}
          {show("documents") && <TabsTrigger value="documents" className={triggerClass}>My Documents</TabsTrigger>}
          {show("roundtable") && <TabsTrigger value="roundtable" className={triggerClass}>My Round Table</TabsTrigger>}
          
        </TabsList>
      );
    }

    // Desktop/Tablet: grouped tabs with My Profile and My Admin parent groups
    return (
      <div className="space-y-1">
        <TabsList className="bg-primary flex-nowrap overflow-x-auto scrollbar-hide w-full justify-start">
          {isSelfService && <TabsTrigger value="dashboard" className={triggerClass}>Dashboard</TabsTrigger>}
          {/* My Profile parent trigger */}
          <button
            type="button"
            onClick={() => handleParentTabClick("profile", PROFILE_TABS)}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium transition-all",
              activeParentTab === "profile" ? "bg-white text-black shadow-sm" : "text-white hover:bg-white/10"
            )}
          >
            My Profile
          </button>
          {isSelfService && <TabsTrigger value="doctors" className={triggerClass}>My H/Care Providers</TabsTrigger>}
          {isSelfService && <TabsTrigger value="sessions" className={triggerClass}>My Sessions</TabsTrigger>}
          {/* My Admin parent trigger */}
          {isSelfService && (
            <button
              type="button"
              onClick={() => handleParentTabClick("admin", ADMIN_TABS)}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium transition-all",
                activeParentTab === "admin" ? "bg-white text-black shadow-sm" : "text-white hover:bg-white/10"
              )}
            >
              My Admin
            </button>
          )}
          {isSelfService && <TabsTrigger value="roundtable" className={triggerClass}>My Round Table</TabsTrigger>}
        </TabsList>

        {/* Sub-tab row for My Profile */}
        {activeParentTab === "profile" && (
          <TabsList className="bg-muted flex-nowrap overflow-x-auto scrollbar-hide w-full justify-start">
            <TabsTrigger value="personal" className="text-xs whitespace-nowrap">Personal Information</TabsTrigger>
            <TabsTrigger value="medical" className="text-xs whitespace-nowrap">Medical Information</TabsTrigger>
          </TabsList>
        )}

        {/* Sub-tab row for My Admin */}
        {activeParentTab === "admin" && isSelfService && (
          <TabsList className="bg-muted flex-nowrap overflow-x-auto scrollbar-hide w-full justify-start">
            <TabsTrigger value="calendar" className="text-xs whitespace-nowrap">My Calendar</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs whitespace-nowrap">My Tasks</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs whitespace-nowrap">My Documents</TabsTrigger>
          </TabsList>
        )}
      </div>
    );
  };

  // ==================== VIEW MODE ====================
  if (!isEditing) {
    return (
      <div className="space-y-0">
        <ProfileBanner />
          <div className="rounded-xl border border-primary bg-card p-2 md:p-6 space-y-2 md:space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {renderTabsList()}
            {/* Status bar */}
            <div className="flex justify-end mt-2 items-center gap-2 min-h-[24px]">
              {saving && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Saving...</span>}
              {!saving && isEditing && !hasChanges && <span className="flex items-center gap-1.5 text-xs text-green-600"><Check className="h-3 w-3" />Saved</span>}
            </div>

            {/* === PERSONAL INFORMATION TAB === */}
            <TabsContent value="personal" className="space-y-4 mt-4">

              <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                <SectionHeader icon={User} label="Personal Details" onEdit={() => { setIsEditing(true); setEditingSections(prev => ({ ...prev, personal: true })); }} />
                <CollapsibleContent className="p-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <ViewField label="First Name(s)" value={patient.first_name || splitName(patient.name).first} />
                    <ViewField label="Last Name" value={patient.last_name || splitName(patient.name).last} />
                    <ViewField label="ID/Passport Number" value={patient.id_passport_number} />
                    <ViewField label="Gender" value={patient.gender} />
                    <ViewField label="Date of Birth" value={patient.dob ? format(new Date(patient.dob), "MMMM d, yyyy") : null} />
                    <ViewField label="Email" value={patient.email} />
                    <ViewField label="Phone" value={patient.phone} />
                    <ViewField label="Marital Status" value={patient.marital_status} />
                    <ViewField label="Language" value="English" />
                    <ViewField label="Referred By" value={patient.referred_by} />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                <SectionHeader icon={MapPin} label="Addresses" onEdit={() => { setIsEditing(true); setEditingSections(prev => ({ ...prev, addresses: true })); }} />
                <CollapsibleContent className="p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ViewField label="Physical Address" value={patient.physical_address || patient.address} />
                    <ViewField label="Postal Address" value={patient.same_as_physical ? "Same as physical address" : patient.postal_address} />
                  </div>
                </CollapsibleContent>
              </Collapsible>


              <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                <SectionHeader icon={Briefcase} label="Employer" onEdit={() => { setIsEditing(true); setEditingSections(prev => ({ ...prev, employer: true })); }} />
                <CollapsibleContent className="p-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <ViewField label="Employer" value={patient.employer} />
                    <ViewField label="Occupation" value={patient.occupation} />
                    <ViewField label="Line Manager Email Address (Optional)" value={patient.reporting_to_email} />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                <SectionHeader icon={StickyNote} label="General Notes" onEdit={() => { setIsEditing(true); setEditingSections(prev => ({ ...prev, notes: true })); }} />
                <CollapsibleContent className="p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{patient.notes || "No notes recorded"}</p>
                </CollapsibleContent>
              </Collapsible>
            </TabsContent>

            {/* === MEDICAL INFORMATION TAB — TWO COLUMNS === */}
            <TabsContent value="medical" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {/* General Information */}
                  <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                    <SectionHeader icon={Activity} label="General Information" />
                    <CollapsibleContent className="px-3 pb-3">
                      <div className="grid gap-3 sm:grid-cols-4">
                        <ViewField label="Height (cm)" value={patient.height_cm ? `${patient.height_cm}` : undefined} />
                        <ViewField label="Weight (kg)" value={patient.weight_kg ? `${patient.weight_kg}` : undefined} />
                        <ViewField label="BMI" value={bmi || undefined} />
                        <ViewField label="Blood Type" value={patient.blood_type} />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Allergies, Medication & Conditions */}
                  <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                    <SectionHeader icon={Pill} label="Allergies, Medication & Conditions" />
                    <CollapsibleContent className="px-3 pb-3 space-y-3">
                      {/* Allergies */}
                      <div className="rounded-lg border border-border/50 p-2.5 space-y-1">
                        <h4 className="text-xs font-semibold text-foreground tracking-wide flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" /> Allergies
                        </h4>
                        <p className="text-xs text-foreground">{patient.allergies || "None recorded"}</p>
                      </div>

                      {/* Medication */}
                      <div className="rounded-lg border border-border/50 p-2.5 space-y-1">
                        <h4 className="text-xs font-semibold text-foreground tracking-wide flex items-center gap-1.5">
                          <Pill className="h-3.5 w-3.5" /> Medication
                        </h4>
                        {currentMedications.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No medications recorded</p>
                        ) : (
                          <div className="space-y-1">
                            {currentMedications.map(m => (
                              <div key={m.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30 border border-border/50">
                                <Pill className="h-3 w-3 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-foreground">{m.name}{m.dosage ? ` — ${m.dosage}` : ""}</p>
                                  {(m.start_date || m.end_date) && (
                                    <p className="text-[10px] text-muted-foreground">
                                      {m.start_date ? format(new Date(m.start_date), "MMM yyyy") : "?"} — {m.end_date ? format(new Date(m.end_date), "MMM yyyy") : "Present"}
                                    </p>
                                  )}
                                </div>
                                <Badge className={`text-[8px] border-0 ${m.status === 'past' ? 'bg-muted text-muted-foreground' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                                  {m.status === 'past' ? 'Past' : 'Current'}
                                </Badge>
                                {m.is_chronic && <span className="inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive shrink-0">Chronic</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {isChronic && (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"><Pill className="h-2.5 w-2.5" />Chronic Patient</span>
                          </div>
                        )}
                      </div>

                      {/* Conditions & Diagnoses */}
                      <div className="rounded-lg border border-border/50 p-2.5 space-y-1">
                        <h4 className="text-xs font-semibold text-foreground tracking-wide flex items-center gap-1.5">
                          <HeartPulse className="h-3.5 w-3.5" /> Conditions & Diagnoses
                        </h4>
                        {conditionsDiagnoses.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No conditions recorded</p>
                        ) : (
                          <div className="space-y-1">
                            {conditionsDiagnoses.map(c => (
                              <div key={c.id} className="p-1.5 rounded-lg bg-primary/5 border border-primary/20">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground">{c.name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {c.diagnosed_date ? format(new Date(c.diagnosed_date), "MMM d, yyyy") : "Date unknown"}
                                      {c.diagnosed_by ? ` · Dr. ${c.diagnosed_by}` : ""}
                                    </p>
                                  </div>
                                  <Badge className={`text-[8px] border-0 ${c.status === 'resolved' ? 'bg-muted text-muted-foreground' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                    {c.status === 'resolved' ? 'Resolved' : 'Active'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Surgeries & Dates */}
                  <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                    <SectionHeader icon={Scissors} label="Surgeries & Dates" />
                    <CollapsibleContent className="px-3 pb-3">
                      {surgeries.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No surgeries recorded</p>
                      ) : (
                        <div className="space-y-1">
                          {surgeries.map((surgery) => (
                            <div key={surgery.id} className="p-1.5 rounded-lg bg-primary/5 border border-primary/20">
                              <p className="text-xs font-medium text-foreground">{surgery.name}</p>
                              <p className="text-[10px] text-muted-foreground">{formatSurgeryDate(surgery.date, surgery.date_precision)}</p>
                              {surgery.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{surgery.notes}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Family History */}
                  <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                    <SectionHeader icon={GitBranch} label="Family History" />
                    <CollapsibleContent className="px-3 pb-3">
                      {familyHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No family history recorded</p>
                      ) : (
                        <div className="space-y-1">
                          {familyHistory.map((entry) => (
                            <div key={entry.id} className="p-1.5 rounded-lg bg-primary/5 border border-primary/20">
                              <p className="text-xs font-medium text-foreground">{entry.relation}</p>
                              <p className="text-[10px] text-muted-foreground">{entry.condition}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Organ Donor — collapsible with inline Yes/No */}
                  <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                    <CollapsibleTrigger className="flex w-full items-center justify-between bg-primary rounded-lg px-3 py-2 group">
                       <h3 className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5 text-left">
                        <Heart className="h-3.5 w-3.5" /> Organ Donor
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          patient.organ_donor
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-white/20 text-white"
                        )}>
                          {patient.organ_donor ? "Yes" : "No"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-white transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-3 pb-3">
                      {patient.organ_donor && (patient.organ_donor_organs?.length ?? 0) > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {patient.organ_donor_organs!.map(organ => (
                            <span key={organ} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{organ}</span>
                          ))}
                        </div>
                      )}
                      {!patient.organ_donor && (
                        <p className="text-xs text-muted-foreground mt-2">Not registered as an organ donor</p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* Column 2 */}
                <div className="space-y-4">
                  <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                    <SectionHeader icon={ShieldCheck} label="Medical Insurance" />
                    <CollapsibleContent className="p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ViewField label="Insurance Provider" value={patient.medical_aid} />
                        <ViewField label="Insurance Product" value={patient.medical_insurance_product} />
                        <ViewField label="Insurance Number" value={patient.medical_aid_number} />
                        <ViewField label="Primary Member" value={patient.primary_member} />
                        <ViewField label="Claims Email (auto-submission)" value={patient.claims_email} />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Next of Kin - moved from Personal to Medical */}
                  <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                    <SectionHeader icon={Users} label="Next of Kin" />
                    <CollapsibleContent className="p-3">
                      {nokMembers.length > 0 ? (
                        <div className="space-y-2">
                          {nokMembers.map(nok => (
                            <div key={nok.id} className="flex items-center justify-between p-1.5 rounded-lg bg-muted/30 border border-border/50">
                              <div>
                                <p className="text-xs font-medium text-foreground">{nok.name} {nok.relationship && <span className="text-muted-foreground">({nok.relationship})</span>}</p>
                                {nok.phone && <p className="text-[10px] text-muted-foreground">{nok.phone}</p>}
                                {nok.email && <p className="text-[10px] text-muted-foreground">{nok.email}</p>}
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" title="Notify" onClick={() => toast({ title: "Notification sent", description: `${nok.name} has been notified` })}>
                                  <Bell className="h-3 w-3 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleShareRecord('nok', nok)}>
                                  <Share2 className={cn("h-3 w-3", nok.shared ? "text-muted-foreground" : "text-primary")} />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <ViewField label="Name" value={patient.next_of_kin_name} />
                          <ViewField label="Relationship" value={patient.next_of_kin_relationship} />
                          <ViewField label="Phone" value={patient.next_of_kin_phone} />
                          <ViewField label="Email" value={patient.next_of_kin_email} />
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                    <SectionHeader icon={User} label="General Practitioner" />
                    <CollapsibleContent className="p-3">
                      <ViewField label="General Practitioner" value={patient.general_practitioner} />
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                    <SectionHeader icon={Store} label="Pharmacies" />
                    <CollapsibleContent className="p-3">
                      {pharmacies.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No pharmacies recorded</p>
                      ) : (
                        <div className="space-y-2">
                          {pharmacies.map((pharmacy) => (
                            <div key={pharmacy.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                              <div>
                                <p className="text-xs font-medium text-foreground flex items-center gap-2">
                                  {pharmacy.name}
                                  {pharmacy.branch && <span className="text-muted-foreground">({pharmacy.branch})</span>}
                                  {pharmacy.is_primary && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Primary</span>}
                                </p>
                                {pharmacy.email && <p className="text-[10px] text-muted-foreground">{pharmacy.email}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </TabsContent>

            {/* === DASHBOARD TAB === */}
            {isSelfService && (
              <TabsContent value="dashboard" className="mt-4">
                <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                  <PatientDashboardLazy />
                </Suspense>
              </TabsContent>
            )}

            {/* === TASKS TAB === */}
            {isSelfService && (
              <TabsContent value="tasks" className="mt-4">
                <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                  <PatientTasksLazy />
                </Suspense>
              </TabsContent>
            )}

            {isSelfService && (
              <TabsContent value="sessions" className="mt-4">
                <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                  <SessionHistoryTableLazy sessions={[]} patientId={patient.id} patientName={patient.name} />
                </Suspense>
              </TabsContent>
            )}

            {isSelfService && (
              <TabsContent value="calendar" className="mt-4">
                <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                  <PatientCalendarLazy />
                </Suspense>
              </TabsContent>
            )}

            {isSelfService && (
              <TabsContent value="documents" className="mt-4">
                <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                  <PatientDocuments hideHeader />
                </Suspense>
              </TabsContent>
            )}

            {isSelfService && (
              <TabsContent value="doctors" className="mt-4">
                <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                  <MyDoctors hideHeader />
                </Suspense>
              </TabsContent>
            )}

            {isSelfService && (
              <TabsContent value="roundtable" className="mt-4">
                <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                  <PatientRoundTable hideHeader />
                </Suspense>
              </TabsContent>
            )}


          </Tabs>
        </div>
      </div>
    );
  }

  // ==================== EDIT MODE ====================
  return (
    <div className="space-y-0">
      <ProfileBanner />
      <div className="rounded-xl border border-primary bg-card p-2 md:p-6 space-y-2 md:space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {renderTabsList()}
            <div className="flex justify-end mt-2 items-center gap-2">
              {saving && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Saving...</span>}
              {!saving && !hasChanges && isEditing && <span className="flex items-center gap-1.5 text-xs text-green-600"><Check className="h-3 w-3" />Saved</span>}
              <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleCancel} disabled={saving}><X className="h-3.5 w-3.5" />Done</Button>
            </div>

          {/* === PERSONAL TAB (EDIT) === */}
          <TabsContent value="personal" className="space-y-4 mt-4">

            <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
              <SectionHeader icon={User} label="Personal Information" />
              <CollapsibleContent className="p-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5"><Label htmlFor="first_name">First Name(s) *</Label><Input id="first_name" className="text-sm" value={formData.first_name} onChange={(e) => updateFormData({ first_name: e.target.value })} placeholder="First name(s)" /></div>
                  <div className="space-y-1.5"><Label htmlFor="last_name">Last Name *</Label><Input id="last_name" className="text-sm" value={formData.last_name} onChange={(e) => updateFormData({ last_name: e.target.value })} placeholder="Last name" /></div>
                  <div className="space-y-1.5"><Label htmlFor="id_passport_number">ID/Passport Number</Label><Input id="id_passport_number" className="text-sm" value={formData.id_passport_number} onChange={(e) => updateFormData({ id_passport_number: e.target.value })} placeholder="ID or passport number" /></div>
                  <div className="space-y-1.5"><Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender} onValueChange={(value) => updateFormData({ gender: value })}>
                      <SelectTrigger id="gender" className="text-sm"><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                    </Select></div>
                  <div className="space-y-1.5"><Label htmlFor="dob">Date of Birth</Label><Input id="dob" className="text-sm" type="date" value={formData.dob} onChange={(e) => updateFormData({ dob: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" className="text-sm" type="email" value={formData.email} onChange={(e) => updateFormData({ email: e.target.value })} placeholder="patient@email.com" /></div>
                  <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><PhoneInput value={formData.phone} onChange={(v) => updateFormData({ phone: v })} /></div>
                  <div className="space-y-1.5"><Label htmlFor="marital_status">Marital Status</Label>
                    <Select value={formData.marital_status} onValueChange={(value) => updateFormData({ marital_status: value })}>
                      <SelectTrigger id="marital_status" className="text-sm"><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent><SelectItem value="Single">Single</SelectItem><SelectItem value="Married">Married</SelectItem><SelectItem value="Divorced">Divorced</SelectItem><SelectItem value="Widowed">Widowed</SelectItem></SelectContent>
                    </Select></div>
                  <div className="space-y-1.5"><Label htmlFor="referred_by">Referred By</Label><Input id="referred_by" className="text-sm" value={formData.referred_by} onChange={(e) => updateFormData({ referred_by: e.target.value })} placeholder="Referral source" /></div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
              <SectionHeader icon={MapPin} label="Addresses" />
              <CollapsibleContent className="p-3">
                <div className="space-y-3">
                  <div className="space-y-1.5"><Label htmlFor="physical_address">Physical Address</Label><AddressAutocomplete id="physical_address" value={formData.physical_address} onChange={(v) => updateFormData({ physical_address: v })} placeholder="Start typing to search address..." rows={2} /></div>
                  <div className="flex items-center space-x-2"><Checkbox id="same_as_physical" checked={formData.same_as_physical} onCheckedChange={(checked) => updateFormData({ same_as_physical: checked as boolean })} /><Label htmlFor="same_as_physical">Postal address same as physical address</Label></div>
                  {!formData.same_as_physical && (<div className="space-y-1.5"><Label htmlFor="postal_address">Postal Address</Label><AddressAutocomplete id="postal_address" value={formData.postal_address} onChange={(v) => updateFormData({ postal_address: v })} placeholder="Start typing to search address..." rows={2} /></div>)}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Next of Kin (multiple) */}
            <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
              <SectionHeader icon={Users} label="Next of Kin" />
              <CollapsibleContent className="p-3">
                <div className="flex justify-end mb-3">
                  {!showAddNOK && <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => setShowAddNOK(true)}><Plus className="h-3 w-3" />Add</Button>}
                </div>

                {/* Legacy single NOK if no members yet */}
                {nokMembers.length === 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-3">
                    <div className="space-y-1.5"><Label>Name</Label><Input className="text-sm" value={formData.next_of_kin_name} onChange={(e) => updateFormData({ next_of_kin_name: e.target.value })} placeholder="Full name" /></div>
                    <div className="space-y-1.5"><Label>Relationship</Label><RelationshipSelect value={formData.next_of_kin_relationship} onChange={(v) => updateFormData({ next_of_kin_relationship: v })} /></div>
                    <div className="space-y-1.5"><Label>Phone</Label><PhoneInput value={formData.next_of_kin_phone} onChange={(v) => updateFormData({ next_of_kin_phone: v })} /></div>
                    <div className="space-y-1.5"><Label>Email</Label><Input className="text-sm" type="email" value={formData.next_of_kin_email} onChange={(e) => updateFormData({ next_of_kin_email: e.target.value })} placeholder="Email" /></div>
                  </div>
                )}

                {showAddNOK && (
                  <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mb-3 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1.5"><Label>Name *</Label><Input className="text-sm" value={newNOK.name} onChange={(e) => setNewNOK(p => ({ ...p, name: e.target.value }))} placeholder="Full name" /></div>
                      <div className="space-y-1.5"><Label>Relationship</Label><RelationshipSelect value={newNOK.relationship} onChange={(v) => setNewNOK(p => ({ ...p, relationship: v }))} /></div>
                      <div className="space-y-1.5"><Label>Phone</Label><PhoneInput value={newNOK.phone} onChange={(v) => setNewNOK(p => ({ ...p, phone: v }))} /></div>
                      <div className="space-y-1.5"><Label>Email</Label><Input className="text-sm" type="email" value={newNOK.email} onChange={(e) => setNewNOK(p => ({ ...p, email: e.target.value }))} placeholder="Email" /></div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowAddNOK(false); setEditingNOKId(null); setNewNOK({ name: "", phone: "", email: "", relationship: "" }); }}>Cancel</Button>
                      <Button size="sm" className="text-xs h-7" onClick={handleAddNOK}>{editingNOKId ? "Save" : "Add"}</Button>
                    </div>
                  </div>
                )}

                {nokMembers.length > 0 && (
                  <div className="space-y-1.5">
                    {nokMembers.map(nok => (
                      <div key={nok.id} className="flex items-center justify-between p-1.5 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                          <p className="text-xs font-medium text-foreground">{nok.name} {nok.relationship && <span className="text-muted-foreground">({nok.relationship})</span>}</p>
                          {nok.phone && <p className="text-[10px] text-muted-foreground">{nok.phone}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Notify" onClick={() => toast({ title: "Notification sent", description: `${nok.name} has been notified` })}>
                            <Bell className="h-3 w-3 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleShareRecord('nok', nok)}>
                            <Share2 className={cn("h-3 w-3", nok.shared ? "text-muted-foreground" : "text-primary")} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditNOK(nok)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { setNokMembers(prev => prev.filter(n => n.id !== nok.id)); setHasChanges(true); }}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>


            <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
              <SectionHeader icon={Briefcase} label="Employer" />
              <CollapsibleContent className="p-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5"><Label htmlFor="employer">Employer</Label><Input id="employer" className="text-sm" value={formData.employer} onChange={(e) => updateFormData({ employer: e.target.value })} placeholder="Company name" /></div>
                  <div className="space-y-1.5"><Label htmlFor="occupation">Occupation</Label><Input id="occupation" className="text-sm" value={formData.occupation} onChange={(e) => updateFormData({ occupation: e.target.value })} placeholder="Job title" /></div>
                  <div className="space-y-1.5"><Label htmlFor="reporting_to_email">Line Manager Email Address (Optional)</Label><Input id="reporting_to_email" className="text-sm" type="email" value={formData.reporting_to_email} onChange={(e) => updateFormData({ reporting_to_email: e.target.value })} placeholder="manager@company.com" /><p className="text-[10px] text-muted-foreground">Used for e-mailing of Medical Certificates</p></div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
              <SectionHeader icon={StickyNote} label="General Notes" />
              <CollapsibleContent className="p-3">
                <Textarea value={formData.notes} onChange={(e) => updateFormData({ notes: e.target.value })} placeholder="General notes about this patient..." rows={4} className="text-sm" />
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          {/* === MEDICAL TAB (EDIT) === */}
          <TabsContent value="medical" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                {/* General Information */}
                <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                  <SectionHeader icon={Activity} label="General Information" />
                  <CollapsibleContent className="px-3 pb-3">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="space-y-1.5"><Label htmlFor="height_cm">Height (cm)</Label><Input id="height_cm" className="text-sm" type="number" step="0.1" value={formData.height_cm} onChange={(e) => updateFormData({ height_cm: e.target.value })} placeholder="e.g., 175" /></div>
                      <div className="space-y-1.5"><Label htmlFor="weight_kg">Weight (kg)</Label><Input id="weight_kg" className="text-sm" type="number" step="0.1" value={formData.weight_kg} onChange={(e) => updateFormData({ weight_kg: e.target.value })} placeholder="e.g., 70" /></div>
                      <div className="space-y-1.5"><Label>BMI</Label><Input className="text-sm bg-muted" value={bmi || "—"} disabled /></div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5" /> Blood Type</Label>
                        <Select value={formData.blood_type} onValueChange={(value) => updateFormData({ blood_type: value })}>
                          <SelectTrigger className="text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{BLOOD_TYPES.map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Allergies, Medication & Conditions */}
                <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                  <SectionHeader icon={Pill} label="Allergies, Medication & Conditions" />
                  <CollapsibleContent className="px-3 pb-3 space-y-3">
                    {/* Allergies */}
                    <div className="rounded-lg border border-border/50 p-2.5 space-y-2">
                      <Label className="text-xs font-semibold tracking-wide flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Allergies</Label>
                      <Textarea id="allergies" className="text-sm" value={formData.allergies} onChange={(e) => updateFormData({ allergies: e.target.value })} placeholder="List any allergies (medications, food, etc.)" rows={2} />
                    </div>

                    {/* Medication */}
                    <div className="rounded-lg border border-border/50 p-2.5 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-semibold tracking-wide flex items-center gap-1.5"><Pill className="h-3.5 w-3.5" /> Medication</Label>
                        {!showAddMed && <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => setShowAddMed(true)}><Plus className="h-3 w-3" />Add</Button>}
                      </div>
                      {showAddMed && (
                        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mb-3 space-y-2">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1.5"><Label>Medication Name *</Label><Input className="text-sm" value={newMed.name} onChange={(e) => setNewMed(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Metformin" /></div>
                            <div className="space-y-1.5"><Label>Dosage</Label><Input className="text-sm" value={newMed.dosage} onChange={(e) => setNewMed(p => ({ ...p, dosage: e.target.value }))} placeholder="e.g., 500mg twice daily" /></div>
                            <div className="space-y-1.5">
                              <Label>Status</Label>
                              <Select value={newMed.status} onValueChange={(v) => setNewMed(p => ({ ...p, status: v as "current" | "past" }))}>
                                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="current">Current</SelectItem>
                                  <SelectItem value="past">Past</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5"><Label>Start Date</Label><Input className="text-sm" type="date" value={newMed.start_date} onChange={(e) => setNewMed(p => ({ ...p, start_date: e.target.value }))} /></div>
                            {newMed.status === 'past' && (
                              <div className="space-y-1.5"><Label>End Date</Label><Input className="text-sm" type="date" value={newMed.end_date} onChange={(e) => setNewMed(p => ({ ...p, end_date: e.target.value }))} /></div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox checked={newMed.is_chronic} onCheckedChange={(c) => setNewMed(p => ({ ...p, is_chronic: c as boolean }))} />
                            <Label className="text-xs">This is a chronic medication</Label>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowAddMed(false); setEditingMedId(null); setNewMed({ name: "", dosage: "", is_chronic: false, status: "current", start_date: "", end_date: "" }); }}>Cancel</Button>
                            <Button size="sm" className="text-xs h-7" onClick={handleAddMed}>{editingMedId ? "Save" : "Add"}</Button>
                          </div>
                        </div>
                      )}
                      {currentMedications.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No medications recorded</p>
                      ) : (
                        <div className="space-y-1">
                          {currentMedications.map(m => (
                            <div key={m.id} className="flex items-center justify-between p-1.5 rounded-lg bg-muted/30 border border-border/50">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Switch checked={m.is_chronic} onCheckedChange={() => handleToggleMedChronic(m.id)} className="shrink-0 scale-75" />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate">{m.name}{m.dosage ? ` — ${m.dosage}` : ""}</p>
                                  {(m.start_date || m.end_date) && (
                                    <p className="text-[10px] text-muted-foreground">
                                      {m.start_date ? format(new Date(m.start_date), "MMM yyyy") : "?"} — {m.end_date ? format(new Date(m.end_date), "MMM yyyy") : "Present"}
                                    </p>
                                  )}
                                </div>
                                <Badge className={`text-[8px] border-0 ${m.status === 'past' ? 'bg-muted text-muted-foreground' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                                  {m.status === 'past' ? 'Past' : 'Current'}
                                </Badge>
                                {m.is_chronic && <span className="inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive shrink-0">Chronic</span>}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditMed(m)}><Pencil className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { setCurrentMedications(prev => prev.filter(x => x.id !== m.id)); setHasChanges(true); }}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {isChronic && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"><Pill className="h-2.5 w-2.5" />Chronic Patient</span>
                        </div>
                      )}
                    </div>

                    {/* Conditions & Diagnoses */}
                    <div className="rounded-lg border border-border/50 p-2.5 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-semibold tracking-wide flex items-center gap-1.5"><HeartPulse className="h-3.5 w-3.5" /> Conditions & Diagnoses</Label>
                        {!showAddCondition && <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => setShowAddCondition(true)}><Plus className="h-3 w-3" />Add</Button>}
                      </div>
                      {showAddCondition && (
                        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mb-3 space-y-2">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1.5"><Label>Condition/Diagnosis *</Label><Input className="text-sm" value={newCondition.name} onChange={(e) => setNewCondition(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Type 2 Diabetes" /></div>
                            <div className="space-y-1.5"><Label>Date Diagnosed</Label><Input className="text-sm" type="date" value={newCondition.diagnosed_date} onChange={(e) => setNewCondition(p => ({ ...p, diagnosed_date: e.target.value }))} /></div>
                            <div className="space-y-1.5"><Label>Diagnosed By</Label><Input className="text-sm" value={newCondition.diagnosed_by} onChange={(e) => setNewCondition(p => ({ ...p, diagnosed_by: e.target.value }))} placeholder="Doctor name" /></div>
                            <div className="space-y-1.5">
                              <Label>Status</Label>
                              <Select value={newCondition.status} onValueChange={(v) => setNewCondition(p => ({ ...p, status: v as "active" | "resolved" }))}>
                                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowAddCondition(false); setEditingConditionId(null); setNewCondition({ name: "", diagnosed_date: "", diagnosed_by: "", status: "active" }); }}>Cancel</Button>
                            <Button size="sm" className="text-xs h-7" onClick={handleAddCondition}>{editingConditionId ? "Save" : "Add"}</Button>
                          </div>
                        </div>
                      )}
                      {conditionsDiagnoses.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No conditions recorded</p>
                      ) : (
                        <div className="space-y-1">
                          {conditionsDiagnoses.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg bg-primary/5 border border-primary/20">
                              <div>
                                <p className="text-xs font-medium text-foreground">{c.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {c.diagnosed_date ? format(new Date(c.diagnosed_date), "MMM d, yyyy") : "Date unknown"}
                                  {c.diagnosed_by ? ` · Dr. ${c.diagnosed_by}` : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Badge className={`text-[8px] border-0 ${c.status === 'resolved' ? 'bg-muted text-muted-foreground' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                  {c.status === 'resolved' ? 'Resolved' : 'Active'}
                                </Badge>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditCondition(c)}><Pencil className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { setConditionsDiagnoses(prev => prev.filter(x => x.id !== c.id)); setHasChanges(true); }}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Surgeries & Dates */}
                <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                  <SectionHeader icon={Scissors} label="Surgeries & Dates" />
                  <CollapsibleContent className="px-3 pb-3 space-y-2">
                    <div className="flex justify-end">
                      {!showAddSurgery && <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => setShowAddSurgery(true)}><Plus className="h-3 w-3" />Add</Button>}
                    </div>
                    {showAddSurgery && (
                      <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mb-3 space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1.5"><Label>Surgery Name *</Label><Input className="text-sm" value={newSurgery.name} onChange={(e) => setNewSurgery(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Appendectomy" /></div>
                          <div className="space-y-1.5">
                            <Label>Date Precision</Label>
                            <Select value={newSurgery.date_precision} onValueChange={(v) => setNewSurgery(prev => ({ ...prev, date_precision: v as any, date: "" }))}>
                              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="exact">Exact Date</SelectItem>
                                <SelectItem value="month">Month & Year</SelectItem>
                                <SelectItem value="year">Year Only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Date *</Label>
                          {newSurgery.date_precision === 'exact' && <Input className="text-sm" type="date" value={newSurgery.date} onChange={(e) => setNewSurgery(prev => ({ ...prev, date: e.target.value }))} />}
                          {newSurgery.date_precision === 'month' && <Input className="text-sm" type="month" value={newSurgery.date} onChange={(e) => setNewSurgery(prev => ({ ...prev, date: e.target.value }))} />}
                          {newSurgery.date_precision === 'year' && <Input className="text-sm" type="number" min="1900" max="2099" value={newSurgery.date} onChange={(e) => setNewSurgery(prev => ({ ...prev, date: e.target.value }))} placeholder="e.g., 2020" />}
                        </div>
                        <div className="space-y-1.5"><Label>Notes (optional)</Label><Input className="text-sm" value={newSurgery.notes} onChange={(e) => setNewSurgery(prev => ({ ...prev, notes: e.target.value }))} placeholder="Additional notes" /></div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowAddSurgery(false); setEditingSurgeryId(null); setNewSurgery({ name: "", date: "", notes: "", date_precision: "exact" }); }}>Cancel</Button>
                          <Button size="sm" className="text-xs h-7" onClick={handleAddSurgery}>{editingSurgeryId ? "Save" : "Add"}</Button>
                        </div>
                      </div>
                    )}
                    {surgeries.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No surgeries recorded</p>
                    ) : (
                      <div className="space-y-1">
                        {surgeries.map((surgery) => (
                          <div key={surgery.id} className="flex items-start justify-between p-1.5 rounded-lg bg-primary/5 border border-primary/20">
                            <div>
                              <p className="text-xs font-medium text-foreground">{surgery.name}</p>
                              <p className="text-[10px] text-muted-foreground">{formatSurgeryDate(surgery.date, surgery.date_precision)}</p>
                              {surgery.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{surgery.notes}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditSurgery(surgery)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveSurgery(surgery.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Family History */}
                <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                  <SectionHeader icon={GitBranch} label="Family History" />
                  <CollapsibleContent className="px-3 pb-3 space-y-2">
                    <div className="flex justify-end">
                      {!showAddFamily && <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => setShowAddFamily(true)}><Plus className="h-3 w-3" />Add</Button>}
                    </div>
                    {showAddFamily && (
                      <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mb-3 space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1.5"><Label>Relation *</Label><Input className="text-sm" value={newFamilyEntry.relation} onChange={(e) => setNewFamilyEntry(prev => ({ ...prev, relation: e.target.value }))} placeholder="e.g., Mother" /></div>
                          <div className="space-y-1.5"><Label>Condition *</Label><Input className="text-sm" value={newFamilyEntry.condition} onChange={(e) => setNewFamilyEntry(prev => ({ ...prev, condition: e.target.value }))} placeholder="e.g., Diabetes" /></div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowAddFamily(false); setEditingFamilyId(null); setNewFamilyEntry({ relation: "", condition: "" }); }}>Cancel</Button>
                          <Button size="sm" className="text-xs h-7" onClick={handleAddFamilyEntry}>{editingFamilyId ? "Save" : "Add"}</Button>
                        </div>
                      </div>
                    )}
                    {familyHistory.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No family history recorded</p>
                    ) : (
                      <div className="space-y-1">
                        {familyHistory.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-1.5 rounded-lg bg-primary/5 border border-primary/20">
                            <div>
                              <p className="text-xs font-medium text-foreground">{entry.relation}</p>
                              <p className="text-[10px] text-muted-foreground">{entry.condition}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditFamilyEntry(entry)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveFamilyEntry(entry.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Organ Donor — collapsible with inline Yes/No */}
                <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                  <CollapsibleTrigger className="flex w-full items-center justify-between bg-primary rounded-lg px-3 py-2 group">
                    <h3 className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5 text-left">
                      <Heart className="h-3.5 w-3.5" /> Organ Donor
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        formData.organ_donor
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-white/20 text-white"
                      )}>
                        {formData.organ_donor ? "Yes" : "No"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-white transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-3">
                    <div className="flex items-center gap-3 mb-3">
                      <Switch checked={formData.organ_donor} onCheckedChange={(checked) => { updateFormData({ organ_donor: checked }); if (!checked) { setOrganDonorOrgans([]); setHasChanges(true); } }} />
                      <Label>{formData.organ_donor ? "Yes" : "No"}</Label>
                    </div>
                    {formData.organ_donor && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ORGAN_OPTIONS.map(organ => (
                          <div key={organ} className="flex items-center space-x-2">
                            <Checkbox id={`organ-${organ}`} checked={organDonorOrgans.includes(organ)} onCheckedChange={() => toggleOrganDonorOrgan(organ)} />
                            <Label htmlFor={`organ-${organ}`}>{organ}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Column 2 */}
              <div className="space-y-4">
                <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                  <SectionHeader icon={ShieldCheck} label="Medical Insurance" />
                  <CollapsibleContent className="p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5"><Label>Insurance Provider</Label><Input className="text-sm" value={formData.medical_aid} onChange={(e) => updateFormData({ medical_aid: e.target.value })} placeholder="Insurance provider" /></div>
                      <div className="space-y-1.5"><Label>Insurance Product</Label><Input className="text-sm" value={formData.medical_insurance_product} onChange={(e) => updateFormData({ medical_insurance_product: e.target.value })} placeholder="Product name" /></div>
                      <div className="space-y-1.5"><Label>Insurance Number</Label><Input className="text-sm" value={formData.medical_aid_number} onChange={(e) => updateFormData({ medical_aid_number: e.target.value })} placeholder="Member number" /></div>
                      <div className="space-y-1.5"><Label>Primary Member</Label><Input className="text-sm" value={formData.primary_member} onChange={(e) => updateFormData({ primary_member: e.target.value })} placeholder="Primary member name" /></div>
                      <div className="space-y-1.5 sm:col-span-2"><Label>Claims Email (for auto-submission of claims)</Label><Input className="text-sm" type="email" value={formData.claims_email} onChange={(e) => updateFormData({ claims_email: e.target.value })} placeholder="claims@insurance.com" /></div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Next of Kin - moved from Personal to Medical */}
                <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                  <SectionHeader icon={Users} label="Next of Kin" />
                  <CollapsibleContent className="p-3">
                    <div className="flex justify-end mb-3">
                      {!showAddNOK && <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => setShowAddNOK(true)}><Plus className="h-3 w-3" />Add</Button>}
                    </div>
                    {nokMembers.length === 0 && (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-3">
                        <div className="space-y-1.5"><Label>Name</Label><Input className="text-sm" value={formData.next_of_kin_name} onChange={(e) => updateFormData({ next_of_kin_name: e.target.value })} placeholder="Full name" /></div>
                        <div className="space-y-1.5"><Label>Relationship</Label><RelationshipSelect value={formData.next_of_kin_relationship} onChange={(v) => updateFormData({ next_of_kin_relationship: v })} /></div>
                        <div className="space-y-1.5"><Label>Phone</Label><PhoneInput value={formData.next_of_kin_phone} onChange={(v) => updateFormData({ next_of_kin_phone: v })} /></div>
                        <div className="space-y-1.5"><Label>Email</Label><Input className="text-sm" type="email" value={formData.next_of_kin_email} onChange={(e) => updateFormData({ next_of_kin_email: e.target.value })} placeholder="Email" /></div>
                      </div>
                    )}
                    {showAddNOK && (
                      <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mb-3 space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1.5"><Label>Name *</Label><Input className="text-sm" value={newNOK.name} onChange={(e) => setNewNOK(p => ({ ...p, name: e.target.value }))} placeholder="Full name" /></div>
                          <div className="space-y-1.5"><Label>Relationship</Label><RelationshipSelect value={newNOK.relationship} onChange={(v) => setNewNOK(p => ({ ...p, relationship: v }))} /></div>
                          <div className="space-y-1.5"><Label>Phone</Label><PhoneInput value={newNOK.phone} onChange={(v) => setNewNOK(p => ({ ...p, phone: v }))} /></div>
                          <div className="space-y-1.5"><Label>Email</Label><Input className="text-sm" type="email" value={newNOK.email} onChange={(e) => setNewNOK(p => ({ ...p, email: e.target.value }))} placeholder="Email" /></div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowAddNOK(false); setEditingNOKId(null); setNewNOK({ name: "", phone: "", email: "", relationship: "" }); }}>Cancel</Button>
                          <Button size="sm" className="text-xs h-7" onClick={handleAddNOK}>{editingNOKId ? "Save" : "Add"}</Button>
                        </div>
                      </div>
                    )}
                    {nokMembers.length > 0 && (
                      <div className="space-y-1.5">
                        {nokMembers.map(nok => (
                          <div key={nok.id} className="flex items-center justify-between p-1.5 rounded-lg bg-muted/30 border border-border/50">
                            <div>
                              <p className="text-xs font-medium text-foreground">{nok.name} {nok.relationship && <span className="text-muted-foreground">({nok.relationship})</span>}</p>
                              {nok.phone && <p className="text-[10px] text-muted-foreground">{nok.phone}</p>}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6" title="Notify" onClick={() => toast({ title: "Notification sent", description: `${nok.name} has been notified` })}><Bell className="h-3 w-3 text-primary" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleShareRecord('nok', nok)}><Share2 className={cn("h-3 w-3", nok.shared ? "text-muted-foreground" : "text-primary")} /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditNOK(nok)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { setNokMembers(prev => prev.filter(n => n.id !== nok.id)); setHasChanges(true); }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* GP Search */}
                <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                  <SectionHeader icon={User} label="General Practitioner" />
                  <CollapsibleContent className="p-3">
                    <div className="space-y-1.5 relative">
                      <Label>General Practitioner</Label>
                      <Input className="text-sm" value={formData.general_practitioner} onChange={(e) => searchGP(e.target.value)} placeholder="Search or type GP name" />
                      {gpSearchOpen && gpSearchResults.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 bg-card border border-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                          {gpSearchResults.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-xs">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{doc.full_name}</p>
                                <p className="text-[10px] text-muted-foreground">{doc.specialty || "General"} {doc.practice_number ? `• ${doc.practice_number}` : ""}</p>
                              </div>
                              <div className="flex gap-1 shrink-0 ml-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6" title="Select as GP" onClick={() => { updateFormData({ general_practitioner: doc.full_name }); setGpSearchOpen(false); }}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" title="Connect to profile" onClick={() => {
                                  updateFormData({ general_practitioner: doc.full_name });
                                  setGpSearchOpen(false);
                                  toast({ title: "Connected", description: `${doc.full_name} linked as your GP` });
                                }}>
                                  <Link2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <div className="px-3 py-2 border-t border-border">
                            <p className="text-[10px] text-muted-foreground mb-1">Doctor not on the app?</p>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" className="gap-1 text-[10px] h-6" onClick={() => {
                                toast({ title: "Invitation sent", description: "An invitation email will be sent" });
                                setGpSearchOpen(false);
                              }}>
                                <Mail className="h-2.5 w-2.5" />Invite
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1 text-[10px] h-6" onClick={() => {
                                toast({ title: "Invite & Connect", description: "Invitation sent with auto-connect" });
                                setGpSearchOpen(false);
                              }}>
                                <Mail className="h-2.5 w-2.5" /><Link2 className="h-2.5 w-2.5" />Invite & Connect
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Pharmacies */}
                <Collapsible defaultOpen={false} className="rounded-xl border border-primary bg-card">
                  <SectionHeader icon={Store} label="Pharmacies" />
                  <CollapsibleContent className="p-3">
                    <div className="flex justify-end mb-3">
                      {!showAddPharmacy && <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => setShowAddPharmacy(true)}><Plus className="h-3 w-3" />Add</Button>}
                    </div>
                    {showAddPharmacy && (
                      <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 mb-3 space-y-2">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1.5"><Label>Name *</Label><Input className="text-sm" value={newPharmacy.name} onChange={(e) => setNewPharmacy(prev => ({ ...prev, name: e.target.value }))} placeholder="Pharmacy name" /></div>
                          <div className="space-y-1.5"><Label>Branch</Label><Input className="text-sm" value={newPharmacy.branch} onChange={(e) => setNewPharmacy(prev => ({ ...prev, branch: e.target.value }))} placeholder="Branch name" /></div>
                          <div className="space-y-1.5 sm:col-span-2"><Label>Email</Label><Input className="text-sm" type="email" value={newPharmacy.email} onChange={(e) => setNewPharmacy(prev => ({ ...prev, email: e.target.value }))} placeholder="pharmacy@email.com" /></div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowAddPharmacy(false); setEditingPharmacyId(null); setNewPharmacy({ name: "", email: "", branch: "" }); }}>Cancel</Button>
                          <Button size="sm" className="text-xs h-7" onClick={handleAddPharmacy}>{editingPharmacyId ? "Save" : "Add"}</Button>
                        </div>
                      </div>
                    )}
                    {pharmacies.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No pharmacies recorded</p>
                    ) : (
                      <div className="space-y-1.5">
                        {pharmacies.map((pharmacy) => (
                          <div key={pharmacy.id} className="flex items-center justify-between p-1.5 rounded-lg bg-muted/30 border border-border/50">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleSetPrimaryPharmacy(pharmacy.id)} className="text-xs text-primary hover:underline">
                                {pharmacy.is_primary ? <Star className="h-3.5 w-3.5 fill-primary text-primary" /> : <Star className="h-3.5 w-3.5 text-muted-foreground" />}
                              </button>
                              <div>
                                <p className="text-xs font-medium text-foreground">
                                  {pharmacy.name}
                                  {pharmacy.branch && <span className="text-muted-foreground ml-1">({pharmacy.branch})</span>}
                                </p>
                                {pharmacy.email && <p className="text-[10px] text-muted-foreground">{pharmacy.email}</p>}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditPharmacy(pharmacy)}><Pencil className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemovePharmacy(pharmacy.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </TabsContent>

          {/* === Dashboard tab (edit mode) === */}
          {isSelfService && (
            <TabsContent value="dashboard" className="mt-4">
              <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <PatientDashboardLazy />
              </Suspense>
            </TabsContent>
          )}

          {/* === Tasks tab (edit mode) === */}
          {isSelfService && (
            <TabsContent value="tasks" className="mt-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">My Tasks</h2>
                <p className="text-xs text-muted-foreground">Manage your health tasks and to-dos</p>
              </div>
              <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <PatientTasksLazy />
              </Suspense>
            </TabsContent>
          )}

          {isSelfService && (
            <TabsContent value="sessions" className="mt-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">My Sessions</h2>
                <p className="text-xs text-muted-foreground">History of your consultations</p>
              </div>
              <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <SessionHistoryTableLazy sessions={[]} patientId={patient.id} patientName={patient.name} />
              </Suspense>
          </TabsContent>
          )}

          {isSelfService && (
            <TabsContent value="calendar" className="mt-4">
              <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <PatientCalendarLazy />
              </Suspense>
            </TabsContent>
          )}

          {isSelfService && (
            <TabsContent value="documents" className="mt-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">My Documents</h2>
                <p className="text-xs text-muted-foreground">All your prescriptions, invoices, certificates and uploaded files</p>
              </div>
              <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <PatientDocuments hideHeader />
              </Suspense>
            </TabsContent>
          )}

          {isSelfService && (
            <TabsContent value="doctors" className="mt-4">
              <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <MyDoctors />
              </Suspense>
            </TabsContent>
          )}

          {isSelfService && (
            <TabsContent value="roundtable" className="mt-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">My Round Table</h2>
                <p className="text-xs text-muted-foreground">Notes shared by your healthcare providers about your care</p>
              </div>
              <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <PatientRoundTable hideHeader />
              </Suspense>
            </TabsContent>
          )}

        </Tabs>
      </div>
    </div>
  );
}
