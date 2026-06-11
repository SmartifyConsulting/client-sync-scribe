import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import holarcLogo from "@/assets/holarc-logo-clear-2.png";
import {
  Mail, Lock, Loader2, User, Building2, MapPin, Plus, Trash2, Phone,
  Stethoscope, PenTool, UserCircle, Camera, ChevronLeft, ChevronRight, Globe,
  Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TrialSignupSection } from "@/components/auth/TrialSignupSection";
import { Footer } from "@/components/layout/Footer";
import { Progress } from "@/components/ui/progress";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { DevErLoginButton } from "@/components/auth/DevErLoginButton";

const DOCTOR_SPECIALTIES = [
  "General Practitioner", "Cardiologist", "Dermatologist", "Endocrinologist",
  "Gastroenterologist", "Neurologist", "Oncologist", "Ophthalmologist",
  "Orthopaedics", "Paediatrician", "Psychiatrist", "Pulmonologist",
  "Radiologist", "Rheumatologist", "Urologist", "Other",
];

const COUNTRIES = [
  { code: "+27", name: "South Africa", flag: "🇿🇦", lang: "English" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧", lang: "English" },
  { code: "+1", name: "United States", flag: "🇺🇸", lang: "English" },
  { code: "+61", name: "Australia", flag: "🇦🇺", lang: "English" },
  { code: "+49", name: "Germany", flag: "🇩🇪", lang: "German" },
  { code: "+33", name: "France", flag: "🇫🇷", lang: "French" },
  { code: "+351", name: "Portugal", flag: "🇵🇹", lang: "Portuguese" },
  { code: "+34", name: "Spain", flag: "🇪🇸", lang: "Spanish" },
  { code: "+31", name: "Netherlands", flag: "🇳🇱", lang: "Dutch" },
  { code: "+91", name: "India", flag: "🇮🇳", lang: "English" },
  { code: "+86", name: "China", flag: "🇨🇳", lang: "Chinese" },
  { code: "+81", name: "Japan", flag: "🇯🇵", lang: "Japanese" },
  { code: "+971", name: "UAE", flag: "🇦🇪", lang: "Arabic" },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦", lang: "Arabic" },
  { code: "+254", name: "Kenya", flag: "🇰🇪", lang: "English" },
  { code: "+234", name: "Nigeria", flag: "🇳🇬", lang: "English" },
  { code: "+263", name: "Zimbabwe", flag: "🇿🇼", lang: "English" },
  { code: "+267", name: "Botswana", flag: "🇧🇼", lang: "English" },
  { code: "+264", name: "Namibia", flag: "🇳🇦", lang: "English" },
  { code: "+258", name: "Mozambique", flag: "🇲🇿", lang: "Portuguese" },
];

interface PartnerInput {
  full_name: string;
  registration_number: string;
  mobile_number: string;
}

type UserRole = "doctor" | "patient";

const DOCTOR_STEPS = ["Account", "Terms & Payment"];
const PATIENT_STEPS = ["Account", "Terms & Payment"];

const STORAGE_KEY = "holarc_signup_draft";

function saveDraft(data: any) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function loadDraft(): any | null {
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null; } catch { return null; }
}
function clearDraft() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { signIn, signUp, signInWithOtp, verifyOtp } = useAuth();
  
  const modeParam = searchParams.get("mode");
  const roleParam = searchParams.get("role") as UserRole | null;
  
  const [isLogin, setIsLogin] = useState(modeParam !== "signup");
  const [email, setEmail] = useState("");
  // Unified login field: email OR phone (no '@' => phone)
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [accountCreated, setAccountCreated] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  // Signup: pick email or phone identifier
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("email");

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setTimeout(() => setOtpCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCooldown]);

  const [userRole, setUserRole] = useState<UserRole>(roleParam || "doctor");
  const [countryCode, setCountryCode] = useState("+27");

  // Doctor fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const fullName = `${firstName} ${lastName}`.trim();
  const [practiceNumber, setPracticeNumber] = useState("");
  const [doctorNumber, setDoctorNumber] = useState("");
  const [practiceAddress, setPracticeAddress] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [partners, setPartners] = useState<PartnerInput[]>([]);
  const [newPartner, setNewPartner] = useState<PartnerInput>({ full_name: "", registration_number: "", mobile_number: "" });

  // Patient fields
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [postalAddress, setPostalAddress] = useState("");
  const [sameAsPhysical, setSameAsPhysical] = useState(false);
  const [employer, setEmployer] = useState("");
  const [occupation, setOccupation] = useState("");
  const [medicalInsurance, setMedicalInsurance] = useState("");
  const [medicalInsuranceProduct, setMedicalInsuranceProduct] = useState("");
  const [medicalInsuranceNumber, setMedicalInsuranceNumber] = useState("");
  const [primaryMember, setPrimaryMember] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [nextOfKinEmail, setNextOfKinEmail] = useState("");
  const [generalPractitioner, setGeneralPractitioner] = useState("");
  const [allergies, setAllergies] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const inviteToken = searchParams.get("invite");

  useEffect(() => {
    if (inviteToken) {
      setIsLogin(false);
      setUserRole("patient");
    }
  }, [inviteToken]);

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && !isLogin) {
      setUserRole(draft.userRole || "doctor");
      setFirstName(draft.firstName || draft.fullName || "");
      setLastName(draft.lastName || "");
      setCountryCode(draft.countryCode || "+27");
      setPhone(draft.phone || "");
      setMobileNumber(draft.mobileNumber || "");
      setDob(draft.dob || "");
      setPhysicalAddress(draft.physicalAddress || "");
      setPostalAddress(draft.postalAddress || "");
      setSameAsPhysical(draft.sameAsPhysical || false);
      setEmployer(draft.employer || "");
      setOccupation(draft.occupation || "");
      setMedicalInsurance(draft.medicalInsurance || "");
      setMedicalInsuranceProduct(draft.medicalInsuranceProduct || "");
      setMedicalInsuranceNumber(draft.medicalInsuranceNumber || "");
      setPrimaryMember(draft.primaryMember || "");
      setNextOfKinName(draft.nextOfKinName || "");
      setNextOfKinPhone(draft.nextOfKinPhone || "");
      setNextOfKinEmail(draft.nextOfKinEmail || "");
      setGeneralPractitioner(draft.generalPractitioner || "");
      setAllergies(draft.allergies || "");
      setReferredBy(draft.referredBy || "");
      setPracticeNumber(draft.practiceNumber || "");
      setDoctorNumber(draft.doctorNumber || "");
      setPracticeAddress(draft.practiceAddress || "");
      setSpecialty(draft.specialty || "");
      setPartners(draft.partners || []);
      if (draft.currentStep) setCurrentStep(draft.currentStep);
      toast({ title: "Draft restored", description: "Your previous registration progress has been restored." });
    }
  }, []);

  // Auto-save draft when on signup
  useEffect(() => {
    if (!isLogin && currentStep > 0) {
      saveDraft({
        userRole, firstName, lastName, countryCode, phone, mobileNumber, dob, physicalAddress, postalAddress,
        sameAsPhysical, employer, occupation, medicalInsurance, medicalInsuranceProduct,
        medicalInsuranceNumber, primaryMember, nextOfKinName, nextOfKinPhone, nextOfKinEmail,
        generalPractitioner, allergies, referredBy, practiceNumber, doctorNumber, practiceAddress,
        specialty, partners, currentStep,
      });
    }
  }, [currentStep, firstName, lastName, phone, mobileNumber, dob, physicalAddress]);

  const steps = userRole === "doctor" ? DOCTOR_STEPS : PATIENT_STEPS;
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];

  const addPartner = () => {
    if (!newPartner.full_name.trim() || !newPartner.registration_number.trim()) {
      toast({ title: "Missing fields", description: "Partner name and registration number are required", variant: "destructive" });
      return;
    }
    setPartners([...partners, newPartner]);
    setNewPartner({ full_name: "", registration_number: "", mobile_number: "" });
  };

  const removePartner = (index: number) => setPartners(partners.filter((_, i) => i !== index));

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;
    const { error } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true });
    if (error) return null;
    return supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setSignaturePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadSignature = async (userId: string): Promise<string | null> => {
    if (!signatureFile) return null;
    const fileExt = signatureFile.name.split('.').pop();
    const fileName = `${userId}/signature.${fileExt}`;
    const { error } = await supabase.storage.from('avatars').upload(fileName, signatureFile, { upsert: true });
    if (error) return null;
    return supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
  };

  const handleCreateAccount = async () => {
    if (!email || !password) {
      toast({ title: "Required", description: "Email and password are required", variant: "destructive" });
      return false;
    }
    setLoading(true);
    try {
      const { data, error } = await signUp(email, password, { full_name: fullName, role: userRole });
      if (error) throw error;
      if (data?.user) {
        setCreatedUserId(data.user.id);
        setAccountCreated(true);
        // Role and profile are created server-side by handle_new_user trigger.
        return true;
      }
      return false;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!acceptedTerms) {
      toast({ title: "Terms Required", description: "You must accept the Terms and Conditions", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const userId = createdUserId;
      if (!userId) throw new Error("No user account found");

      const preferredLanguage = selectedCountry.lang;
      const phoneDigits = userRole === "doctor" ? mobileNumber : phone;
      const fullPhone = phoneDigits ? `${countryCode} ${phoneDigits}` : null;

      const nameParts = fullName.trim().toLowerCase().split(/\s+/);
      const firstPart = nameParts[0] || "user";
      const lastPart = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
      const baseAlias = (lastPart ? `${firstPart}-${lastPart}` : firstPart).replace(/[^a-z0-9-]/g, '');

      // Update profile with the few fields we collect at signup
      await supabase.from("profiles").update({
        full_name: fullName,
        role: userRole,
        mailbox_alias: baseAlias,
        mobile_number: fullPhone,
        preferred_language: preferredLanguage,
      }).eq("id", userId);

      if (userRole === "patient") {
        if (inviteToken) {
          const { data: invitation } = await supabase
            .from("patient_invitations")
            .select("*")
            .eq("token", inviteToken)
            .eq("status", "pending")
            .single();

          if (invitation) {
            await supabase.from("patient_invitations").update({ status: "accepted" }).eq("id", invitation.id);
            if (invitation.patient_id) {
              await supabase.from("patients").update({
                patient_user_id: userId,
                email,
                phone: fullPhone,
              }).eq("id", invitation.patient_id);
            }
            await supabase.from("doctor_patient_access").insert({
              doctor_id: invitation.doctor_id,
              patient_user_id: userId,
              permissions: ["patient_info", "calendar", "session_summaries", "prescription_history"],
              is_active: true,
            });

            const { data: signupConfig } = await supabase
              .from("gamification_config")
              .select("lollipops_awarded")
              .eq("visit_category", "Signup Bonus")
              .eq("is_active", true)
              .maybeSingle();

            const signupLollipops = signupConfig?.lollipops_awarded || 1;
            const { data: rewardData } = await supabase.from("patient_rewards").insert({
              patient_id: invitation.patient_id, session_id: null,
              reward_type: "lollipop", visit_category: "Signup Bonus",
              lollipops_count: signupLollipops, awarded_by: userId,
            }).select().single();

            if (rewardData) {
              await supabase.from("notifications").insert({
                user_id: userId,
                title: `🍭 Welcome! You earned ${signupLollipops} lollipop${signupLollipops > 1 ? "s" : ""}!`,
                description: `Congratulations on signing up! You received ${signupLollipops} lollipop${signupLollipops > 1 ? "s" : ""} as a welcome bonus.`,
                type: "reward",
                reference_id: rewardData.id,
              });
            }
          }
        } else {
          // Non-invited patient: minimal patient record so MyDetails has something to edit
          await supabase.from("patients").insert({
            user_id: userId,
            patient_user_id: userId,
            name: fullName,
            email,
            phone: fullPhone,
          });
        }
      }

      // MVP: no trial/subscription row created at signup — users get full access without countdowns.

      clearDraft();
      toast({ title: "Account created!", description: "Check your inbox to confirm your email before signing in." });
      await routeAfterLogin(userId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0 && !isLogin && !accountCreated) {
      if (!firstName.trim() || !lastName.trim()) {
        toast({ title: "Required", description: "First name and last name are required", variant: "destructive" });
        return;
      }
      const success = await handleCreateAccount();
      if (!success) return;
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const routeAfterLogin = async (userId: string) => {
    const [{ data: profileData }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const rawRoles = (roleRows ?? []).map((r) => r.role);
    const isEmergency = rawRoles.some((r) => r === "hospital_staff" || r === "ambulance_staff" || r === "blood_bank");
    const resolvedRole =
      profileData?.role ??
      (rawRoles.includes("patient")
        ? "patient"
        : rawRoles.includes("doctor")
          ? "doctor"
          : isEmergency
            ? "emergency"
            : rawRoles.includes("admin")
              ? "admin"
              : null);
    navigate(
      resolvedRole === "patient"
        ? "/patient/details"
        : resolvedRole === "emergency"
          ? "/provider"
          : "/dashboard"
    );
  };

  const normalizePhone = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.startsWith("+")) return "+" + trimmed.slice(1).replace(/\D/g, "");
    const digits = trimmed.replace(/\D/g, "").replace(/^0+/, "");
    return `${countryCode}${digits}`.replace(/\s+/g, "");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = loginId.trim();
    if (!id || !password) {
      toast({ title: "Required", description: "Enter your email or phone and password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const isEmail = id.includes("@");
      const credentials = isEmail
        ? { email: id, password }
        : { phone: normalizePhone(id), password };
      const { data, error } = await supabase.auth.signInWithPassword(credentials as any);
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("invalid") || msg.includes("credentials")) {
          throw new Error("Invalid credentials");
        }
        if (msg.includes("not found") || msg.includes("does not exist")) {
          throw new Error("Account does not exist");
        }
        throw error;
      }
      toast({ title: "Welcome back!", description: "Successfully signed in" });
      const userId = data?.user?.id;
      if (userId) {
        await routeAfterLogin(userId);
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Sign-in failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email) {
      toast({ title: "Email required", description: "Enter your email to receive a code", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auth-email-sender", {
        body: {
          type: "magiclink",
          email,
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOtpSent(true);
      setOtpCooldown(30);
      toast({ title: "Code sent", description: "Check your email for a 6-digit code or magic link." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code from your email", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await verifyOtp(email, otpCode);
      if (error) throw error;
      toast({ title: "Welcome!", description: "Signed in successfully" });
      const userId = data?.user?.id;
      if (userId) await routeAfterLogin(userId);
      else navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Country selector component
  const CountrySelector = () => (
    <Select value={countryCode} onValueChange={setCountryCode}>
      <SelectTrigger className="w-[80px]">
        <SelectValue>
          {selectedCountry.flag} {selectedCountry.code}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {COUNTRIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.flag} {c.name} ({c.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // ========= RENDER STEPS =========

  const renderDoctorStep = () => {
    switch (currentStep) {
      case 0: // Account
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>I am a...</Label>
              <RadioGroup value={userRole} onValueChange={(v) => setUserRole(v as UserRole)} className="grid grid-cols-3 gap-2">
                <div className="relative">
                  <RadioGroupItem value="doctor" id="doctor" className="peer sr-only" />
                  <Label htmlFor="doctor" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:bg-accent peer-data-[state=checked]:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center">
                    <Stethoscope className="mb-1 h-5 w-5" />
                    <span className="text-[11px] font-medium leading-tight">Healthcare Provider</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="patient" id="patient" className="peer sr-only" />
                  <Label htmlFor="patient" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:bg-accent peer-data-[state=checked]:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center">
                    <UserCircle className="mb-1 h-5 w-5" />
                    <span className="text-[11px] font-medium leading-tight">Patient</span>
                  </Label>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => navigate("/provider-signup")}
                    className="w-full flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground hover:border-primary cursor-pointer text-center"
                  >
                    <Building2 className="mb-1 h-5 w-5" />
                    <span className="text-[11px] font-medium leading-tight">Emergency Service Provider</span>
                  </button>
                </div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name(s)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="firstName" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Smith" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required disabled={accountCreated} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required minLength={6} disabled={accountCreated} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <div className="flex gap-2">
                <CountrySelector />
                <Input placeholder="82 123 4567" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className="flex-1" />
              </div>
              <p className="text-xs text-muted-foreground">Language will be set to: {selectedCountry.lang}</p>
            </div>
          </div>
        );
      case 1: // Terms
        return (
          <div className="space-y-4">
            <TrialSignupSection userRole={userRole} acceptedTerms={acceptedTerms} onAcceptedTermsChange={setAcceptedTerms} />
          </div>
        );
      default: return null;
    }
  };

  const renderPatientStep = () => {
    switch (currentStep) {
      case 0: // Account
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>I am a...</Label>
              <RadioGroup value={userRole} onValueChange={(v) => setUserRole(v as UserRole)} className="grid grid-cols-3 gap-2" disabled={!!inviteToken}>
                <div className="relative">
                  <RadioGroupItem value="doctor" id="doctor" className="peer sr-only" />
                  <Label htmlFor="doctor" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:bg-accent peer-data-[state=checked]:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center">
                    <Stethoscope className="mb-1 h-5 w-5" />
                    <span className="text-[11px] font-medium leading-tight">Healthcare Provider</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="patient" id="patient" className="peer sr-only" />
                  <Label htmlFor="patient" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:bg-accent peer-data-[state=checked]:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center">
                    <UserCircle className="mb-1 h-5 w-5" />
                    <span className="text-[11px] font-medium leading-tight">Patient</span>
                  </Label>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => navigate("/provider-signup")}
                    className="w-full flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground hover:border-primary cursor-pointer text-center"
                  >
                    <Building2 className="mb-1 h-5 w-5" />
                    <span className="text-[11px] font-medium leading-tight">Emergency Service Provider</span>
                  </button>
                </div>
              </RadioGroup>
              {inviteToken && <p className="text-xs text-muted-foreground mt-2">You're registering via a doctor's invitation</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name(s)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="firstName" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Smith" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required disabled={accountCreated} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required minLength={6} disabled={accountCreated} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <div className="flex gap-2">
                <CountrySelector />
                <Input placeholder="82 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1" />
              </div>
              <p className="text-xs text-muted-foreground">Language will be set to: {selectedCountry.lang}</p>
            </div>
          </div>
        );
      case 1: // Terms
        return (
          <div className="space-y-4">
            <TrialSignupSection userRole={userRole} acceptedTerms={acceptedTerms} onAcceptedTermsChange={setAcceptedTerms} />
          </div>
        );
      default: return null;
    }
  };

  const isLastStep = currentStep === totalSteps - 1;

  // Login form
  if (isLogin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <button type="button" onClick={() => navigate("/")} className="flex justify-center mb-4 mx-auto hover:opacity-80 transition-opacity">
                <img src={holarcLogo} alt="Holarc Health" className="h-[117px] w-auto" />
              </button>
              <p className="text-muted-foreground mt-2">Sign In</p>
            </div>
            <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">
              {!useOtp ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button type="button" tabIndex={-1} onClick={() => navigate("/forgot-password")} className="text-xs text-muted-foreground hover:text-primary hover:underline">Forgot your password?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required minLength={6} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign In
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="otp-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setOtpSent(false); }}
                        className="pl-10"
                        required
                        disabled={otpSent && loading}
                      />
                    </div>
                  </div>

                  {!otpSent ? (
                    <Button type="button" onClick={handleSendOtp} className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send code
                    </Button>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="otp">Enter 6-digit code</Label>
                        <div className="flex justify-center">
                          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Or click the magic link we emailed you.
                        </p>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verify & sign in
                      </Button>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={loading || otpCooldown > 0}
                        className="block w-full text-xs text-muted-foreground hover:text-primary hover:underline disabled:opacity-50"
                      >
                        {otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : "Resend code"}
                      </button>
                    </>
                  )}
                </form>
              )}
              <div className="mt-4 text-center space-y-2">
                <button
                  type="button"
                  onClick={() => { setUseOtp(!useOtp); setOtpSent(false); setOtpCode(""); setPassword(""); }}
                  className="block w-full text-sm text-primary hover:underline"
                >
                  {useOtp ? "Sign in with password instead" : "Email me a sign-in code instead"}
                </button>
                <p className="block w-full text-xs text-muted-foreground">
                  Sign-ups are currently invite-only. Please contact an administrator for access.
                </p>
              </div>
              <DevErLoginButton />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Signup disabled for MVP — invite-only
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <button type="button" onClick={() => navigate("/")} className="flex justify-center mb-4 mx-auto hover:opacity-80 transition-opacity">
              <img src={holarcLogo} alt="Holarc Health" className="h-[117px] w-auto" />
            </button>
          </div>
          <div className="rounded-xl border border-primary bg-card p-6 shadow-sm text-center space-y-4">
            <h2 className="text-lg font-semibold">Sign-ups are invite-only</h2>
            <p className="text-sm text-muted-foreground">
              Account creation is currently disabled while we run the MVP. Please contact an administrator to be granted access.
            </p>
            <Button onClick={() => setIsLogin(true)} className="w-full">
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
