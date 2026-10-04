import { dobFromSaId } from "@/lib/saId";
import { PatientProgrammesTab } from "@/features/programmes/components/PatientProgrammesTab";
import { ClientAISummary } from "@/features/wealth-workflow/client/ClientAISummary";
import { MyAdvisorsHistory } from "@/features/wealth-workflow/client/MyAdvisorsHistory";
import { LifeEventsPanel } from "@/features/wealth-workflow/client/LifeEventsPanel";
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/lib/languages";
import { PatientSessionRecorder } from "@/features/patients/components/PatientSessionRecorder";
import { DailyMedsInline } from "@/features/patients/components/DailyMedsInline";
import { RelationshipProfileExercise } from "@/features/patients/components/RelationshipProfileExercise";
import { useV2Demo } from "@/hooks/useV2Demo";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, emitMedicationsUpdated } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { AddressAutocomplete } from "@/components/patients/AddressAutocomplete";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useSessions } from "@/hooks/useSessions";
import {
  Pencil,
  Save,
  X,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Ruler,
  Scale,
  StickyNote,
  Star,
  Wallet as Pill,
  Heart,
  User,
  MapPin,
  Users,
  Briefcase,
  ShieldCheck,
  Store,
  TrendingUp as Activity,
  Droplets,
  Scissors,
  GitBranch,
  Share2,
  Camera,
  Mail,
  Link2,
  Eye,
  Phone,
  LineChart as HeartPulse,
  Settings,
  ChevronDown,
  Bell,
  LayoutDashboard,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  SectionHeader,
  FIELD_ROW_CLASS,
  FIELD_GRID_CLASS,
  FIELD_GRID_2_CLASS,
  FIELD_GRID_4_CLASS,
} from "./sectionStyles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialInformation } from "./financial/FinancialInformation";
import { PreferredHospitals, type PreferredHospital } from "./PreferredHospitals";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, isFuture, isAfter } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Mic, Clock } from "lucide-react";
import {
  Patient,
  Surgery,
  Pharmacy,
  FamilyHistoryEntry,
  NextOfKinMember,
  CurrentMedication,
  ConditionDiagnosis,
  Allergy,
} from "@/hooks/usePatients";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";
import { isValidOptionalEmail } from "@/lib/validation";

import vulaVouchersLogo from "@/assets/vula-vouchers-logo.png";

const PatientDocuments = lazy(() => import("@/pages/patient/PatientDocuments"));
const ClaimsPage = lazy(() => import("@/pages/Claims"));
const TestResultsPanel = lazy(() =>
  import("@/modules/holarchelp/components/TestResultsPanel").then((m) => ({ default: m.TestResultsPanel })),
);
const MyDoctors = lazy(() => import("@/pages/patient/MyDoctors"));
const PatientRoundTable = lazy(() => import("@/pages/patient/PatientRoundTable"));
const PatientCalendarLazy = lazy(() => import("@/pages/patient/PatientCalendar"));

const SettingsContentLazy = lazy(() =>
  import("@/components/settings/SettingsContent").then((m) => ({ default: m.SettingsContent })),
);
const SessionHistoryTableLazy = lazy(() =>
  import("@/components/patients/SessionHistoryTable").then((m) => ({ default: m.SessionHistoryTable })),
);
const PatientDashboardLazy = lazy(() => import("@/pages/patient/PatientDashboard"));
const PatientTasksLazy = lazy(() => import("@/pages/patient/PatientTasks"));
const AdmissionsViewLazy = lazy(() => import("@/features/sessions/admissions/AdmissionsView").then(m => ({ default: m.AdmissionsView })));
const PatientIncidentHistoryLazy = lazy(() => import("@/components/holarchelp/PatientIncidentHistory"));

interface PatientDetailsEditorProps {
  patient: Patient;
  onSave: (updates: Partial<Patient>) => Promise<any>;
  isSelfService?: boolean;
  userEmail?: string;
  userId?: string;
  emergencyContacts?: import("./EmergencyContactsSection").EmergencyContact[];
  onEmergencyContactsChange?: (next: import("./EmergencyContactsSection").EmergencyContact[]) => void;
  lollipopCount?: number;
  rewardsLoading?: boolean;
  section?: string;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const ORGAN_OPTIONS = [
  "Heart",
  "Lungs",
  "Kidneys",
  "Liver",
  "Pancreas",
  "Corneas",
  "Skin",
  "Bone Marrow",
  "Intestines",
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

// Inline autosave indicator shown in section headers
const AutosaveStatus = ({
  saving,
  hasChanges,
  lastSavedAt,
}: {
  saving: boolean;
  hasChanges: boolean;
  lastSavedAt: number | null;
}) => {
  if (saving) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (hasChanges) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Unsaved changes
      </span>
    );
  }
  if (lastSavedAt) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-primary">
        <Save className="h-3.5 w-3.5" /> Saved
      </span>
    );
  }
  return null;
};




// Phone input with country code
const PhoneInput = ({
  value,
  onChange,
  placeholder = "Phone number",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => {
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
      <Input
        className="text-sm w-full"
        value={number}
        onChange={(e) => handleChange(countryCode, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
};

// Displays a phone number without its dialling code
export const stripDialCode = (phone?: string | null) => {
  if (!phone) return phone ?? "";
  for (const cc of COUNTRY_CODES) {
    if (phone.startsWith(cc.code)) return phone.slice(cc.code.length).trim();
  }
  return phone;
};

// Relationship select with "Other" option
const RelationshipSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [showOther, setShowOther] = useState(!RELATIONSHIP_OPTIONS.includes(value) && !!value);

  if (showOther) {
    return (
      <div className="flex gap-1">
        <Input
          className="text-sm flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type relationship"
        />
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-9 shrink-0"
          onClick={() => {
            setShowOther(false);
            onChange("");
          }}
        >
          List
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={RELATIONSHIP_OPTIONS.includes(value) ? value : ""}
      onValueChange={(v) => {
        if (v === "__other__") {
          setShowOther(true);
          onChange("");
        } else onChange(v);
      }}
    >
      <SelectTrigger className="text-sm">
        <SelectValue placeholder="Select relationship" />
      </SelectTrigger>
      {/* Prevent the known Radix-in-Dialog issue where closing without a selection
          leaves pointer-events:none on the body, making the trigger feel disabled. */}
      <SelectContent
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={() => {
          // Ensure the body regains pointer events after a dismiss-without-select.
          requestAnimationFrame(() => {
            if (document.body.style.pointerEvents === "none") {
              document.body.style.pointerEvents = "";
            }
          });
        }}
      >
        {RELATIONSHIP_OPTIONS.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
        <SelectItem value="__other__">Other...</SelectItem>
      </SelectContent>
    </Select>
  );
};


// Format surgery date based on precision
const formatSurgeryDate = (date: string, precision?: string) => {
  try {
    if (precision === "year") return date.slice(0, 4);
    if (precision === "month") {
      const [y, m] = date.split("-");
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      return `${months[parseInt(m) - 1]} ${y}`;
    }
    return format(new Date(date), "MMMM d, yyyy");
  } catch {
    return date;
  }
};

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(target);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();
  const fromRef = useRef<number>(target);
  const lastTargetRef = useRef<number>(target);
  useEffect(() => {
    // Skip if target hasn't actually changed — prevents the double-animation
    // that happens when lollipopCount arrives in two passes (0 → real value).
    if (target === lastTargetRef.current && count === target) return;
    lastTargetRef.current = target;
    if (target <= 0) {
      setCount(0);
      fromRef.current = 0;
      return;
    }
    const from = count;
    fromRef.current = from;
    startRef.current = undefined;
    const duration = 1200;
    const delta = target - from;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + delta * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return <span>{count}</span>;
}

const SECTION_TABS: Record<string, string[]> = {
  health: ["overview", "personal", "medical", "history", "claims", "documents", "lifeEvents"],
  admin: ["calendar", "tasks", "programmes"],
  workspace: ["personal", "medical", "claims"],
  personal: ["personal"],
  financial: ["medical"],
};

export function PatientDetailsEditor({
  patient,
  onSave,
  isSelfService = false,
  userEmail,
  userId,
  emergencyContacts,
  onEmergencyContactsChange,
  lollipopCount = 0,
  rewardsLoading = false,
  section,
}: PatientDetailsEditorProps) {
  const { v2Demo } = useV2Demo();
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { isDoctor } = useUserRole();
  const queryClient = useQueryClient();
  const { sessions: patientSessions, loading: patientSessionsLoading } = useSessions(
    isSelfService ? patient.id : undefined,
  );
  const [isEditing, setIsEditing] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [activeParentTab, setActiveParentTab] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Fetch upcoming appointments for banner
  const { data: bannerAppointments = [] } = useQuery({
    queryKey: ["banner-appointments", patient.id],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("appointment_requests")
        .select("*")
        .eq("patient_user_id", user.id)
        .in("status", ["approved", "pending"])
        .order("requested_start", { ascending: true })
        .limit(3);
      if (error) {
        console.error(error);
        return [];
      }
      const rows = data || [];
      const doctorIds = [...new Set(rows.map((r: any) => r.doctor_id).filter(Boolean))];
      let doctorMap: Record<string, { full_name: string | null; specialty: string | null }> = {};
      if (doctorIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, specialty")
          .in("id", doctorIds);
        (profiles || []).forEach((p: any) => { doctorMap[p.id] = { full_name: p.full_name, specialty: p.specialty }; });
      }
      const withProfiles = rows.map((a: any) => ({ ...a, profiles: doctorMap[a.doctor_id] }));
      return withProfiles.filter((a: any) => {
        const start = a.proposed_start || a.requested_start;
        return start && isAfter(parseISO(start), new Date());
      });
    },
    enabled: isSelfService,
  });

  // Controlled tab state for dynamic navigation
  const getInitialTab = () => {
    if (isSelfService && section && SECTION_TABS[section]?.length) {
      return SECTION_TABS[section][0];
    }
    return "personal";
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    if (isSelfService && section && SECTION_TABS[section]?.length) {
      setActiveTab(SECTION_TABS[section][0]);
    }
  }, [section, isSelfService]);

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
    preferred_language: "",
  });
  const [organDonorOrgans, setOrganDonorOrgans] = useState<string[]>([]);
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [familyHistory, setFamilyHistory] = useState<FamilyHistoryEntry[]>([]);

  const [nokMembers, setNokMembers] = useState<NextOfKinMember[]>([]);
  const [currentMedications, setCurrentMedications] = useState<CurrentMedication[]>([]);
  const [conditionsDiagnoses, setConditionsDiagnoses] = useState<ConditionDiagnosis[]>([]);
  const [newSurgery, setNewSurgery] = useState({
    name: "",
    date: "",
    notes: "",
    date_precision: "exact" as "exact" | "month" | "year",
  });
  const [showAddSurgery, setShowAddSurgery] = useState(false);
  const [editingSurgeryId, setEditingSurgeryId] = useState<string | null>(null);
  const [newPharmacy, setNewPharmacy] = useState({ name: "", email: "", branch: "" });
  const [showAddPharmacy, setShowAddPharmacy] = useState(false);
  const [editingPharmacyId, setEditingPharmacyId] = useState<string | null>(null);
  const [newFamilyEntry, setNewFamilyEntry] = useState({ relation: "", condition: "" });
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [showAddNOK, setShowAddNOK] = useState(false);
  const [newNOK, setNewNOK] = useState({ name: "", phone: "", email: "", relationship: "" });
  const [editingNOKId, setEditingNOKId] = useState<string | null>(null);
  const [showAddMed, setShowAddMed] = useState(false);
  const [newMed, setNewMed] = useState({
    name: "",
    dosage: "",
    quantity: "1",
    strength: "",
    units: "mg",
    times_per_day: "1",
    is_chronic: false,
    status: "current" as "current" | "past",
    start_date: "",
    end_date: "",
    reminder_time: "08:00",
    reminders_enabled: true,
  });
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [showAddCondition, setShowAddCondition] = useState(false);
  const [newCondition, setNewCondition] = useState({
    name: "",
    diagnosed_date: "",
    diagnosed_by: "",
    status: "active" as "active" | "resolved",
  });
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null);
  const [allergiesStructured, setAllergiesStructured] = useState<Allergy[]>([]);
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [newAllergy, setNewAllergy] = useState({
    name: "",
    severity: "mild" as "mild" | "moderate" | "severe",
    reaction: "",
    date_identified: "",
  });
  const [editingAllergyId, setEditingAllergyId] = useState<string | null>(null);
  const [gpSearchResults, setGpSearchResults] = useState<any[]>([]);
  const [gpSearchOpen, setGpSearchOpen] = useState(false);
  const [gpSearchTerm, setGpSearchTerm] = useState("");
  const [gpAutoDetected, setGpAutoDetected] = useState<{ id: string; full_name: string } | null>(null);

  // Auto-detect: if the GP field is empty, suggest a connected doctor whose
  // specialty is "General Practitioner" (falls back to the first connected
  // doctor) so patients don't have to search from scratch.
  useEffect(() => {
    if (!isSelfService || !patient.patient_user_id || formData.general_practitioner) {
      setGpAutoDetected(null);
      return;
    }
    supabase
      .from("doctor_patient_access")
      .select("doctor_id")
      .eq("patient_user_id", patient.patient_user_id)
      .then(async ({ data: access }) => {
        const doctorIds = (access || []).map((a: any) => a.doctor_id);
        if (doctorIds.length === 0) return;
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, specialty")
          .in("id", doctorIds);
        if (!profiles || profiles.length === 0) return;
        const gp = profiles.find((p: any) => (p.specialty || "").toLowerCase().includes("general practitioner")) || profiles[0];
        setGpAutoDetected({ id: gp.id, full_name: gp.full_name });
      });
  }, [isSelfService, patient.patient_user_id, formData.general_practitioner]);

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
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });
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
        first_name: fn,
        last_name: ln,
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
        preferred_language: (patient as any).preferred_language || "",
      });
      setOrganDonorOrgans(patient.organ_donor_organs || []);
      setSurgeries(patient.surgeries || []);
      setFamilyHistory(patient.family_history || []);
      setNokMembers(patient.next_of_kin_members || []);
      setCurrentMedications(patient.current_medications || []);
      setConditionsDiagnoses(patient.conditions_diagnoses || []);
      setAllergiesStructured(patient.allergies_structured || []);
      const existingPharmacies = patient.pharmacies || [];
      if (existingPharmacies.length === 0 && (patient.pharmacy_name || patient.pharmacy_email)) {
        setPharmacies([
          {
            id: crypto.randomUUID(),
            name: patient.pharmacy_name || "",
            email: patient.pharmacy_email || "",
            is_primary: true,
          },
        ]);
      } else {
        setPharmacies(existingPharmacies);
      }
      setHasChanges(false);
    }
  }, [patient]);

  const syncChronicMedsToPrescriptions = useCallback(
    async (meds: CurrentMedication[]) => {
      if (!patient?.id) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        let doctorId: string | null = null;
        if (isDoctor) {
          doctorId = user.id;
        } else {
          const { data: access } = await supabase
            .from("doctor_patient_access")
            .select("doctor_id, granted_at")
            .eq("patient_user_id", user.id)
            .eq("is_active", true)
            .order("granted_at", { ascending: false })
            .limit(1);
          doctorId = access?.[0]?.doctor_id ?? null;
        }
        const chronicMeds = (meds || []).filter((m) => m.is_chronic && (m.name || "").trim());
        if (chronicMeds.length > 0 && !doctorId) {
          toast({
            title: "Connect a wealth manager to track chronic meds",
            description: "Add your wealth manager under My Wealth management so chronic meds appear under Rewards.",
          });
          return;
        }
        const { data: existingRx } = await supabase
          .from("prescriptions")
          .select("id, medication, status")
          .eq("patient_id", patient.id);
        const norm = (s: string) => (s || "").trim().toLowerCase();
        const existingByName = new Map<string, { id: string; status: string }>();
        (existingRx || []).forEach((r: any) => existingByName.set(norm(r.medication), { id: r.id, status: r.status }));
        const composeDosage = (m: CurrentMedication) => {
          const qty = (m.quantity || "").trim();
          const strength = (m.strength || "").trim();
          const units = (m.units || "mg").trim();
          if (qty && strength) return `${qty} \u00d7 ${strength}${units}`;
          if (strength) return `${strength}${units}`;
          return (m.dosage || "").trim();
        };
        const composeFrequency = (m: CurrentMedication) => {
          const tpd = parseInt((m.times_per_day || "").trim(), 10);
          if (Number.isFinite(tpd) && tpd > 0) return `${tpd}\u00d7 daily`;
          return "once daily";
        };
        const chronicNames = new Set(chronicMeds.map((m) => norm(m.name)));
        for (const m of chronicMeds) {
          const key = norm(m.name);
          const existing = existingByName.get(key);
          const payload: any = {
            medication: m.name.trim(),
            dosage: composeDosage(m),
            frequency: composeFrequency(m),
            status: "active",
            reminder_times: m.reminder_time ? [m.reminder_time] : null,
            reminders_enabled: m.reminders_enabled ?? true,
          };
          if (existing) {
            await supabase.from("prescriptions").update(payload).eq("id", existing.id);
          } else {
            await supabase.from("prescriptions").insert({
              ...payload,
              patient_id: patient.id,
              doctor_id: doctorId!,
            });
          }
        }
        for (const [name, rx] of existingByName.entries()) {
          if (!chronicNames.has(name) && rx.status === "active") {
            await supabase.from("prescriptions").update({ status: "cancelled" }).eq("id", rx.id);
          }
        }
        emitMedicationsUpdated(patient.id);
        queryClient.invalidateQueries({ queryKey: ["chronic-prescriptions", patient.id] });
        queryClient.invalidateQueries({ queryKey: ["todays-medications", patient.id] });
      } catch (err) {
        console.error("chronic to prescriptions sync failed", err);
      }
    },
    [patient?.id, isDoctor, toast, queryClient],
  );

  // Medical insurance makes employer details compulsory.
  const insuranceCaptured = Boolean(
    formData.medical_aid?.trim() || formData.medical_aid_number?.trim(),
  );

  const performSave = useCallback(

    async (data: typeof formData, surgeriesData: Surgery[]) => {
      if (!data.first_name.trim() && !data.last_name.trim()) return;
      if (!patient?.id) {
        toast({ title: "Cannot save without a client record", variant: "destructive" });
        return;
      }
      // Employer becomes compulsory once medical insurance has been captured.
      if ((data.medical_aid?.trim() || data.medical_aid_number?.trim()) && !data.employer?.trim()) {
        toast({
          title: "Employer required",
          description: "Employer details are required when insurance is captured.",
          variant: "destructive",
        });
        return;
      }
      const fullName = `${data.first_name.trim()} ${data.last_name.trim()}`.trim();

      const isChronic = currentMedications.some((m) => m.is_chronic);
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
        postal_address: data.same_as_physical ? data.physical_address : data.postal_address || null,
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
        pharmacy_name: pharmacies.find((p) => p.is_primary)?.name || data.pharmacy_name || null,
        pharmacy_email: pharmacies.find((p) => p.is_primary)?.email || data.pharmacy_email || null,
        notes: data.notes || null,
        blood_type: data.blood_type || null,
        family_history: familyHistory,
        organ_donor: data.organ_donor,
        organ_donor_organs: organDonorOrgans,
        preferred_language: data.preferred_language || null,
        next_of_kin_members: nokMembers,
        current_medications: currentMedications,
        conditions_diagnoses: conditionsDiagnoses,
        allergies_structured: allergiesStructured,
        is_chronic: isChronic,
      } as any);
      // Sync chronic meds → prescriptions so they appear under Rewards
      await syncChronicMedsToPrescriptions(currentMedications);
      setSaving(false);
      setHasChanges(false);
      setLastSavedAt(Date.now());
    },
    [onSave, pharmacies, familyHistory, organDonorOrgans, nokMembers, currentMedications, conditionsDiagnoses, allergiesStructured, syncChronicMedsToPrescriptions, patient?.id, toast],
  );

  useEffect(() => {
    if (!isEditing || !hasChanges) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      performSave(formData, surgeries);
    }, 600);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    formData,
    surgeries,
    pharmacies,
    familyHistory,
    organDonorOrgans,

    nokMembers,
    currentMedications,
    conditionsDiagnoses,
    allergiesStructured,
    isEditing,
    hasChanges,
    performSave,
  ]);

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const toggleOrganDonorOrgan = (organ: string) => {
    setOrganDonorOrgans((prev) => (prev.includes(organ) ? prev.filter((o) => o !== organ) : [...prev, organ]));
    setHasChanges(true);
  };

  // Surgery handlers
  const handleAddSurgery = () => {
    if (!newSurgery.name.trim()) {
      toast({ title: "Required Fields", description: "Please enter surgery name", variant: "destructive" });
      return;
    }
    let dateVal = newSurgery.date;
    if (newSurgery.date_precision === "year" && !dateVal) {
      toast({ title: "Required", description: "Please enter a year", variant: "destructive" });
      return;
    }
    if (newSurgery.date_precision === "month" && !dateVal) {
      toast({ title: "Required", description: "Please enter month/year", variant: "destructive" });
      return;
    }
    if (newSurgery.date_precision === "exact" && !dateVal) {
      toast({ title: "Required", description: "Please enter date", variant: "destructive" });
      return;
    }

    if (editingSurgeryId) {
      setSurgeries((prev) =>
        prev.map((s) =>
          s.id === editingSurgeryId
            ? {
                ...s,
                name: newSurgery.name.trim(),
                date: dateVal,
                notes: newSurgery.notes.trim() || undefined,
                date_precision: newSurgery.date_precision,
              }
            : s,
        ),
      );
      setEditingSurgeryId(null);
    } else {
      const surgery: Surgery = {
        id: crypto.randomUUID(),
        name: newSurgery.name.trim(),
        date: dateVal,
        notes: newSurgery.notes.trim() || undefined,
        date_precision: newSurgery.date_precision,
      };
      setSurgeries((prev) => [...prev, surgery]);
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
    setSurgeries((prev) => prev.filter((s) => s.id !== id));
    setHasChanges(true);
  };

  // Pharmacy handlers
  const handleAddPharmacy = () => {
    if (!newPharmacy.name.trim()) {
      toast({ title: "Required", description: "Pharmacy name is required", variant: "destructive" });
      return;
    }
    if (editingPharmacyId) {
      setPharmacies((prev) =>
        prev.map((p) =>
          p.id === editingPharmacyId
            ? {
                ...p,
                name: newPharmacy.name.trim(),
                email: newPharmacy.email.trim(),
                branch: newPharmacy.branch.trim() || undefined,
              }
            : p,
        ),
      );
      setEditingPharmacyId(null);
    } else {
      const pharmacy: Pharmacy = {
        id: crypto.randomUUID(),
        name: newPharmacy.name.trim(),
        email: newPharmacy.email.trim() || "",
        branch: newPharmacy.branch.trim() || undefined,
        is_primary: pharmacies.length === 0,
      };
      setPharmacies((prev) => [...prev, pharmacy]);
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
    setPharmacies((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      if (updated.length > 0 && !updated.some((p) => p.is_primary)) updated[0].is_primary = true;
      return updated;
    });
    setHasChanges(true);
  };

  const handleSetPrimaryPharmacy = (id: string) => {
    setPharmacies((prev) => prev.map((p) => ({ ...p, is_primary: p.id === id })));
    setHasChanges(true);
  };

  // Family history handlers
  const handleAddFamilyEntry = () => {
    if (!newFamilyEntry.relation.trim() || !newFamilyEntry.condition.trim()) {
      toast({ title: "Required", description: "Both relation and condition are required", variant: "destructive" });
      return;
    }
    if (editingFamilyId) {
      setFamilyHistory((prev) =>
        prev.map((f) =>
          f.id === editingFamilyId
            ? { ...f, relation: newFamilyEntry.relation.trim(), condition: newFamilyEntry.condition.trim() }
            : f,
        ),
      );
      setEditingFamilyId(null);
    } else {
      setFamilyHistory((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          relation: newFamilyEntry.relation.trim(),
          condition: newFamilyEntry.condition.trim(),
        },
      ]);
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
    setFamilyHistory((prev) => prev.filter((f) => f.id !== id));
    setHasChanges(true);
  };

  // NOK members handlers
  const handleAddNOK = () => {
    if (!newNOK.name.trim()) {
      toast({ title: "Required", description: "Name is required", variant: "destructive" });
      return;
    }
    if (newNOK.email.trim() && !isValidOptionalEmail(newNOK.email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    if (editingNOKId) {
      setNokMembers((prev) =>
        prev.map((n) => (n.id === editingNOKId ? { ...n, ...newNOK, name: newNOK.name.trim() } : n)),
      );
      setEditingNOKId(null);
    } else {
      setNokMembers((prev) => [...prev, { id: crypto.randomUUID(), ...newNOK, name: newNOK.name.trim() }]);
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

  // Compose a human-readable dosage string from structured fields
  const composeDosage = (m: { quantity?: string; strength?: string; units?: string; times_per_day?: string; dosage?: string }) => {
    const parts: string[] = [];
    if (m.quantity && m.strength) parts.push(`${m.quantity} × ${m.strength}${m.units || "mg"}`);
    else if (m.strength) parts.push(`${m.strength}${m.units || "mg"}`);
    else if (m.quantity && m.quantity !== "1") parts.push(`${m.quantity} units`);
    if (m.times_per_day && m.times_per_day !== "1") parts.push(`${m.times_per_day}× daily`);
    else if (m.times_per_day === "1") parts.push("once daily");
    const composed = parts.join(", ");
    return composed || m.dosage || "";
  };

  // Current medications handlers
  const handleAddMed = () => {
    if (!newMed.name.trim()) {
      toast({ title: "Required", description: "Medication name is required", variant: "destructive" });
      return;
    }
    const composedDosage = composeDosage(newMed) || newMed.dosage.trim() || undefined;
    const fields = {
      name: newMed.name.trim(),
      dosage: composedDosage,
      quantity: newMed.quantity || undefined,
      strength: newMed.strength || undefined,
      units: newMed.units || "mg",
      times_per_day: newMed.times_per_day || undefined,
      is_chronic: newMed.is_chronic,
      status: newMed.status,
      start_date: newMed.start_date || undefined,
      end_date: newMed.end_date || undefined,
      reminder_time: newMed.reminder_time || undefined,
      reminders_enabled: newMed.reminders_enabled,
    };
    if (editingMedId) {
      setCurrentMedications((prev) =>
        prev.map((m) => (m.id === editingMedId ? { ...m, ...fields } : m)),
      );
      setEditingMedId(null);
    } else {
      setCurrentMedications((prev) => [...prev, { id: crypto.randomUUID(), ...fields }]);
    }
    setNewMed({
      name: "", dosage: "", quantity: "1", strength: "", units: "mg",
      times_per_day: "1", is_chronic: false, status: "current", start_date: "", end_date: "",
      reminder_time: "08:00", reminders_enabled: true,
    });
    setShowAddMed(false);
    setHasChanges(true);
  };

  const handleEditMed = (m: CurrentMedication) => {
    setNewMed({
      name: m.name,
      dosage: m.dosage || "",
      quantity: m.quantity || "1",
      strength: m.strength || "",
      units: m.units || "mg",
      times_per_day: m.times_per_day || "1",
      is_chronic: m.is_chronic,
      status: m.status || "current",
      start_date: m.start_date || "",
      end_date: m.end_date || "",
      reminder_time: (m as any).reminder_time || "08:00",
      reminders_enabled: (m as any).reminders_enabled ?? true,
    });
    setEditingMedId(m.id);
    setShowAddMed(true);
  };

  // Conditions handlers
  const handleAddCondition = () => {
    if (!newCondition.name.trim()) {
      toast({ title: "Required", description: "Condition name is required", variant: "destructive" });
      return;
    }
    if (editingConditionId) {
      setConditionsDiagnoses((prev) =>
        prev.map((c) =>
          c.id === editingConditionId
            ? {
                ...c,
                name: newCondition.name.trim(),
                diagnosed_date: newCondition.diagnosed_date || undefined,
                diagnosed_by: newCondition.diagnosed_by.trim() || undefined,
                status: newCondition.status,
              }
            : c,
        ),
      );
      setEditingConditionId(null);
    } else {
      setConditionsDiagnoses((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: newCondition.name.trim(),
          diagnosed_date: newCondition.diagnosed_date || undefined,
          diagnosed_by: newCondition.diagnosed_by.trim() || undefined,
          status: newCondition.status,
        },
      ]);
    }
    setNewCondition({ name: "", diagnosed_date: "", diagnosed_by: "", status: "active" });
    setShowAddCondition(false);
    setHasChanges(true);
  };

  const handleEditCondition = (c: ConditionDiagnosis) => {
    setNewCondition({
      name: c.name,
      diagnosed_date: c.diagnosed_date || "",
      diagnosed_by: c.diagnosed_by || "",
      status: c.status,
    });
    setEditingConditionId(c.id);
    setShowAddCondition(true);
  };

  // Allergies handlers
  const handleAddAllergy = () => {
    if (!newAllergy.name.trim()) {
      toast({ title: "Required", description: "Allergy name is required", variant: "destructive" });
      return;
    }
    if (editingAllergyId) {
      setAllergiesStructured((prev) =>
        prev.map((a) =>
          a.id === editingAllergyId
            ? {
                ...a,
                name: newAllergy.name.trim(),
                severity: newAllergy.severity,
                reaction: newAllergy.reaction.trim() || undefined,
                date_identified: newAllergy.date_identified || undefined,
              }
            : a,
        ),
      );
      setEditingAllergyId(null);
    } else {
      setAllergiesStructured((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: newAllergy.name.trim(),
          severity: newAllergy.severity,
          reaction: newAllergy.reaction.trim() || undefined,
          date_identified: newAllergy.date_identified || undefined,
        },
      ]);
    }
    setNewAllergy({ name: "", severity: "mild", reaction: "", date_identified: "" });
    setShowAddAllergy(false);
    setHasChanges(true);
  };

  const handleEditAllergy = (a: Allergy) => {
    setNewAllergy({
      name: a.name,
      severity: a.severity,
      reaction: a.reaction || "",
      date_identified: a.date_identified || "",
    });
    setEditingAllergyId(a.id);
    setShowAddAllergy(true);
  };

  const handleToggleMedChronic = (id: string) => {
    setCurrentMedications((prev) => prev.map((m) => (m.id === id ? { ...m, is_chronic: !m.is_chronic } : m)));
    setHasChanges(true);
  };

  // GP search
  const searchGP = async (term: string) => {
    setGpSearchTerm(term);
    updateFormData({ general_practitioner: term });
    if (term.length < 2) {
      setGpSearchResults([]);
      return;
    }
    // Doctor role can live in either `profiles.role` or the separate
    // `user_roles` table depending on when the account was created, so
    // check both and match on either to avoid missing real doctors.
    const [{ data: roleRows }, { data: matchingProfiles }] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "doctor"),
      supabase
        .from("profiles")
        .select("id, full_name, practice_number, doctor_number, specialty, role")
        .or(`full_name.ilike.%${term}%,practice_number.ilike.%${term}%,doctor_number.ilike.%${term}%`)
        .limit(20),
    ]);
    const doctorIds = new Set((roleRows || []).map((r: any) => r.user_id));
    const data = (matchingProfiles || []).filter((p: any) => p.role === "doctor" || doctorIds.has(p.id)).slice(0, 5);
    setGpSearchResults(data || []);
    if ((data || []).length > 0) setGpSearchOpen(true);
  };

  const handleCancel = () => {
    const fn = patient.first_name || splitName(patient.name).first;
    const ln = patient.last_name || splitName(patient.name).last;
    setFormData({
      first_name: fn,
      last_name: ln,
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
      preferred_language: (patient as any).preferred_language || "",
    });
    setOrganDonorOrgans(patient.organ_donor_organs || []);
    setSurgeries(patient.surgeries || []);
    setFamilyHistory(patient.family_history || []);

    setNokMembers(patient.next_of_kin_members || []);
    setCurrentMedications(patient.current_medications || []);
    setConditionsDiagnoses(patient.conditions_diagnoses || []);
    setAllergiesStructured(patient.allergies_structured || []);
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
  const isChronic = currentMedications.some((m) => m.is_chronic);

  const ViewField = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="flex items-center gap-2">
      <Label className="w-28 shrink-0 text-xs font-bold">{label}</Label>
      <Input value={value || "Not provided"} disabled className="bg-muted/50 h-8 text-xs" />
    </div>
  );

  // Profile banner for self-service patients
  const ProfileBanner = () => {
    if (!isSelfService) return null;
    const initials =
      patient.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?";

    const upcomingAppointments = bannerAppointments;

    return (
      <div className={sectionFrame + " mb-4"}>
        {/* Row 1: Avatar + Greeting */}
        <div className="flex items-start gap-4">
          <div
            className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
            onClick={() => avatarInputRef.current?.click()}
          >
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-primary">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={patient.name} /> : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">{initials}</AvatarFallback>
              </Avatar>
              {/* Always-visible camera badge so users notice the upload affordance */}
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background">
                {uploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </div>
            </div>
            <span className="text-xs font-medium text-primary-dark mt-0.5">
              {avatarUrl ? "Change photo" : "Add photo"}
            </span>

            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              {(() => {
                const hour = new Date().getHours();
                const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
                return `${greeting}, ${patient.name.split(" ")[0]}`;
              })()}
            </h3>
            <p className="text-muted-foreground text-xs">
              Here's what's happening today, {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          {/* Vulas inline on desktop only (tablet shows below "What's happening") */}
          {!rewardsLoading && lollipopCount !== undefined && (
            <div className="hidden lg:flex shrink-0 items-center gap-3 ml-auto">
              <img src={vulaVouchersLogo} alt="Vulas" className="h-[60px] w-auto object-contain" />
              <span className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
                <AnimatedCounter target={lollipopCount} />
              </span>
            </div>
          )}
        </div>

        {/* Row 2: Upcoming Appointments */}
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Upcoming Appointments</span>
          </div>
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-1.5">
              {upcomingAppointments.map((appt: any) => {
                const start = appt.proposed_start || appt.requested_start;
                const doctorProfile = appt.profiles as any;
                return (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between text-xs bg-muted/50 rounded-md px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-foreground truncate">
                        {doctorProfile?.full_name || "Doctor"}
                      </span>
                      {doctorProfile?.specialty && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 shrink-0">
                          {doctorProfile.specialty}
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {format(parseISO(start), "MMM d, h:mm a")}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No upcoming appointments.</p>
          )}
        </div>

        {/* Row 3: Vulas - mobile + tablet (desktop shows inline above) */}
        {!rewardsLoading && lollipopCount !== undefined && (
          <div className="mt-3 border-t border-border pt-3 lg:hidden">
            <div className="flex items-center justify-center gap-2">
              <img src={vulaVouchersLogo} alt="Vulas" className="h-[60px] w-auto object-contain" />
              <span className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
                <AnimatedCounter target={lollipopCount} />
              </span>
            </div>
          </div>
        )}

        {/* Row 4: Action Buttons */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 text-xs gap-1.5"
            onClick={() => {
              setActiveTab("calendar");
              if (isMobile && isSelfService) navigate("/patient/details?section=admin");
            }}
          >
            <Calendar className="h-3.5 w-3.5" />
            Calendar
          </Button>
          <Button
            size="sm"
            className="w-full h-9 text-xs gap-1.5"
            onClick={() => {
              setActiveTab("tasks");
              if (isMobile && isSelfService) navigate("/patient/details?section=admin");
            }}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Record Task
          </Button>
        </div>
      </div>
    );
  };

  // Per-record share handler for NOK contacts
  const handleShareRecord = (type: "nok", record: { id: string; name: string; phone: string; email: string }) => {
    const shareUrl = `${window.location.origin}/patient/${patient.id}`;
    const text = `${record.name} - Emergency Contact for ${patient.name}\n${shareUrl}`;

    setNokMembers((prev) => prev.map((n) => (n.id === record.id ? { ...n, shared: true } : n)));
    setHasChanges(true);

    if (navigator.share) {
      navigator.share({ title: `Emergency Contact - ${record.name}`, text, url: shareUrl });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Link copied", description: `Share link for ${record.name} copied to clipboard` });
    }
  };

  // Parent tab groups for desktop/tablet
  const PROFILE_TABS = ["personal", "medical", "overview"];
  const CARE_TABS = ["history", "roundtable"];
  const ADMIN_TABS = ["calendar", "tasks", "documents"];

  const handleParentTabClick = (parent: string, tabs: string[]) => {
    if (activeParentTab === parent) return;
    setActiveParentTab(parent);
    setActiveTab(tabs[0]);
  };

  // When activeTab changes, sync activeParentTab
  useEffect(() => {
    if (PROFILE_TABS.includes(activeTab)) setActiveParentTab("profile");
    else if (CARE_TABS.includes(activeTab)) setActiveParentTab("care");
    else if (ADMIN_TABS.includes(activeTab)) setActiveParentTab("admin");
    else setActiveParentTab(null);
  }, [activeTab]);

  // Tab list renderer
  const renderTabsList = () => {
    const activeTabs = isSelfService && section ? SECTION_TABS[section] || null : null;
    const show = (tab: string) => !activeTabs || activeTabs.includes(tab);
    const triggerClass =
      "tab-brand whitespace-nowrap text-xs px-3 py-1.5";

    // Self-service (mobile + tablet + web): tabs filtered by current section
    if (isSelfService && section) {
      return (
        <TabsList className="bg-primary flex-nowrap overflow-x-auto scrollbar-hide w-full justify-start">
          {show("overview") && (
            <TabsTrigger value="overview" className={triggerClass}>
              Overview
            </TabsTrigger>
          )}
          {show("personal") && (
            <TabsTrigger value="personal" className={triggerClass}>
              {t("patientProfile.togglePersonal")}
            </TabsTrigger>
          )}
          {show("medical") && (
            <TabsTrigger value="medical" className={triggerClass}>
              {t("patientProfile.toggleMedical")}
            </TabsTrigger>
          )}
          {show("history") && (
            <TabsTrigger value="history" className={triggerClass}>
              My Meetings
            </TabsTrigger>
          )}
          {show("claims") && (
            <TabsTrigger value="claims" className={triggerClass}>
              Claims
            </TabsTrigger>
          )}
          {show("documents") && (
            <TabsTrigger value="documents" className={triggerClass}>
              Documents
            </TabsTrigger>
          )}
          {show("lifeEvents") && (
            <TabsTrigger value="lifeEvents" className={triggerClass}>
              Life Events
            </TabsTrigger>
          )}
          {show("labresults") && (
            <TabsTrigger value="labresults" className={triggerClass}>
              {t("nav.labResults", "Lab Results")}
            </TabsTrigger>
          )}
          {show("roundtable") && (
            <TabsTrigger value="roundtable" className={triggerClass}>
              {t("patientProfile.tabRoundTable")}
            </TabsTrigger>
          )}
          {show("calendar") && (
            <TabsTrigger value="calendar" className={triggerClass}>
              {t("nav.myCalendar")}
            </TabsTrigger>
          )}
          {show("tasks") && (
            <TabsTrigger value="tasks" className={triggerClass}>
              {t("nav.myTasks")}
            </TabsTrigger>
          )}
          {show("programmes") && (
            <TabsTrigger value="programmes" className={triggerClass}>
              Programmes
            </TabsTrigger>
          )}
        </TabsList>
      );
    }

    // Desktop/Tablet for doctor-viewed patient: Personal & Medical tabs on the green bar
    return (
      <TabsList className="bg-primary flex-nowrap overflow-x-auto scrollbar-hide w-full justify-start">
        <TabsTrigger
          value="personal"
          className="whitespace-nowrap text-white data-[state=active]:bg-background data-[state=active]:text-foreground text-xs px-3 py-1.5"
        >
          {t("patientProfile.togglePersonal")}
        </TabsTrigger>
        <TabsTrigger
          value="medical"
          className="whitespace-nowrap text-white data-[state=active]:bg-background data-[state=active]:text-foreground text-xs px-3 py-1.5"
        >
          {t("patientProfile.toggleMedical")}
        </TabsTrigger>
      </TabsList>
    );
  };


  // Compact profile banner for non-Home mobile sections
  const CompactBanner = () => {
    if (!isSelfService || !isMobile || section === "home") return null;
    const initials =
      patient.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?";
    const upcomingAppointments = bannerAppointments;
    return (
      <div className={sectionFrame + " mb-4"}>
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <Avatar className="h-14 w-14 border-2 border-primary shrink-0">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={patient.name} /> : null}
            <AvatarFallback className="bg-primary text-primary text-base font-semibold">{initials}</AvatarFallback>
          </Avatar>
          {/* Vula counter + logo */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <img src={vulaVouchersLogo} alt="Vulas" className="h-6 w-auto object-contain" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
              <AnimatedCounter target={lollipopCount} />
            </span>
          </div>
        </div>
        {/* Bottom row: calendar/mic + appointments */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setActiveTab("calendar");
                navigate("/patient/details?section=admin");
              }}
            >
              <Calendar className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setActiveTab("tasks");
                navigate("/patient/details?section=admin");
              }}
            >
              <Mic className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {upcomingAppointments.length > 0
              ? `${upcomingAppointments.length} upcoming appointment${upcomingAppointments.length > 1 ? "s" : ""}`
              : "No upcoming appointments."}
          </p>
        </div>
      </div>
    );
  };

  // ==================== VIEW MODE ====================
  if (!isEditing) {
    const showFullBanner = isSelfService && section === "health";
    const showCompactBanner = false;
    const showTabs = true;
    return (
      <div className="space-y-0">
        {/* Hero banner now lives on My Dashboard */}
        {showCompactBanner && <CompactBanner />}
        <div className="rounded-xl border border-primary bg-card p-2 md:p-6 space-y-2 md:space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {renderTabsList()}

            {/* === MY HOLARCHY TAB (overview) === */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <ClientAISummary patientId={patient.id} />
              <MyAdvisorsHistory patientId={patient.id} />
            </TabsContent>

            {/* === PERSONAL / MEDICAL (top-level tabs) === */}
<TabsContent value="personal" className="space-y-4 mt-4">
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-primary-dark">{t("patientProfile.personalHeading")}</h2>
                  <p className="text-xs text-muted-foreground">{t("patientProfile.personalHelper")}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>

              <div className="patient-section-frame rounded-xl border border-border bg-card overflow-hidden divide-y divide-white">
              <Collapsible defaultOpen={false} className="bg-card overflow-hidden">

                <SectionHeader icon={User} label="Personal Information" />
                <CollapsibleContent className="p-3">
                  <div className={FIELD_GRID_2_CLASS}>
                    <ViewField label="First Name(s)" value={patient.first_name || splitName(patient.name).first} />
                    <ViewField label="Last Name" value={patient.last_name || splitName(patient.name).last} />
                    <ViewField label="ID/Passport Number" value={patient.id_passport_number} />
                    <ViewField label="Gender" value={patient.gender} />
                    <ViewField
                      label="Date of Birth"
                      value={patient.dob ? format(new Date(patient.dob), "MMMM d, yyyy") : null}
                    />
                    <ViewField label="Email" value={patient.email} />
                    <ViewField label="Phone" value={stripDialCode(patient.phone)} />
                    <ViewField label="Marital Status" value={patient.marital_status} />
                    <ViewField label="Language" value={LANGUAGES.find(l => l.code === (patient as any).preferred_language)?.name || (patient as any).preferred_language || "—"} />
                    <ViewField label="Referred By" value={patient.referred_by} />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible defaultOpen={false} className="bg-card overflow-hidden">
                <SectionHeader icon={MapPin} label="Addresses" />
                <CollapsibleContent className="p-3">
                  <div className={FIELD_GRID_2_CLASS}>
                    <ViewField label="Physical Address" value={patient.physical_address || patient.address} />
                    <ViewField
                      label="Postal Address"
                      value={patient.same_as_physical ? "Same as physical address" : patient.postal_address}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible defaultOpen={false} className="bg-card overflow-hidden">
                <SectionHeader icon={Briefcase} label="Employer" />
                <CollapsibleContent className="p-3">
                  <div className={FIELD_GRID_2_CLASS}>
                    <ViewField label="Employer" value={patient.employer} />
                    <ViewField label="Occupation" value={patient.occupation} />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible defaultOpen={false} className="bg-card overflow-hidden">
                <SectionHeader icon={Users} label="Beneficiaries" />
                <CollapsibleContent className="p-3">
                  {nokMembers.length > 0 ? (
                    <div className="space-y-2">
                      {nokMembers.map((nok) => (
                        <div
                          key={nok.id}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-muted/30 border border-border/50"
                        >
                          <div>
                            <p className="text-xs font-medium text-foreground">
                              {nok.name}{" "}
                              {nok.relationship && <span className="text-muted-foreground">({nok.relationship})</span>}
                            </p>
                            {nok.phone && <p className="text-xs text-muted-foreground">{nok.phone}</p>}
                            {nok.email && <p className="text-xs text-muted-foreground">{nok.email}</p>}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="Notify"
                              onClick={() =>
                                toast({ title: "Notification sent", description: `${nok.name} has been notified` })
                              }
                            >
                              <Bell className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleShareRecord("nok", nok)}
                            >
                              <Share2
                                className={cn("h-3 w-3", nok.shared ? "text-muted-foreground" : "text-primary")}
                              />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={FIELD_GRID_2_CLASS}>

                      <ViewField label="Name" value={patient.next_of_kin_name} />
                      <ViewField label="Relationship" value={patient.next_of_kin_relationship} />
                      <ViewField label="Phone" value={stripDialCode(patient.next_of_kin_phone)} />
                      <ViewField label="Email" value={patient.next_of_kin_email} />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <Collapsible defaultOpen={false} className="bg-card overflow-hidden">
                <SectionHeader icon={StickyNote} label="General Notes" />
                <CollapsibleContent className="p-3">
                  <p className="text-xs text-foreground whitespace-pre-wrap">{patient.notes || "No notes recorded"}</p>
                </CollapsibleContent>
              </Collapsible>
              </div>
            </TabsContent>

            {/* === MEDICAL INFORMATION TAB — TWO COLUMNS === */}
            <TabsContent value="medical" className="mt-4 space-y-3">
              <div><h2 className="text-lg font-semibold text-primary-dark">Financial Information</h2><p className="text-xs text-muted-foreground">The facts behind the Financial Needs Analysis.</p></div>
              <FinancialInformation patientId={patient.id} />
            </TabsContent>



            {/* === TASKS TAB === */}
            {isSelfService && (
              <TabsContent value="tasks" className="mt-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-primary-dark">My Actions</h2>
                  <p className="text-xs text-muted-foreground">Manage your health actions and to-dos</p>
                </div>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  }
                >
                  <PatientTasksLazy />
                </Suspense>
              </TabsContent>
            )}

            {isSelfService && (
              <TabsContent value="history" className="mt-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-primary-dark">My Meetings</h2>
                  <p className="text-xs text-muted-foreground">Your consultations with your advisers. You can also record meetings with advisers not on Holarc Wealth.</p>
                </div>
                <PatientSessionRecorder patientId={patient.id} patientName={patient.name} />
              </TabsContent>
            )}

            {isSelfService && (
              <TabsContent value="lifeEvents" className="mt-4">
                <LifeEventsPanel patientId={patient.id} />
              </TabsContent>
            )}

            {isSelfService && (
              <TabsContent value="calendar" className="mt-4">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  }
                >
                  <PatientCalendarLazy />
                </Suspense>
              </TabsContent>
            )}

            {isSelfService && (
              <TabsContent value="programmes" className="mt-4">
                <PatientProgrammesTab patientId={patient.id} canManage={false} isSelf />
              </TabsContent>
            )}


            {isSelfService && (
              <TabsContent value="documents" className="mt-4">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  }
                >
                  <PatientDocuments hideHeader={false} />
                </Suspense>
              </TabsContent>
            )}

            {isSelfService && (
              <TabsContent value="labresults" className="mt-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-primary-dark">Lab Results</h2>
                  <p className="text-xs text-muted-foreground">Lab requests and results shared by your care team.</p>
                </div>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  }
                >
                  <TestResultsPanel patientId={patient.id} />
                </Suspense>
              </TabsContent>
            )}

            {isSelfService && (
              <TabsContent value="roundtable" className="mt-4">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-primary-dark">My Round Table</h2>
                  <p className="text-xs text-muted-foreground">
                    Notes shared by your healthcare providers about your care
                  </p>
                </div>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  }
                >
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
      {!isSelfService && <ProfileBanner />}
      <div className="rounded-xl border border-primary bg-card p-2 md:p-6 space-y-2 md:space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {renderTabsList()}
          {saving && (
            <div className="flex justify-end mt-2">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            </div>
          )}
          {!saving && !hasChanges && isEditing && (
            <div className="flex justify-end mt-2">
              <span className="flex items-center gap-1.5 text-xs text-primary">
                <Save className="h-4 w-4" />
                Saved
              </span>
            </div>
          )}

          {/* === MY HOLARCHY TAB (EDIT, overview) === */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <ClientAISummary patientId={patient.id} />
            <MyAdvisorsHistory patientId={patient.id} />
            </TabsContent>

            {/* === PERSONAL / MEDICAL (top-level tabs) === */}
<TabsContent value="personal" className="space-y-4 mt-4">
            <div className="mb-1 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-primary-dark">{t("patientProfile.personalHeading")}</h2>
                <p className="text-xs text-muted-foreground">{t("patientProfile.personalHelper")}</p>
              </div>
              <AutosaveStatus saving={saving} hasChanges={hasChanges} lastSavedAt={lastSavedAt} />
            </div>

            <div className="patient-section-frame rounded-xl border border-border bg-card overflow-hidden divide-y divide-white">
            <Collapsible defaultOpen={false} className="bg-card overflow-hidden">
              <SectionHeader icon={User} label="Personal Information" />
              <CollapsibleContent className="p-3">
                {/* Horizontal label/field rows: bold, one size smaller labels */}
                <div className={FIELD_GRID_2_CLASS}>

                  <div className="space-y-1.5">
                    <Label htmlFor="first_name">First Name(s) *</Label>
                    <Input
                      id="first_name"
                      className="text-sm"
                      value={formData.first_name}
                      onChange={(e) => updateFormData({ first_name: e.target.value })}
                      placeholder="First name(s)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      className="text-sm"
                      value={formData.last_name}
                      onChange={(e) => updateFormData({ last_name: e.target.value })}
                      placeholder="Last name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="id_passport_number">ID/Passport Number</Label>
                    <Input
                      id="id_passport_number"
                      className="text-sm"
                      value={formData.id_passport_number}
                      onChange={(e) => { const v = e.target.value; const dob = dobFromSaId(v); updateFormData(dob ? { id_passport_number: v, dob } as any : { id_passport_number: v }); }}
                      placeholder="ID or passport number"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender} onValueChange={(value) => updateFormData({ gender: value })}>
                      <SelectTrigger id="gender" className="text-sm">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      className="text-sm"
                      type="date"
                      value={formData.dob}
                      onChange={(e) => updateFormData({ dob: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      className="text-sm"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData({ email: e.target.value })}
                      placeholder="client@email.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <PhoneInput value={formData.phone} onChange={(v) => updateFormData({ phone: v })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="marital_status">Marital Status</Label>
                    <Select
                      value={formData.marital_status}
                      onValueChange={(value) => updateFormData({ marital_status: value })}
                    >
                      <SelectTrigger id="marital_status" className="text-sm">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="marital_regime">Marital Regime</Label>
                    <Select
                      value={(formData as any).marital_regime || ""}
                      onValueChange={(value) => updateFormData({ marital_regime: value } as any)}
                    >
                      <SelectTrigger id="marital_regime" className="text-sm">
                        <SelectValue placeholder="Select regime" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In community of property">In community of property</SelectItem>
                        <SelectItem value="Out of community with accrual">Out of community with accrual</SelectItem>
                        <SelectItem value="Out of community without accrual">Out of community without accrual</SelectItem>
                        <SelectItem value="Not applicable">Not applicable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="preferred_language">Language</Label>
                    <Select
                      value={formData.preferred_language}
                      onValueChange={(value) => updateFormData({ preferred_language: value })}
                    >
                      <SelectTrigger id="preferred_language" className="text-sm">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="referred_by">Referred By</Label>
                    <Input
                      id="referred_by"
                      className="text-sm"
                      value={formData.referred_by}
                      onChange={(e) => updateFormData({ referred_by: e.target.value })}
                      placeholder="Referral source"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible defaultOpen={false} className="bg-card overflow-hidden">
              <SectionHeader icon={MapPin} label="Addresses" />
              <CollapsibleContent className="p-3">
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="physical_address" className="text-xs font-bold">Physical Address</Label>
                    <AddressAutocomplete
                      id="physical_address"
                      value={formData.physical_address}
                      onChange={(v) => updateFormData({ physical_address: v })}
                      placeholder="Start typing to search address..."
                      rows={2}
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id="same_as_physical"
                        checked={formData.same_as_physical}
                        onCheckedChange={(checked) => updateFormData({ same_as_physical: checked as boolean })}
                      />
                      <Label htmlFor="same_as_physical" className="text-xs font-bold">
                        Postal address same as physical address
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="postal_address" className="text-xs font-bold">Postal Address</Label>
                    {formData.same_as_physical ? (
                      <Textarea
                        id="postal_address"
                        value={formData.physical_address}
                        disabled
                        rows={2}
                        className="bg-muted/50 text-xs"
                      />
                    ) : (
                      <AddressAutocomplete
                        id="postal_address"
                        value={formData.postal_address}
                        onChange={(v) => updateFormData({ postal_address: v })}
                        placeholder="Start typing to search address..."
                        rows={2}
                      />
                    )}
                  </div>
                </div>
              </CollapsibleContent>

            </Collapsible>

            {/* Beneficiaries */}
            <Collapsible defaultOpen={false} className="bg-card overflow-hidden">
              <SectionHeader icon={Briefcase} label="Employer" />
              <CollapsibleContent className="p-3">
                <div className={FIELD_GRID_2_CLASS}>
                  <div className="space-y-1.5">
                    <Label htmlFor="employer">
                      Employer{insuranceCaptured ? " *" : ""}
                    </Label>
                    <Input
                      id="employer"
                      className="text-sm"
                      value={formData.employer}
                      onChange={(e) => updateFormData({ employer: e.target.value })}
                      placeholder="Company name"
                    />
                    {insuranceCaptured && !formData.employer?.trim() && (
                      <p className="text-xs text-destructive">
                        Employer details are required when medical insurance is captured.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input
                      id="occupation"
                      className="text-sm"
                      value={formData.occupation}
                      onChange={(e) => updateFormData({ occupation: e.target.value })}
                      placeholder="Job title"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible defaultOpen={false} className="bg-card overflow-hidden">
              <SectionHeader icon={Users} label="Beneficiaries" />
              <CollapsibleContent className="p-3">
                <div className="flex justify-end mb-3">
                  {!showAddNOK && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs h-8 px-3"
                      onClick={() => setShowAddNOK(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  )}
                </div>

                {/* Legacy single NOK if no members yet */}
                {nokMembers.length === 0 && (
                  <div className={FIELD_GRID_2_CLASS + " mb-3"}>
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input
                        className="text-sm"
                        value={formData.next_of_kin_name}
                        onChange={(e) => updateFormData({ next_of_kin_name: e.target.value })}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Relationship</Label>
                      <RelationshipSelect
                        value={formData.next_of_kin_relationship}
                        onChange={(v) => updateFormData({ next_of_kin_relationship: v })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <PhoneInput
                        value={formData.next_of_kin_phone}
                        onChange={(v) => updateFormData({ next_of_kin_phone: v })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        className="text-sm"
                        type="email"
                        value={formData.next_of_kin_email}
                        onChange={(e) => updateFormData({ next_of_kin_email: e.target.value })}
                        placeholder="Email"
                      />
                    </div>
                  </div>
                )}

                {showAddNOK && (
                  <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 mb-3 space-y-2">
                    <div className={FIELD_GRID_2_CLASS}>
                      <div className="space-y-1.5">
                        <Label>Name *</Label>
                        <Input
                          className="text-sm"
                          value={newNOK.name}
                          onChange={(e) => setNewNOK((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Full name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Relationship</Label>
                        <RelationshipSelect
                          value={newNOK.relationship}
                          onChange={(v) => setNewNOK((p) => ({ ...p, relationship: v }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <PhoneInput value={newNOK.phone} onChange={(v) => setNewNOK((p) => ({ ...p, phone: v }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input
                          className="text-sm"
                          type="email"
                          value={newNOK.email}
                          onChange={(e) => setNewNOK((p) => ({ ...p, email: e.target.value }))}
                          placeholder="Email"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          setShowAddNOK(false);
                          setEditingNOKId(null);
                          setNewNOK({ name: "", phone: "", email: "", relationship: "" });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" className="text-xs h-7" onClick={handleAddNOK}>
                        {editingNOKId ? "Save" : "Add"}
                      </Button>
                    </div>
                  </div>
                )}

                {nokMembers.length > 0 && (
                  <div className="space-y-1.5">
                    {nokMembers.map((nok) => (
                      <div
                        key={nok.id}
                        className="p-2 rounded-lg bg-muted/30 border border-border/50 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-foreground">
                              {nok.name}{" "}
                              {nok.relationship && <span className="text-muted-foreground">({nok.relationship})</span>}
                            </p>
                            {nok.phone && <p className="text-xs text-muted-foreground">{nok.phone}</p>}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="Notify"
                              onClick={() =>
                                toast({ title: "Notification sent", description: `${nok.name} has been notified` })
                              }
                            >
                              <Bell className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditNOK(nok)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => {
                                setNokMembers((prev) => prev.filter((n) => n.id !== nok.id));
                                setHasChanges(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 border-t border-border/40">
                          <label className="flex items-center gap-2 text-xs">
                            <Switch
                              checked={!!nok.can_view_profile}
                              onCheckedChange={(v) => {
                                setNokMembers((prev) =>
                                  prev.map((n) => (n.id === nok.id ? { ...n, can_view_profile: v } : n)),
                                );
                                setHasChanges(true);
                              }}
                            />
                            Can view profile
                          </label>
                          <label className="flex items-center gap-2 text-xs">
                            <Switch
                              checked={!!nok.can_view_live_tracking}
                              onCheckedChange={(v) => {
                                setNokMembers((prev) =>
                                  prev.map((n) => (n.id === nok.id ? { ...n, can_view_live_tracking: v } : n)),
                                );
                                setHasChanges(true);
                              }}
                            />
                            Live tracking
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>



            <Collapsible defaultOpen={false} className="bg-card overflow-hidden">
              <SectionHeader icon={StickyNote} label="General Notes" />
              <CollapsibleContent className="p-3">
                <Textarea
                  value={formData.notes}
                  onChange={(e) => updateFormData({ notes: e.target.value })}
                  placeholder="General notes about this client..."
                  rows={4}
                  className="text-xs"
                />
              </CollapsibleContent>
            </Collapsible>
            </div>
          </TabsContent>

          {/* === MEDICAL TAB (EDIT) === */}
          <TabsContent value="medical" className="mt-4 space-y-3">
            <div><h2 className="text-lg font-semibold text-primary-dark">Financial Information</h2><p className="text-xs text-muted-foreground">The facts behind the Financial Needs Analysis.</p></div>
            <FinancialInformation patientId={patient.id} />
          </TabsContent>



          {/* === Tasks tab (edit mode) === */}
          {isSelfService && (
            <TabsContent value="tasks" className="mt-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-primary-dark">My Actions</h2>
                <p className="text-xs text-muted-foreground">Manage your health actions and to-dos</p>
              </div>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                <PatientTasksLazy />
              </Suspense>
            </TabsContent>
          )}

          {isSelfService && (
            <TabsContent value="history" className="mt-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-primary-dark">My Consultations</h2>
                <p className="text-xs text-muted-foreground">Your consultation consultations</p>
              </div>

              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                {patientSessionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : patientSessions.length > 0 ? (
                  <SessionHistoryTableLazy
                    sessions={patientSessions}
                    patientId={patient.id}
                    patientName={patient.name}
                    allergies={patient.allergies}
                  />
                ) : (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No sessions yet.
                  </div>
                )}
              </Suspense>
            </TabsContent>
          )}

          {isSelfService && (
            <TabsContent value="claims" className="mt-4">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                <ClaimsPage />
              </Suspense>
            </TabsContent>
          )}

          {isSelfService && (
            <TabsContent value="calendar" className="mt-4">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                <PatientCalendarLazy />
              </Suspense>
            </TabsContent>
          )}

          {isSelfService && (
            <TabsContent value="documents" className="mt-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-primary-dark">Documents</h2>
                <p className="text-xs text-muted-foreground">
                  All your prescriptions, invoices, certificates and uploaded files
                </p>
              </div>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                <PatientDocuments hideHeader />
              </Suspense>
            </TabsContent>
          )}

          {isSelfService && (
            <TabsContent value="lifeEvents" className="mt-4">
              <LifeEventsPanel patientId={patient.id} />
            </TabsContent>
          )}

          {isSelfService && (
            <TabsContent value="labresults" className="mt-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-primary-dark">Lab Results</h2>
                <p className="text-xs text-muted-foreground">Lab requests and results shared by your care team.</p>
              </div>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                <TestResultsPanel patientId={patient.id} />
              </Suspense>
            </TabsContent>
          )}

          {isSelfService && (
            <TabsContent value="roundtable" className="mt-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-primary-dark">My Round Table</h2>
                <p className="text-xs text-muted-foreground">
                  Notes shared by your healthcare providers about your care
                </p>
              </div>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                <PatientRoundTable hideHeader />
              </Suspense>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
