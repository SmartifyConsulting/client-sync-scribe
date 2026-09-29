import { useState, useEffect, useRef, useCallback } from "react";
import { renderSignaturePngBase64 } from "@/lib/signatureImage";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  Loader2,
  Check,
  Camera,
  Upload,
  Plus,
  Trash2,
  Pencil,
  X,
  Phone,
  Copy,
  Mail,
  Save,
  Award,
  Bold,
  Italic,
  UserPlus,
  ExternalLink,
  User,
  Building2,
  DollarSign,
  GraduationCap,
  Briefcase as Stethoscope,
  Users2,
  Volume2,
  PenTool,
  Calendar as CalendarIcon,
  Palette,
  Sparkles,
  Info,
  Landmark,
} from "lucide-react";

import ReferralDoctors from "@/pages/ReferralDoctors";
import MyRewards from "@/pages/patient/MyRewards";

import Patients from "@/pages/Patients";
import DoctorInvoices from "@/pages/doctor/Invoices";
import Documents from "@/pages/Documents";
import { DoctorRoundTables } from "@/components/doctor/DoctorRoundTables";
import HospitalAffiliations from "@/components/doctor/HospitalAffiliations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  SECTION_CONTENT_CLASS,
  SECTION_TRIGGER_ALWAYS_GREEN_CLASS,
  SECTION_FRAME_CLASS,
  SECTION_ITEM_CLASS,
  SECTION_TRIGGER_CLASS,
} from "@/components/ui/section-accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { usePractice } from "@/hooks/usePractice";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/utils/storageUrls";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ── Constants ──────────────────────────────────────────────────────
import { COUNTRY_DIAL_CODES as _COUNTRY_DIAL_CODES } from "@/lib/countryDialCodes";
// Shape adapter so the existing JSX (which reads `code`/`country`/`flag`) keeps working.
const COUNTRY_CODES = _COUNTRY_DIAL_CODES.map((c) => ({
  code: c.dial,
  country: c.name,
  flag: c.flag,
}));

const DOCTOR_SPECIALTIES = [
  "General Practitioner",
  "Allergist/Immunologist",
  "Anesthesiologist",
  "Cardiologist",
  "Dermatologist",
  "Emergency Medicine Physician",
  "Endocrinologist",
  "Family Medicine Physician",
  "Gastroenterologist",
  "Geriatrician",
  "Hematologist",
  "Infectious Disease Specialist",
  "Internist",
  "Nephrologist",
  "Neurologist",
  "Obstetrician/Gynecologist",
  "Oncologist",
  "Ophthalmologist",
  "Orthopedic Surgeon",
  "Otolaryngologist (ENT)",
  "Pathologist",
  "Pediatrician",
  "Physiatrist",
  "Plastic Surgeon",
  "Podiatrist",
  "Psychiatrist",
  "Psychologist",
  "Pulmonologist",
  "Radiologist",
  "Rheumatologist",
  "Sports Medicine Physician",
  "Surgeon (General)",
  "Urologist",
  "Vascular Surgeon",
];

const CURRENCIES = [
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "BWP", symbol: "P", name: "Botswana Pula" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "SZL", symbol: "E", name: "Swazi Lilangeni" },
  { code: "LSL", symbol: "M", name: "Lesotho Loti" },
];

import { LANGUAGES } from "@/lib/languages";
import { PracticeAssistants } from "@/components/practice/PracticeAssistants";
import { INTAKE_EMAIL_DOMAIN } from "@/lib/mailboxDomain";

const COUNTRY_CODE_TO_LANGUAGE: Record<string, string> = {
  "+27": "en",
  "+1": "en",
  "+44": "en",
  "+267": "en",
  "+264": "en",
  "+268": "en",
  "+266": "st",
  "+258": "pt",
  "+263": "en",
  "+61": "en",
  "+91": "hi",
  "+49": "de",
  "+33": "fr",
  "+971": "ar",
};

const SIGNATURE_FONTS = [
  { value: "allura", label: "Allura", fontFamily: "'Allura', serif" },
  { value: "great-vibes", label: "Great Vibes", fontFamily: "'Great Vibes', serif" },
  { value: "herr-von-muellerhoff", label: "Herr Von Muellerhoff", fontFamily: "'Herr Von Muellerhoff', serif" },
  { value: "homemade-apple", label: "Homemade Apple", fontFamily: "'Homemade Apple', serif" },
  { value: "mr-dafoe", label: "Mr Dafoe", fontFamily: "'Mr Dafoe', serif" },
  { value: "petit-formal-script", label: "Petit Formal Script", fontFamily: "'Petit Formal Script', serif" },
  { value: "pinyon-script", label: "Pinyon Script", fontFamily: "'Pinyon Script', serif" },
  { value: "reenie-beanie", label: "Reenie Beanie", fontFamily: "'Reenie Beanie', serif" },
  { value: "rock-salt", label: "Rock Salt", fontFamily: "'Rock Salt', serif" },
  { value: "sacramento", label: "Sacramento", fontFamily: "'Sacramento', serif" },
];

const SIGNATURE_COLORS = [
  { value: "black", label: "Black", color: "#000000" },
  { value: "teal", label: "Teal", color: "#104861" },
  { value: "navy", label: "Navy", color: "#1a2744" },
  { value: "dark-red", label: "Dark Red", color: "#8B0000" },
  { value: "dark-green", label: "Dark Green", color: "#006400" },
];

// ── Interfaces ──────────────────────────────────────────────────────
interface Partner {
  id: string;
  full_name: string;
  registration_number: string;
  mobile_number: string;
}

interface ServicePrice {
  id: string;
  service_name: string;
  default_price: number;
  currency: string;
  is_first_consultation?: boolean;
  color?: string | null;
}

interface CPDCertificate {
  id: string;
  certificate_name: string;
  issuing_body: string | null;
  date_earned: string;
  cpd_points: number;
  certificate_url: string | null;
}

// ── Helper ──────────────────────────────────────────────────────
function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
}

function MailboxSection({ userId }: { userId?: string }) {
  const { t } = useTranslation();
  const [mailboxId, setMailboxId] = useState<string | null>(null);
  const [mailboxAlias, setMailboxAlias] = useState<string>("");
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [isSavingAlias, setIsSavingAlias] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    const fetchMailboxInfo = async () => {
      if (!userId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("mailbox_id, mailbox_alias")
        .eq("id", userId)
        .single();
      if (profile) {
        setMailboxId(profile.mailbox_id);
        setMailboxAlias(profile.mailbox_alias || "");
      }
    };
    fetchMailboxInfo();
  }, [userId]);

  const displayEmail = mailboxAlias
    ? `${mailboxAlias}@${INTAKE_EMAIL_DOMAIN}`
    : mailboxId
      ? `docs-${mailboxId.slice(0, 8)}@inbox.holarc.health`
      : null;
  const handleCopy = async () => {
    if (!displayEmail) return;
    await navigator.clipboard.writeText(displayEmail);
    setCopied(true);
    toast({ title: "Copied" });
    setTimeout(() => setCopied(false), 2000);
  };
  const handleSaveAlias = async () => {
    if (!userId) return;
    const cleanAlias = aliasInput
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "");
    if (cleanAlias.length < 3) {
      toast({ title: "Invalid alias", description: "At least 3 characters", variant: "destructive" });
      return;
    }
    if (cleanAlias.length > 30) {
      toast({ title: "Invalid alias", description: "30 characters max", variant: "destructive" });
      return;
    }
    setIsSavingAlias(true);
    const { error } = await supabase.from("profiles").update({ mailbox_alias: cleanAlias }).eq("id", userId);
    setIsSavingAlias(false);
    if (error) {
      toast({
        title: error.code === "23505" ? "Alias taken" : "Error",
        description: error.code === "23505" ? `"${cleanAlias}@${INTAKE_EMAIL_DOMAIN}" is already in use` : "Failed to save",
        variant: "destructive",
      });
    } else {
      setMailboxAlias(cleanAlias);
      setEditingAlias(false);
      toast({ title: "Alias saved", description: `${cleanAlias}@${INTAKE_EMAIL_DOMAIN}` });
    }
  };

  return (
    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Upload className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">Document Mailbox</p>
          <p className="text-xs text-muted-foreground mt-0.5">External parties can email documents to this address.</p>
          <div className="mt-2 flex items-start gap-1.5 rounded-md border border-primary/30 bg-primary/5 p-2">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm leading-snug text-foreground/80">
              This address is solely for emailing files (scans, referrals, lab results) directly to your <strong>My Documents</strong> tab — it is not for standard messaging and you will not receive replies in your normal inbox. Share it with anyone sending you medical records so they are routed straight to your Holarc Health profile.
            </p>
          </div>
          {displayEmail ? (

            <div className="mt-2">
              {editingAlias ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0 flex-1">
                    <Input
                      value={aliasInput}
                      onChange={(e) => setAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="your-name"
                      className="rounded-r-none max-w-[160px] h-8 text-sm"
                    />
                    <span className="px-2 py-1.5 border border-l-0 border-border rounded-r-lg bg-muted text-xs text-muted-foreground">
                      @{INTAKE_EMAIL_DOMAIN}
                    </span>
                  </div>
                  <Button size="sm" className="h-8" onClick={handleSaveAlias} disabled={isSavingAlias}>
                    {isSavingAlias ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("myPractice.save")}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingAlias(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-foreground border border-border truncate">
                    {displayEmail}
                  </code>
                  <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7 shrink-0" title="Copy address">
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    title={mailboxAlias ? "Change alias" : "Set custom alias"}
                    onClick={() => {
                      setEditingAlias(true);
                      setAliasInput(mailboxAlias || "");
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── About Me accordion (doctor pitch, max 600 words) ──
function AboutMeAccordion({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(value); }, [value]);
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const overLimit = wordCount > 600;
  const dirty = draft !== value;

  return (
    <AccordionItem value="about-me" className="border-0">
      <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold text-primary-dark">{t("myPractice.aboutMe")}</h3>
        </div>
      </AccordionTrigger>
      <AccordionContent className={SECTION_CONTENT_CLASS}>
        <p className="text-xs text-muted-foreground">
          {t("myPractice.aboutMeHelper")}
        </p>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={6}
          placeholder="Tell clients about your background, philosophy of care, and what makes your firm unique…"
        />
        <div className="flex items-center justify-between">
          <span className={cn("text-sm", overLimit ? "text-destructive" : "text-muted-foreground")}>
            {t("myPractice.wordCount", { count: wordCount })}
          </span>
          <Button
            size="sm"
            disabled={!dirty || overLimit || saving}
            onClick={async () => {
              setSaving(true);
              try { await onSave(draft); } finally { setSaving(false); }
            }}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
            {t("myPractice.save")}
          </Button>
        </div>

      </AccordionContent>
    </AccordionItem>
  );
}



// ── Main Component ──────────────────────────────────────────────────
export default function MyPractice() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, loading, fetchProfile, updateProfile, uploadLogo } = useProfile();
  const {
    practice,
    members,
    invitations,
    pendingInvites,
    isOwner: isPracticeOwner,
    createPractice,
    inviteMember,
    revokeInvitation,
    acceptInvitation,
    declineInvitation,
    removeMember,
    leavePractice,
    deletePractice,
  } = usePractice();
  const [searchParams] = useSearchParams();

  // ── Shared calendar form state ──
  const [newPracticeName, setNewPracticeName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [practiceColor, setPracticeColor] = useState<string>("#0EA5E9");
  const colorDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Form state (auto-save) ──
  const [savedStatus, setSavedStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialized = useRef(false);
  const isSettingFromProfile = useRef(false);
  const profileLoadedData = useRef<any>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    practice_number: "",
    doctor_number: "",
    practice_address: "",
    specialty: "",
    mobile_number: "",
    country_code: "+27",
    bank_account_name: "",
    bank_name: "",
    bank_account_type: "",
    bank_account_number: "",
    bank_swift_code: "",
  });

  // ── Signature form state (auto-save) ──
  const sigDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sigHasInitialized = useRef(false);
  const sigIsSettingFromProfile = useRef(false);
  const sigProfileLoadedData = useRef<any>(null);

  const [sigFormData, setSigFormData] = useState({
    signature_font: "allura",
    signature_color: "black",
    signature_font_size: 24,
    signature_bold: false,
    signature_italic: false,
  });

  // ── Avatar / Logo upload ──
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // ── Email editing ──
  const [editEmail, setEditEmail] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // ── Partners ──
  const [partners, setPartners] = useState<Partner[]>([]);
  const [newPartner, setNewPartner] = useState({
    full_name: "",
    registration_number: "",
    mobile_number: "",
    email: "",
  });
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [showAddPartnerForm, setShowAddPartnerForm] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [editingPartner, setEditingPartner] = useState({ full_name: "", registration_number: "", mobile_number: "" });
  const [isSavingPartner, setIsSavingPartner] = useState(false);

  // ── Existing-user partner search ──
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerSearchResults, setPartnerSearchResults] = useState<
    Array<{ id: string; full_name: string | null; doctor_number: string | null; mobile_number: string | null }>
  >([]);
  const [searchingPartners, setSearchingPartners] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  useEffect(() => {
    if (!showAddPartnerForm) return;
    const q = partnerSearch.trim();
    if (q.length < 2) {
      setPartnerSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearchingPartners(true);
    const handle = setTimeout(async () => {
      // RLS blocks reading other doctors' profile rows directly, so search
      // through the security-definer directory function instead.
      const { data, error } = await supabase.rpc("search_doctor_profiles", { _name: q });
      if (error) console.error("Partner search error:", error);
      if (!cancelled) {
        const results = ((data as any[]) || [])
          .filter((p) => p.id !== user?.id)
          .slice(0, 8);
        setPartnerSearchResults(results);
        setSearchingPartners(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [partnerSearch, showAddPartnerForm, user?.id]);

  const addExistingPartner = async (existing: { id: string; full_name: string | null; doctor_number: string | null; mobile_number: string | null }) => {
    if (!user) return;
    setIsAddingPartner(true);
    const { data, error } = await supabase
      .from("practice_partners")
      .insert({
        user_id: user.id,
        full_name: existing.full_name || "Partner",
        registration_number: existing.doctor_number || "—",
        mobile_number: existing.mobile_number || null,
      } as any)
      .select()
      .single();
    setIsAddingPartner(false);
    if (error) {
      toast({ title: "Error", description: "Failed to add partner", variant: "destructive" });
    } else {
      setPartners([...partners, data]);
      setPartnerSearch("");
      setPartnerSearchResults([]);
      setShowAddPartnerForm(false);
      toast({ title: "Partner added" });
    }
  };


  const partnerShareLink = `${typeof window !== "undefined" ? window.location.origin : "https://holarchealth.com"}/?invite=${user?.id || ""}`;
  const copyShareLink = async () => {
    await navigator.clipboard.writeText(partnerShareLink);
    setCopiedShareLink(true);
    toast({ title: "Link copied" });
    setTimeout(() => setCopiedShareLink(false), 2000);
  };


  // ── Service Prices ──
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [newService, setNewService] = useState({
    service_name: "",
    default_price: "",
    currency: "ZAR",
    color: "#3b82f6",
  });
  const [isAddingService, setIsAddingService] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("ZAR");
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState({ service_name: "", default_price: "", color: "" });
  const [isSavingService, setIsSavingService] = useState(false);

  // ── Voice narration local state ──
  const [localVoice, setLocalVoice] = useState(profile?.narration_voice || "shimmer");

  // ── CPD Certificates ──
  const [certs, setCerts] = useState<CPDCertificate[]>([]);
  const [certsLoading, setCertsLoading] = useState(true);
  const [showCertForm, setShowCertForm] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [certSaving, setCertSaving] = useState(false);
  const [certUploading, setCertUploading] = useState(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const certFileInputRef = useRef<HTMLInputElement>(null);
  const [certForm, setCertForm] = useState({ certificate_name: "", issuing_body: "", date_earned: "", cpd_points: "" });
  const [certErrors, setCertErrors] = useState<Record<string, string>>({});

  // ── Profile data sync ──
  useEffect(() => {
    if (profile) {
      let countryCode = "+27";
      let mobileNumber = (profile as any).mobile_number || "";
      const matchedCode = COUNTRY_CODES.find((c) => mobileNumber.startsWith(c.code));
      if (matchedCode) {
        countryCode = matchedCode.code;
        mobileNumber = mobileNumber.replace(matchedCode.code, "").trim();
      }
      const fullName = profile.full_name || "";
      const spaceIdx = fullName.indexOf(" ");
      const firstName = spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName;
      const lastName = spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : "";
      const newFormData = {
        first_name: firstName,
        last_name: lastName,
        practice_number: profile.practice_number || "",
        doctor_number: profile.doctor_number || "",
        practice_address: profile.practice_address || "",
        specialty: (profile as any).specialty || "",
        mobile_number: mobileNumber,
        country_code: countryCode,
        bank_account_name: (profile as any).bank_account_name || "",
        bank_name: (profile as any).bank_name || "",
        bank_account_type: (profile as any).bank_account_type || "",
        bank_account_number: (profile as any).bank_account_number || "",
        bank_swift_code: (profile as any).bank_swift_code || "",
      };
      isSettingFromProfile.current = true;
      profileLoadedData.current = newFormData;
      setFormData(newFormData);
      requestAnimationFrame(() => {
        hasInitialized.current = true;
        isSettingFromProfile.current = false;
      });

      // Sync signature state
      const newSigData = {
        signature_font: (profile as any).signature_font || "allura",
        signature_color: (profile as any).signature_color || "black",
        signature_font_size: (profile as any).signature_font_size ?? 24,
        signature_bold: (profile as any).signature_bold ?? false,
        signature_italic: (profile as any).signature_italic ?? false,
      };
      sigIsSettingFromProfile.current = true;
      sigProfileLoadedData.current = newSigData;
      setSigFormData(newSigData);
      requestAnimationFrame(() => {
        sigHasInitialized.current = true;
        sigIsSettingFromProfile.current = false;
      });

      // Backfill the rendered signature image for profiles saved before we
      // started storing one — emails need it to show the real font.
      if (!(profile as any).signature_url && !(profile as any).signature_render_url) {
        void syncSignatureRender(newSigData);
      }

      // Sync voice state
      setLocalVoice((profile as any).narration_voice || "shimmer");

      // Sync practice color
      setPracticeColor((profile as any).practice_color || "#0EA5E9");
    }
  }, [profile]);

  const handlePracticeColorChange = (hex: string) => {
    setPracticeColor(hex);
    if (colorDebounce.current) clearTimeout(colorDebounce.current);
    colorDebounce.current = setTimeout(async () => {
      await updateProfile({ practice_color: hex } as any);
    }, 350);
  };

  const combinedFullName = `${formData.first_name} ${formData.last_name}`.trim();
  const getSignatureFontFamily = (v: string) =>
    SIGNATURE_FONTS.find((f) => f.value === v)?.fontFamily || SIGNATURE_FONTS[0].fontFamily;
  const getSignatureColor = (v: string) => SIGNATURE_COLORS.find((c) => c.value === v)?.color || "#000000";

  // ── Auto-save debounce ──
  useEffect(() => {
    if (!hasInitialized.current || !user || isSettingFromProfile.current) return;
    if (profileLoadedData.current && JSON.stringify(formData) === JSON.stringify(profileLoadedData.current)) {
      profileLoadedData.current = null;
      return;
    }
    profileLoadedData.current = null;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setSavedStatus("saving");
      const fullMobileNumber = formData.mobile_number
        ? `${formData.country_code}${formData.mobile_number.replace(/^0+/, "")}`
        : "";
      const { error } = await updateProfile({
        full_name: combinedFullName,
        practice_number: formData.practice_number,
        doctor_number: formData.doctor_number,
        practice_address: formData.practice_address,
        specialty: formData.specialty,
        mobile_number: fullMobileNumber,
        bank_account_name: formData.bank_account_name,
        bank_name: formData.bank_name,
        bank_account_type: formData.bank_account_type,
        bank_account_number: formData.bank_account_number,
        bank_swift_code: formData.bank_swift_code,
      } as any);
      if (error) {
        setSavedStatus("idle");
        toast({
          title: "Couldn't save your firm details",
          description: (error as any)?.message || "Please check your connection and try again.",
          variant: "destructive",
        });

      } else {
        setSavedStatus("saved");
        setTimeout(() => setSavedStatus("idle"), 2000);
      }
    }, 1500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [formData]);

  /** Renders the typed signature to a PNG and stores it on the profile so that
   *  outbound emails can embed the doctor's real signature font. */
  const syncSignatureRender = async (override?: typeof sigFormData) => {
    if (!user) return;
    const sig = override || sigFormData;
    try {
      const base64 = await renderSignaturePngBase64({
        full_name: profile?.full_name,
        signature_font: sig.signature_font,
        signature_color: sig.signature_color,
        signature_font_size: sig.signature_font_size,
        signature_bold: sig.signature_bold,
        signature_italic: sig.signature_italic,
      });
      if (!base64) return;
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const path = `${user.id}/signature.png`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, new Blob([bytes], { type: "image/png" }), {
          upsert: true,
          contentType: "image/png",
        });
      if (upErr) {
        console.error("Signature render upload failed", upErr.message);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile({
        signature_render_url: `${data.publicUrl}?t=${Date.now()}`,
      } as any);
    } catch (e) {
      console.error("Signature render failed", e);
    }
  };

  // ── Auto-save signature debounce ──
  useEffect(() => {
    if (!sigHasInitialized.current || !user || sigIsSettingFromProfile.current) return;
    if (sigProfileLoadedData.current && JSON.stringify(sigFormData) === JSON.stringify(sigProfileLoadedData.current)) {
      sigProfileLoadedData.current = null;
      return;
    }
    sigProfileLoadedData.current = null;
    if (sigDebounceTimer.current) clearTimeout(sigDebounceTimer.current);
    sigDebounceTimer.current = setTimeout(async () => {
      setSavedStatus("saving");
      const { error } = await updateProfile({
        signature_font: sigFormData.signature_font,
        signature_color: sigFormData.signature_color,
        signature_font_size: sigFormData.signature_font_size,
        signature_bold: sigFormData.signature_bold,
        signature_italic: sigFormData.signature_italic,
      } as any);
      if (error) {
        setSavedStatus("idle");
        toast({ title: "Error", description: "Failed to save", variant: "destructive" });
      } else {
        setSavedStatus("saved");
        setTimeout(() => setSavedStatus("idle"), 2000);
        // Render the typed signature to a PNG so outbound emails show the exact
        // handwriting font (email clients strip web fonts).
        void syncSignatureRender();
      }

    }, 1500);
    return () => {
      if (sigDebounceTimer.current) clearTimeout(sigDebounceTimer.current);
    };
  }, [sigFormData]);

  // ── Auto-guess language from country code ──
  const handleCountryCodeChange = async (code: string) => {
    setFormData({ ...formData, country_code: code });
    const guessedLang = COUNTRY_CODE_TO_LANGUAGE[code];
    if (guessedLang && !(profile as any)?.preferred_language) {
      await updateProfile({ preferred_language: guessedLang } as any);
    }
  };

  // ── Fetch doctor data ──
  useEffect(() => {
    if (user) {
      fetchPartners();
      fetchServicePrices();
      fetchCerts();
    }
  }, [user]);

  const totalCpdPoints = certs.reduce((sum, c) => sum + (c.cpd_points || 0), 0);
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  const getCurrencySymbol = (code: string) => CURRENCIES.find((c) => c.code === code)?.symbol || code;

  // ── Partner functions ──
  const fetchPartners = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("practice_partners")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (!error && data) setPartners(data);
  };
  const addPartner = async () => {
    if (!user || !newPartner.full_name.trim() || !newPartner.registration_number.trim() || !newPartner.email.trim()) {
      toast({
        title: "Missing fields",
        description: "Partner name, registration number, and email are required",
        variant: "destructive",
      });
      return;
    }
    setIsAddingPartner(true);
    const { data, error } = await supabase
      .from("practice_partners")
      .insert({
        user_id: user.id,
        full_name: newPartner.full_name,
        registration_number: newPartner.registration_number,
        mobile_number: newPartner.mobile_number || null,
        email: newPartner.email.trim(),
      } as any)
      .select()
      .single();
    if (error) toast({ title: "Error", description: "Failed to add partner", variant: "destructive" });
    else {
      setPartners([...partners, data]);
      try {
        await supabase.functions.invoke("send-user-invitation", {
          body: {
            recipientEmail: newPartner.email.trim(),
            senderName: profile?.full_name || "A colleague",
            message: "You have been added as a firm partner.",
            isPracticePartner: true,
            partnerName: newPartner.full_name,
          },
        });
        toast({ title: "Partner added & invited" });
      } catch {
        toast({ title: "Partner added" });
      }
      setNewPartner({ full_name: "", registration_number: "", mobile_number: "", email: "" });
      setShowAddPartnerForm(false);
    }
    setIsAddingPartner(false);
  };
  const removePartner = async (id: string) => {
    const { error } = await supabase.from("practice_partners").delete().eq("id", id);
    if (!error) {
      setPartners(partners.filter((p) => p.id !== id));
      toast({ title: "Partner removed" });
    }
  };
  const startEditingPartner = (partner: Partner) => {
    setEditingPartnerId(partner.id);
    setEditingPartner({
      full_name: partner.full_name,
      registration_number: partner.registration_number,
      mobile_number: partner.mobile_number || "",
    });
  };
  const cancelEditingPartner = () => {
    setEditingPartnerId(null);
  };
  const saveEditingPartner = async () => {
    if (!editingPartnerId || !editingPartner.full_name.trim() || !editingPartner.registration_number.trim()) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    setIsSavingPartner(true);
    const { error } = await supabase
      .from("practice_partners")
      .update({
        full_name: editingPartner.full_name,
        registration_number: editingPartner.registration_number,
        mobile_number: editingPartner.mobile_number || null,
      })
      .eq("id", editingPartnerId);
    if (error) toast({ title: "Error", variant: "destructive" });
    else {
      setPartners(partners.map((p) => (p.id === editingPartnerId ? { ...p, ...editingPartner } : p)));
      setEditingPartnerId(null);
      toast({ title: "Partner updated" });
    }
    setIsSavingPartner(false);
  };

  // ── Service price functions ──
  const fetchServicePrices = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("service_prices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (!error && data) {
      setServicePrices(data);
      if (data.length > 0) {
        setSelectedCurrency(data[0].currency);
        setNewService((prev) => ({ ...prev, currency: data[0].currency }));
      }
    }
  };
  const addServicePrice = async () => {
    if (!user || !newService.service_name.trim() || !newService.default_price) {
      toast({ title: "Missing fields", description: "Service name and price are required", variant: "destructive" });
      return;
    }
    setIsAddingService(true);
    const { data, error } = await supabase
      .from("service_prices")
      .insert({
        user_id: user.id,
        service_name: newService.service_name,
        default_price: parseFloat(newService.default_price),
        currency: selectedCurrency,
        is_first_consultation: false,
        color: newService.color || null,
      } as any)
      .select()
      .single();
    if (error) toast({ title: "Error", description: "Failed to add service", variant: "destructive" });
    else {
      setServicePrices([...servicePrices, data]);
      setNewService({ service_name: "", default_price: "", currency: selectedCurrency, color: "#3b82f6" });
      toast({ title: "Service added" });
    }
    setIsAddingService(false);
  };
  const removeServicePrice = async (id: string) => {
    const { error } = await supabase.from("service_prices").delete().eq("id", id);
    if (!error) {
      setServicePrices(servicePrices.filter((s) => s.id !== id));
      toast({ title: "Service removed" });
    }
  };
  const startEditingService = (service: ServicePrice) => {
    setEditingServiceId(service.id);
    setEditingService({
      service_name: service.service_name,
      default_price: String(service.default_price),
      color: service.color || "#3b82f6",
    });
  };
  const cancelEditingService = () => {
    setEditingServiceId(null);
    setEditingService({ service_name: "", default_price: "", color: "" });
  };
  const saveEditingService = async () => {
    if (!editingServiceId || !editingService.service_name.trim() || !editingService.default_price) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    setIsSavingService(true);
    const { error } = await supabase
      .from("service_prices")
      .update({
        service_name: editingService.service_name,
        default_price: parseFloat(editingService.default_price),
        color: editingService.color || null,
      } as any)
      .eq("id", editingServiceId);
    if (error) toast({ title: "Error", variant: "destructive" });
    else {
      setServicePrices(
        servicePrices.map((s) =>
          s.id === editingServiceId
            ? {
                ...s,
                service_name: editingService.service_name,
                default_price: parseFloat(editingService.default_price),
                color: editingService.color || null,
              }
            : s,
        ),
      );
      setEditingServiceId(null);
      toast({ title: "Service updated" });
    }
    setIsSavingService(false);
  };
  const updateAllServicesCurrency = async (newCurrency: string) => {
    if (!user || servicePrices.length === 0) {
      setSelectedCurrency(newCurrency);
      setNewService((prev) => ({ ...prev, currency: newCurrency }));
      return;
    }
    const { error } = await supabase.from("service_prices").update({ currency: newCurrency }).eq("user_id", user.id);
    if (!error) {
      setServicePrices(servicePrices.map((s) => ({ ...s, currency: newCurrency })));
      setSelectedCurrency(newCurrency);
      setNewService((prev) => ({ ...prev, currency: newCurrency }));
      toast({ title: "Currency updated" });
    }
  };

  // ── CPD Certificate functions ──
  const fetchCerts = async () => {
    setCertsLoading(true);
    const { data, error } = await supabase
      .from("cpd_certificates")
      .select("*")
      .eq("user_id", user!.id)
      .order("date_earned", { ascending: false });
    if (!error && data) setCerts(data as any);
    setCertsLoading(false);
  };
  const uploadCertificateFile = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("cpd-certificates").upload(filePath, file);
    if (error) {
      toast({ title: "Upload Error", description: error.message, variant: "destructive" });
      return null;
    }
    // Bucket is private — store the path; signed URLs are generated on demand.
    return filePath;
  };

  const openCertificate = async (pathOrUrl: string) => {
    const url = await getSignedUrl("cpd-certificates", pathOrUrl);
    if (!url) {
      toast({ title: "Unable to open file", variant: "destructive" });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const handleCertSave = async () => {
    if (!user) return;
    const errors: Record<string, string> = {};
    if (!certForm.certificate_name.trim()) errors.certificate_name = "Credential name is required";
    if (!certForm.issuing_body.trim()) errors.issuing_body = "Issuing body is required";
    if (!certForm.date_earned) errors.date_earned = "Date earned is required";
    if (!certForm.cpd_points.trim()) errors.cpd_points = "CPD points is required";
    if (!certificateFile && !editingCertId) errors.certificate_file = "Please attach a certificate";
    setCertErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({ title: "Missing required fields", description: "Please fill in all required fields, marked with *", variant: "destructive" });
      return;
    }
    setCertSaving(true);
    let certificateUrl: string | null = null;
    if (certificateFile) {
      setCertUploading(true);
      certificateUrl = await uploadCertificateFile(certificateFile);
      setCertUploading(false);
    }
    const record: any = {
      certificate_name: certForm.certificate_name,
      issuing_body: certForm.issuing_body || null,
      date_earned: certForm.date_earned,
      cpd_points: parseInt(certForm.cpd_points) || 0,
    };
    if (certificateUrl) record.certificate_url = certificateUrl;
    if (editingCertId) {
      const { error } = await supabase.from("cpd_certificates").update(record).eq("id", editingCertId);
      if (error) toast({ title: "Error", variant: "destructive" });
      else toast({ title: "Updated" });
    } else {
      const { error } = await supabase.from("cpd_certificates").insert({ ...record, user_id: user.id });
      if (error) toast({ title: "Error", variant: "destructive" });
      else toast({ title: "Added" });
    }
    setCertSaving(false);
    setShowCertForm(false);
    setEditingCertId(null);
    setCertForm({ certificate_name: "", issuing_body: "", date_earned: "", cpd_points: "" });
    setCertificateFile(null);
    setCertErrors({});
    fetchCerts();
  };
  const handleCertEdit = (cert: CPDCertificate) => {
    setEditingCertId(cert.id);
    setCertForm({
      certificate_name: cert.certificate_name,
      issuing_body: cert.issuing_body || "",
      date_earned: cert.date_earned,
      cpd_points: String(cert.cpd_points),
    });
    setCertificateFile(null);
    setCertErrors({});
    setShowCertForm(true);
  };
  const handleCertDelete = async (id: string) => {
    const { error } = await supabase.from("cpd_certificates").delete().eq("id", id);
    if (!error) {
      setCerts(certs.filter((c) => c.id !== id));
      toast({ title: "Removed" });
    }
  };

  // ── Upload handlers ──
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", variant: "destructive" });
      return;
    }
    setIsUploadingAvatar(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", variant: "destructive" });
      setIsUploadingAvatar(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
      .eq("id", user.id);
    setIsUploadingAvatar(false);
    if (updateError) toast({ title: "Error", variant: "destructive" });
    else {
      toast({ title: "Profile picture updated" });
      isSettingFromProfile.current = true;
      await fetchProfile();
      setTimeout(() => {
        isSettingFromProfile.current = false;
      }, 200);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", variant: "destructive" });
      return;
    }
    setIsUploadingLogo(true);
    const { error } = await uploadLogo(file);
    setIsUploadingLogo(false);
    if (error) toast({ title: "Upload failed", variant: "destructive" });
    else {
      toast({ title: "Logo uploaded" });
      isSettingFromProfile.current = true;
      await fetchProfile();
      setTimeout(() => {
        isSettingFromProfile.current = false;
      }, 200);
    }
  };

  const handleSaveEmail = async () => {
    if (!user || !editEmail.trim()) return;
    setIsSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: editEmail.trim() });
    setIsSavingEmail(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Email updated", description: "A confirmation email has been sent" });
      setIsEditingEmail(false);
    }
  };

  const activeTab = searchParams.get("tab");

  if (activeTab === "roundtables") {
    return (
      <div className="space-y-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Round Tables</h1>
          <p className="text-muted-foreground text-xs">View round table discussions you've contributed to</p>
        </div>
        <DoctorRoundTables />
      </div>
    );
  }

  // ── RENDER ──
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Business</h1>
          <p className="text-muted-foreground text-xs">Manage your personal and firm information</p>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-1.5">
          {savedStatus === "saving" && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {savedStatus === "saved" && (
            <>
              <Save className="h-3.5 w-3.5 text-success" />
              <span className="text-success">Saved</span>
            </>
          )}
        </div>
      </div>

      {/* Profile picture card */}
      <div className="rounded-xl border border-primary bg-card p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <label
            htmlFor="avatar-upload-practice"
            className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
          >
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-primary">
                <AvatarImage
                  key={(profile as any)?.avatar_url}
                  src={(profile as any)?.avatar_url}
                  alt={combinedFullName || t("myPractice.tabProfile")}
                />
                <AvatarFallback className="text-base bg-primary/10 text-primary">
                  {combinedFullName ? getInitials(combinedFullName) : "U"}
                </AvatarFallback>
              </Avatar>
              {/* Always-visible camera badge so users notice the upload affordance */}
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                <Camera className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
            <span className="text-xs font-medium text-primary-dark mt-0.5 whitespace-nowrap">
              {(profile as any)?.avatar_url ? "Change photo" : "Add photo"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              id="avatar-upload-practice"
              disabled={isUploadingAvatar}
            />
          </label>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{combinedFullName || "Your Name"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            {isUploadingAvatar && <p className="text-xs text-muted-foreground">Uploading...</p>}
          </div>
          {totalCpdPoints > 0 && (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 shrink-0">
              <Award className="h-3.5 w-3.5 text-amber-600" />
              {totalCpdPoints} CPD pts
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="practice" className="w-full">
        <TabsList className="flex w-full flex-nowrap overflow-x-auto bg-primary justify-start">
          <TabsTrigger
            value="practice"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5"
          >
            {t("myPractice.tabPractice")}
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5"
          >
            {t("documents.tabTemplates")}
          </TabsTrigger>
          <TabsTrigger
            value="referrals"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5"
          >
            {t("myPractice.tabReferrals")}
          </TabsTrigger>
          <TabsTrigger
            value="certificates"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5"
          >
            {t("myPractice.tabCredentials")}
          </TabsTrigger>
          <TabsTrigger
            value="rewards"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5"
          >
            {t("myPractice.tabRewards")}
          </TabsTrigger>
        </TabsList>

        {/* === PRACTICE TAB (Personal + Practice merged) === */}
        <TabsContent value="practice" className="mt-4 space-y-4 my-practice-tab-body">
          <div className="rounded-xl border border-neutral-400 bg-white shadow-sm overflow-hidden">
            <Accordion type="multiple" className="divide-y divide-white">
              <AboutMeAccordion
                value={(profile as any)?.about_me || ""}
                onSave={async (v) => { await updateProfile({ about_me: v } as any); }}
              />
              {/* Personal Information */}
              <AccordionItem value="personal" className="border-0">
              <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold text-primary-dark">Personal Information</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className={SECTION_CONTENT_CLASS}>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Specialty</Label>
                <Select value={formData.specialty} onValueChange={(v) => setFormData({ ...formData, specialty: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCTOR_SPECIALTIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={user?.email || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label>Mobile Number</Label>
                <div className="flex gap-2">
                  <Select value={formData.country_code} onValueChange={handleCountryCodeChange}>
                    <SelectTrigger className="w-[110px] [&>span]:line-clamp-none">
                      <SelectValue>
                        <span className="whitespace-nowrap flex items-center gap-1.5">
                          {COUNTRY_CODES.find((c) => c.code === formData.country_code)?.flag} {formData.country_code}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="flex items-center gap-1.5">
                            {c.flag} {c.code}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    value={formatPhoneNumber(formData.mobile_number)}
                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/[^0-9]/g, "") })}
                    placeholder="82 123 4567"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Primary Language</Label>
                <Select
                  value={(profile as any)?.preferred_language || "en"}
                  onValueChange={async (v) => {
                    await updateProfile({ preferred_language: v } as any);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <MailboxSection userId={user?.id} />
              </AccordionContent>
            </AccordionItem>

          {/* Practice Details Accordion */}
            <AccordionItem value="practice-details" className="border-0">
              <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold text-primary-dark">Firm Information</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className={SECTION_CONTENT_CLASS}>
            <p className="text-sm text-muted-foreground">
              This information appears on your document templates and letterheads.
            </p>
            <Accordion type="multiple" className="rounded-xl border border-primary bg-white overflow-hidden divide-y divide-primary">
              {/* Practice Details */}
              <AccordionItem value="practice-basic-details" className="border-0 rounded-none bg-white">
                <AccordionTrigger className={SECTION_TRIGGER_CLASS}>
                  <h4 className="text-xs font-semibold">Firm Details</h4>
                </AccordionTrigger>
                <AccordionContent className={SECTION_CONTENT_CLASS}>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5 w-40">
                      <Label>FSP Number</Label>
                      <Input
                        value={formData.practice_number}
                        onChange={(e) => setFormData({ ...formData, practice_number: e.target.value })}
                        placeholder="e.g., PR123456"
                      />
                    </div>
                    <div className="space-y-1.5 w-40">
                      <Label>Registration Number</Label>
                      <Input
                        value={formData.doctor_number}
                        onChange={(e) => setFormData({ ...formData, doctor_number: e.target.value })}
                        placeholder="e.g., MP123456"
                      />
                    </div>
                    <div className="space-y-1.5 w-64">
                      <Label>Address of Wealth Manager's Office</Label>
                      <Input
                        value={formData.practice_address}
                        onChange={(e) => setFormData({ ...formData, practice_address: e.target.value })}
                        placeholder="e.g., 123 Office, Suite 4, Cape Town"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Firm Logo</Label>
                      <div className="flex items-center gap-3">
                        {profile?.logo_url && (
                          <img
                            src={profile.logo_url}
                            alt="Firm logo"
                            className="h-9 w-auto object-contain rounded border border-border p-1"
                          />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload-practice"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("logo-upload-practice")?.click()}
                          disabled={isUploadingLogo}
                          className="gap-1.5"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {isUploadingLogo ? "Uploading..." : profile?.logo_url ? "Change" : "Upload"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Partners */}
              <AccordionItem value="partners" className={SECTION_ITEM_CLASS}>
                <AccordionTrigger className={SECTION_TRIGGER_CLASS}>
                  <h4 className="text-xs font-semibold">Partners</h4>
                </AccordionTrigger>
                <AccordionContent className={SECTION_CONTENT_CLASS}>
            {/* Calendar color (used on shared practice calendar) */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-primary" />
                Calendar Color
              </Label>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-8 w-8 rounded-md border border-border shrink-0"
                  style={{ backgroundColor: practiceColor }}
                  aria-label="Color swatch"
                />
                <Input
                  value={practiceColor}
                  onChange={(e) => handlePracticeColorChange(e.target.value)}
                  className="max-w-[140px] font-mono text-sm"
                  placeholder="#0EA5E9"
                />
                <input
                  type="color"
                  value={practiceColor}
                  onChange={(e) => handlePracticeColorChange(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-background"
                  aria-label="Pick color"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Used on the shared Practice Calendar so colleagues can see whose appointment a slot belongs to.
              </p>
            </div>

            <Separator className="my-4" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Add partners of the same practice. Their information will be available on documents.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddPartnerForm(true)}
                  className="gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Partner
                </Button>

              </div>
              {partners.length > 0 && (
                <div className="space-y-2">
                  {partners.map((partner) => (
                    <div
                      key={partner.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-border"
                    >
                      {editingPartnerId === partner.id ? (
                        <div className="flex-1 grid gap-2 sm:grid-cols-3 mr-3">
                          <Input
                            value={editingPartner.full_name}
                            onChange={(e) => setEditingPartner({ ...editingPartner, full_name: e.target.value })}
                            placeholder="Full name"
                          />
                          <Input
                            value={editingPartner.registration_number}
                            onChange={(e) =>
                              setEditingPartner({ ...editingPartner, registration_number: e.target.value })
                            }
                            placeholder="Registration number"
                          />
                          <Input
                            value={editingPartner.mobile_number}
                            onChange={(e) => setEditingPartner({ ...editingPartner, mobile_number: e.target.value })}
                            placeholder="Mobile (optional)"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-sm text-foreground">{partner.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Reg: {partner.registration_number}
                            {partner.mobile_number && ` · ${partner.mobile_number}`}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-0.5">
                        {editingPartnerId === partner.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={saveEditingPartner}
                              disabled={isSavingPartner}
                              className="h-7 w-7 text-success"
                            >
                              {isSavingPartner ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={cancelEditingPartner} className="h-7 w-7">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditingPartner(partner)}
                              className="h-7 w-7"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Invite"
                              onClick={async () => {
                                const partnerEmail = (partner as any).email;
                                if (!partnerEmail) {
                                  toast({ title: "No email", variant: "destructive" });
                                  return;
                                }
                                try {
                                  await supabase.functions.invoke("send-user-invitation", {
                                    body: {
                                      recipientEmail: partnerEmail,
                                      senderName: profile?.full_name || "A colleague",
                                      message: "You have been invited to join Holarc Wealth as a firm partner.",
                                      isPracticePartner: true,
                                      partnerName: partner.full_name,
                                    },
                                  });
                                  toast({ title: "Invitation sent" });
                                } catch {
                                  toast({ title: "Error", variant: "destructive" });
                                }
                              }}
                              className="h-7 w-7 text-primary"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removePartner(partner.id)}
                              className="h-7 w-7 text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Dialog
                open={showAddPartnerForm}
                onOpenChange={(o) => {
                  if (!o) {
                    setShowAddPartnerForm(false);
                    setNewPartner({ full_name: "", registration_number: "", mobile_number: "", email: "" });
                    setPartnerSearch("");
                    setPartnerSearchResults([]);
                  }
                }}
              >
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      Add Practice Partner
                    </DialogTitle>
                    <DialogDescription>
                      Search for an existing Holarc practitioner, invite a new one by email, or share your practice link.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">

                  <Tabs defaultValue="existing">
                    <TabsList className="grid w-full grid-cols-3 bg-neutral-600">
                      <TabsTrigger value="existing" className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-1.5 py-1 sm:text-xs sm:px-3 sm:py-1.5">Select existing</TabsTrigger>
                      <TabsTrigger value="invite" className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-1.5 py-1 sm:text-xs sm:px-3 sm:py-1.5">Invite by email</TabsTrigger>
                      <TabsTrigger value="share" className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-1.5 py-1 sm:text-xs sm:px-3 sm:py-1.5">Share app link</TabsTrigger>
                    </TabsList>

                    {/* ── Existing user ── */}
                    <TabsContent value="existing" className="space-y-2 pt-3">
                      <Label className="text-xs">Search Holarc Wealth users by name or registration #</Label>
                      <Input
                        value={partnerSearch}
                        onChange={(e) => setPartnerSearch(e.target.value)}
                        placeholder="Start typing a name…"
                      />
                      <div className="max-h-56 overflow-y-auto space-y-1">
                        {searchingPartners && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 px-2 py-2">
                            <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                          </p>
                        )}
                        {!searchingPartners && partnerSearch.length >= 2 && partnerSearchResults.length === 0 && (
                          <p className="text-xs text-muted-foreground px-2 py-2">No matching users found.</p>
                        )}
                        {partnerSearchResults.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => addExistingPartner(r)}
                            disabled={isAddingPartner}
                            className="w-full text-left p-2 rounded-md border border-border hover:bg-accent/40 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{r.full_name || "Unnamed"}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {r.doctor_number ? `Reg: ${r.doctor_number}` : "No registration #"}
                              </p>
                            </div>
                            <Plus className="h-4 w-4 text-primary shrink-0" />
                          </button>
                        ))}
                      </div>
                    </TabsContent>

                    {/* ── Invite by email ── */}
                    <TabsContent value="invite" className="space-y-3 pt-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Full Name *</Label>
                          <Input
                            value={newPartner.full_name}
                            onChange={(e) => setNewPartner({ ...newPartner, full_name: e.target.value })}
                            placeholder="Dr. Jane Doe"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Registration Number *</Label>
                          <Input
                            value={newPartner.registration_number}
                            onChange={(e) => setNewPartner({ ...newPartner, registration_number: e.target.value })}
                            placeholder="e.g., MP654321"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Mobile (Optional)</Label>
                          <Input
                            value={newPartner.mobile_number}
                            onChange={(e) => setNewPartner({ ...newPartner, mobile_number: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            value={newPartner.email}
                            onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                            placeholder="partner@example.com"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={addPartner} disabled={isAddingPartner} className="gap-1.5">
                          <Save className="h-3.5 w-3.5" />
                          {isAddingPartner ? "Saving..." : "Send Invite"}
                        </Button>
                      </div>
                    </TabsContent>

                    {/* ── Share link ── */}
                    <TabsContent value="share" className="space-y-3 pt-3">
                      <p className="text-xs text-muted-foreground">
                        Share this link with a colleague — they can sign up and be linked to your practice.
                      </p>
                      <div className="flex items-center gap-2">
                        <Input value={partnerShareLink} readOnly className="font-mono text-xs" />
                        <Button size="sm" variant="outline" onClick={copyShareLink} className="gap-1.5 shrink-0">
                          {copiedShareLink ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedShareLink ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="gap-1.5"
                        >
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Join me on Holarc Health: ${partnerShareLink}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="gap-1.5"
                        >
                          <a
                            href={`mailto:?subject=${encodeURIComponent("Join my practice on Holarc Health")}&body=${encodeURIComponent(`Hi,\n\nJoin me on Holarc Health: ${partnerShareLink}`)}`}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Email
                          </a>
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowAddPartnerForm(false);
                        setNewPartner({ full_name: "", registration_number: "", mobile_number: "", email: "" });
                        setPartnerSearch("");
                        setPartnerSearchResults([]);
                      }}
                    >
                      Close
                    </Button>
                  </div>
                  </div>
                </DialogContent>
              </Dialog>

            </div>
                </AccordionContent>
              </AccordionItem>

              {/* Practice Management Assistants */}
              <AccordionItem value="practice-assistants" className={SECTION_ITEM_CLASS}>
                <AccordionTrigger className={SECTION_TRIGGER_CLASS}>
                  <h4 className="text-xs font-semibold">Firm Management Assistants</h4>
                </AccordionTrigger>
                <AccordionContent className={SECTION_CONTENT_CLASS}>
                  <PracticeAssistants />
                </AccordionContent>
              </AccordionItem>

              {/* Hospital Affiliations */}
              <AccordionItem value="hospital-affiliations" className={SECTION_ITEM_CLASS}>
                <AccordionTrigger className={SECTION_TRIGGER_CLASS}>
                  <h4 className="text-xs font-semibold">Hospital Affiliations</h4>
                </AccordionTrigger>
                <AccordionContent className={SECTION_CONTENT_CLASS}>
                  <HospitalAffiliations />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
              </AccordionContent>
            </AccordionItem>

           {/* Banking Details Accordion */}
            <AccordionItem value="banking-details" className="border-0">
              <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold text-primary-dark">Banking Details</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className={SECTION_CONTENT_CLASS}>
                <div className="space-y-3">
                  {/* Horizontal label/field rows, two per line to save space. */}
                  <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {[
                      { id: "bank_account_name", label: "Account Name", placeholder: "e.g. Dr J Smith Inc" },
                      { id: "bank_name", label: "Bank Name", placeholder: "e.g. Standard Bank" },
                      { id: "bank_account_type", label: "Account Type", placeholder: "e.g. Cheque / Current" },
                      { id: "bank_account_number", label: "Account Number", placeholder: "e.g. 123456789" },
                      { id: "bank_swift_code", label: "SWIFT Code", placeholder: "e.g. SBZAZAJJ" },
                    ].map((f) => (
                      <div key={f.id} className="flex items-center gap-3">
                        <Label htmlFor={f.id} className="w-32 shrink-0 text-xs font-bold text-foreground">
                          {f.label}
                        </Label>
                        <Input
                          id={f.id}
                          className="h-8 flex-1 text-xs"
                          value={(formData as any)[f.id]}
                          onChange={(e) => setFormData({ ...formData, [f.id]: e.target.value })}
                          placeholder={f.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used on invoices so patients know where to pay.
                  </p>
                </div>

              </AccordionContent>
            </AccordionItem>

           {/* Service Offerings & Pricing Accordion */}
            <AccordionItem value="service-pricing" className="border-0">
              <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold text-primary-dark">Service Offerings & Pricing</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className={SECTION_CONTENT_CLASS}>
                <p className="text-sm text-muted-foreground">Define your service types and default prices for invoicing.</p>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={selectedCurrency} onValueChange={updateAllServicesCurrency}>
                    <SelectTrigger className="w-[240px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.symbol} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {servicePrices.length > 0 && (
                  <div className="space-y-2">
                    {servicePrices.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                      >
                        {editingServiceId === service.id ? (
                          <div className="flex-1 grid gap-2 sm:grid-cols-3 mr-3">
                            <Input
                              value={editingService.service_name}
                              onChange={(e) => setEditingService({ ...editingService, service_name: e.target.value })}
                            />
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                {getCurrencySymbol(selectedCurrency)}
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingService.default_price}
                                onChange={(e) => setEditingService({ ...editingService, default_price: e.target.value })}
                                className="pl-8"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={editingService.color || "#3b82f6"}
                                onChange={(e) => setEditingService({ ...editingService, color: e.target.value })}
                                className="h-8 w-10 rounded border border-border cursor-pointer"
                              />
                              <span className="text-xs text-muted-foreground">Color</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center gap-3">
                            <div
                              className="h-6 w-6 rounded-full border border-border shrink-0 cursor-pointer relative group"
                              style={{ backgroundColor: service.color || "#3b82f6" }}
                            >
                              <input
                                type="color"
                                value={service.color || "#3b82f6"}
                                onChange={async (e) => {
                                  const newColor = e.target.value;
                                  await supabase
                                    .from("service_prices")
                                    .update({ color: newColor } as any)
                                    .eq("id", service.id);
                                  setServicePrices(
                                    servicePrices.map((s) => (s.id === service.id ? { ...s, color: newColor } : s)),
                                  );
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm text-foreground">{service.service_name}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {getCurrencySymbol(service.currency)} {Number(service.default_price).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-0.5">
                          {editingServiceId === service.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={saveEditingService}
                                disabled={isSavingService}
                                className="h-7 w-7 text-success"
                              >
                                {isSavingService ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={cancelEditingService} className="h-7 w-7">
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditingService(service)}
                                className="h-7 w-7"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeServicePrice(service.id)}
                                className="h-7 w-7 text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-3 p-3 border border-dashed border-border rounded-lg">
                  <p className="text-sm font-medium text-foreground">Add New Service</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Service Name *</Label>
                      <Input
                        value={newService.service_name}
                        onChange={(e) => setNewService({ ...newService, service_name: e.target.value })}
                        placeholder="e.g., Consultation"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Price ({getCurrencySymbol(selectedCurrency)}) *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {getCurrencySymbol(selectedCurrency)}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newService.default_price}
                          onChange={(e) => setNewService({ ...newService, default_price: e.target.value })}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Calendar Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={newService.color}
                          onChange={(e) => setNewService({ ...newService, color: e.target.value })}
                          className="h-10 w-12 rounded border border-border cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground">Used in calendar</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={addServicePrice} disabled={isAddingService} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    {isAddingService ? "Adding..." : t("myPractice.addService")}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

          {/* Digital Signature Accordion */}
            <AccordionItem value="signature" className="border-0">
              <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
                <div className="flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold text-primary-dark">Digital Signature</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className={SECTION_CONTENT_CLASS}>
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={sigFormData.signature_font}
                onValueChange={(v) => setSigFormData({ ...sigFormData, signature_font: v })}
              >
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <span style={{ fontFamily: getSignatureFontFamily(sigFormData.signature_font), fontSize: "14px" }}>
                    {SIGNATURE_FONTS.find((f) => f.value === sigFormData.signature_font)?.label || "Font"}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {SIGNATURE_FONTS.map((f) => (
                    <SelectItem key={f.value} value={f.value} className="py-3">
                      <div className="flex flex-col">
                        <span style={{ fontFamily: f.fontFamily, fontSize: "22px", lineHeight: "1.4" }}>{f.label}</span>
                        {combinedFullName && (
                          <span className="text-xs text-muted-foreground" style={{ fontFamily: f.fontFamily }}>
                            {combinedFullName}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sigFormData.signature_color}
                onValueChange={(v) => setSigFormData({ ...sigFormData, signature_color: v })}
              >
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-3 w-3 rounded-full border border-border"
                      style={{ backgroundColor: getSignatureColor(sigFormData.signature_color) }}
                    />
                    <span className="truncate">
                      {SIGNATURE_COLORS.find((c) => c.value === sigFormData.signature_color)?.label || "Color"}
                    </span>
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {SIGNATURE_COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full border border-border"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {sigFormData.signature_font_size}px
                </span>
                <Slider
                  min={16}
                  max={48}
                  step={2}
                  value={[sigFormData.signature_font_size]}
                  onValueChange={([v]) => setSigFormData({ ...sigFormData, signature_font_size: v })}
                  className="flex-1"
                />
              </div>
              <Toggle
                pressed={sigFormData.signature_bold}
                onPressedChange={(v) => setSigFormData({ ...sigFormData, signature_bold: v })}
                size="sm"
                aria-label="Bold"
                className="h-8 w-8 p-0"
              >
                <Bold className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={sigFormData.signature_italic}
                onPressedChange={(v) => setSigFormData({ ...sigFormData, signature_italic: v })}
                size="sm"
                aria-label="Italic"
                className="h-8 w-8 p-0"
              >
                <Italic className="h-4 w-4" />
              </Toggle>
            </div>
            <div className="p-3 border border-border rounded-lg bg-background">
              <p
                style={{
                  fontFamily: getSignatureFontFamily(sigFormData.signature_font),
                  color: getSignatureColor(sigFormData.signature_color),
                  fontSize: `${sigFormData.signature_font_size}px`,
                  fontWeight: sigFormData.signature_bold ? "bold" : "normal",
                  fontStyle: sigFormData.signature_italic ? "italic" : "normal",
                }}
              >
                {combinedFullName}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
              </AccordionContent>
            </AccordionItem>

          {/* Voice Narration Settings Accordion */}
            <AccordionItem value="voice" className="border-0">
              <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-semibold text-primary-dark">Voice Narration Settings</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className={SECTION_CONTENT_CLASS}>
            <p className="text-xs text-muted-foreground">Choose the voice used for your daily briefing narration.</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Narration Voice</Label>
              <Select
                value={localVoice}
                onValueChange={async (v) => {
                  setLocalVoice(v);
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();
                  if (!user) return;
                  await supabase
                    .from("profiles")
                    .update({ narration_voice: v } as any)
                    .eq("id", user.id);
                  toast({ title: "Voice updated", description: `Narration voice set to ${v}.` });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: "alloy", label: "Alloy – Neutral & balanced" },
                    { value: "echo", label: "Echo – Warm & clear" },
                    { value: "fable", label: "Fable – Expressive & British" },
                    { value: "onyx", label: "Onyx – Deep & authoritative" },
                    { value: "nova", label: "Nova – Friendly & natural" },
                    { value: "shimmer", label: "Shimmer – Soft & gentle" },
                  ].map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs mt-2"
              onClick={async () => {
                try {
                  const SAMPLE_TEXTS: Record<string, string> = {
                    en: "Welcome to Holarc Health. Use these settings to personalise your experience.",
                    af: "Welkom by Holarc Health. Gebruik hierdie instellings om jou ervaring te personaliseer.",
                    zu: "Siyakwamukela ku-Holarc Health. Sebenzisa lezi zilungiselelo ukwenza isipiliyoni sakho sibe ngesakho.",
                    xh: "Wamkelekile kwi-Holarc Health. Sebenzisa ezi sethingi ukwenza amava akho abe ngawakho.",
                    st: "Rea u amohela ho Holarc Health. Sebelisa litlhophiso tsena ho etsa hore boiphihlelo ba hau bo be ba hau.",
                    tn: "O amogelesegile mo Holarc Health. Dirisa ditlhophiso tseno go itirela maitemogelo a gago.",
                    fr: "Bienvenue chez Holarc Health. Utilisez ces paramètres pour personnaliser votre expérience.",
                    pt: "Bem-vindo ao Holarc Health. Use estas configurações para personalizar a sua experiência.",
                    es: "Bienvenido a Holarc Health. Usa estos ajustes para personalizar tu experiencia.",
                    de: "Willkommen bei Holarc Health. Verwenden Sie diese Einstellungen, um Ihr Erlebnis zu personalisieren.",
                    ar: "مرحبًا بك في Holarc Health. استخدم هذه الإعدادات لتخصيص تجربتك.",
                    sw: "Karibu Holarc Health. Tumia mipangilio hii kubinafsisha uzoefu wako.",
                    nr: "Siyakwamukela ku-Holarc Health. Sebenzisa iinsethingi lezi ukwenza isipiliyoni sakho sibe ngesakho.",
                    ss: "Siyakwemukela ku-Holarc Health. Sebentisa letilungiselelo kutentisa sipiliyoni sakho sibe ngesakho.",
                    ts: "Xa amukeriwa eka Holarc Health. Tirhisa switirhisiwa leswi ku endla leswaku ntokoto wa wena wu va wa wena.",
                    ve: "Vho ṱanganedzwa kha Holarc Health. Shumisani zwishumiswa izwi u itela tshenzhemo yaṋu.",
                    nl: "Welkom bij Holarc Health. Gebruik deze instellingen om uw ervaring te personaliseren.",
                    el: "Καλώς ήρθατε στο Holarc Health. Χρησιμοποιήστε αυτές τις ρυθμίσεις για να εξατομικεύσετε την εμπειρία σας.",
                    he: "ברוכים הבאים ל-Holarc Health. השתמשו בהגדרות אלה כדי להתאים אישית את החוויה שלכם.",
                    hi: "Holarc Health में आपका स्वागत है। अपने अनुभव को निजीकृत करने के लिए इन सेटिंग्स का उपयोग करें।",
                    id: "Selamat datang di Holarc Health. Gunakan pengaturan ini untuk mempersonalisasi pengalaman Anda.",
                    it: "Benvenuti in Holarc Health. Usa queste impostazioni per personalizzare la tua esperienza.",
                    ja: "Holarc Healthへようこそ。これらの設定を使って、あなたの体験をカスタマイズしてください。",
                    ko: "Holarc Health에 오신 것을 환영합니다. 이 설정을 사용하여 경험을 맞춤 설정하세요.",
                    ms: "Selamat datang ke Holarc Health. Gunakan tetapan ini untuk memperibadikan pengalaman anda.",
                    zh: "欢迎来到Holarc Health。使用这些设置来个性化您的体验。",
                    pl: "Witamy w Holarc Health. Użyj tych ustawień, aby spersonalizować swoje doświadczenie.",
                    ru: "Добро пожаловать в Holarc Health. Используйте эти настройки для персонализации вашего опыта.",
                    th: "ยินดีต้อนรับสู่ Holarc Health ใช้การตั้งค่าเหล่านี้เพื่อปรับแต่งประสบการณ์ของคุณ",
                    tr: "Holarc Health'e hoş geldiniz. Deneyiminizi kişiselleştirmek için bu ayarları kullanın.",
                    uk: "Ласкаво просимо до Holarc Health. Використовуйте ці налаштування, щоб персоналізувати свій досвід.",
                    vi: "Chào mừng bạn đến với Holarc Health. Sử dụng các cài đặt này để cá nhân hóa trải nghiệm của bạn.",
                  };
                  const primaryLang = (profile as any)?.preferred_language || "en";
                  const sampleText = SAMPLE_TEXTS[primaryLang] || SAMPLE_TEXTS.en;
                  const voice = localVoice;
                  const session = await supabase.auth.getSession();
                  const token = session.data.session?.access_token;
                  if (!token) throw new Error("Not authenticated");
                  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrate-briefing`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    },
                    body: JSON.stringify({ text: sampleText, voice }),
                  });
                  if (!response.ok) throw new Error("Failed to generate audio");
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const audio = new Audio(url);
                  audio.play();
                  audio.onended = () => URL.revokeObjectURL(url);
                  toast({ title: "Playing sample voice" });
                } catch {
                  toast({ title: "Failed to play sample", variant: "destructive" });
                }
              }}
            >
              <Volume2 className="h-3.5 w-3.5" />
              Sample Voice
            </Button>
              </AccordionContent>
            </AccordionItem>
            </Accordion>
          </div>
        </TabsContent>

        {/* === TEMPLATES TAB === */}
        <TabsContent value="templates" className="mt-4 my-practice-tab-body">
          <Documents hideHeader />
        </TabsContent>

        {/* === REFERRALS TAB === */}
        <TabsContent value="referrals" className="mt-4 space-y-4 my-practice-tab-body">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-primary-dark">Referral Wealth Managers</h3>
            </div>
            <ReferralDoctors hideHeader />
          </div>
        </TabsContent>


        {/* === CERTIFICATES TAB === */}
        <TabsContent value="certificates" className="mt-4 my-practice-tab-body">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-primary-dark">Credentials</h3>
              <Button
                size="sm"
                onClick={() => {
                  setShowCertForm(true);
                  setEditingCertId(null);
                  setCertForm({ certificate_name: "", issuing_body: "", date_earned: "", cpd_points: "" });
                  setCertificateFile(null);
                  setCertErrors({});
                }}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Credential
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Track your professional credentials and CPD points.
            </p>
            {showCertForm && (
              <div className="space-y-3 p-3 border border-dashed border-border rounded-lg">
                <p className="text-sm font-medium">{editingCertId ? "Edit" : "Add"} Credential</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Credential Name <span className="text-destructive">*</span></Label>
                    <Input
                      value={certForm.certificate_name}
                      onChange={(e) => setCertForm({ ...certForm, certificate_name: e.target.value })}
                      placeholder="e.g., Advanced Cardiac Life Support"
                    />
                    {certErrors.certificate_name && <p className="text-xs text-destructive">{certErrors.certificate_name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Issuing Body <span className="text-destructive">*</span></Label>
                    <Input
                      value={certForm.issuing_body}
                      onChange={(e) => setCertForm({ ...certForm, issuing_body: e.target.value })}
                      placeholder="e.g., HPCSA"
                    />
                    {certErrors.issuing_body && <p className="text-xs text-destructive">{certErrors.issuing_body}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date Earned <span className="text-destructive">*</span></Label>
                    <Input
                      type="date"
                      value={certForm.date_earned}
                      onChange={(e) => setCertForm({ ...certForm, date_earned: e.target.value })}
                    />
                    {certErrors.date_earned && <p className="text-xs text-destructive">{certErrors.date_earned}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>CPD Points <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      min="0"
                      value={certForm.cpd_points}
                      onChange={(e) => setCertForm({ ...certForm, cpd_points: e.target.value })}
                    />
                    {certErrors.cpd_points && <p className="text-xs text-destructive">{certErrors.cpd_points}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Attach Certificate <span className="text-destructive">*</span></Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={certFileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => certFileInputRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {certificateFile ? certificateFile.name : "Choose File"}
                    </Button>
                    {certificateFile && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setCertificateFile(null)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  {certErrors.certificate_file && <p className="text-xs text-destructive">{certErrors.certificate_file}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCertSave} disabled={certSaving || certUploading}>
                    {(certSaving || certUploading) && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                    {certUploading ? "Uploading..." : editingCertId ? "Update" : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCertForm(false);
                      setEditingCertId(null);
                      setCertificateFile(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {certsLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
              </div>
            ) : certs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No certificates recorded yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Issuing Body</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certs.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium text-sm">{cert.certificate_name}</TableCell>
                      <TableCell className="text-sm">{cert.issuing_body || "-"}</TableCell>
                      <TableCell className="text-sm">{format(new Date(cert.date_earned), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{cert.cpd_points}</Badge>
                      </TableCell>
                      <TableCell>
                        {cert.certificate_url ? (
                          <button
                            type="button"
                            onClick={() => openCertificate(cert.certificate_url!)}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCertEdit(cert)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleCertDelete(cert.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* === REWARDS TAB === */}
        <TabsContent value="rewards" className="mt-4 my-practice-tab-body">
          <MyRewards embedded />
        </TabsContent>

      </Tabs>
    </div>
  );
}
