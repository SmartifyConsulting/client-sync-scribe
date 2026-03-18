import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import holarcLogo from "@/assets/holarc-logo.png";
import {
  Mail, Lock, Loader2, User, Building2, MapPin, Plus, Trash2, Phone,
  Stethoscope, PenTool, UserCircle, Camera, ChevronLeft, ChevronRight, Globe,
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

const DOCTOR_STEPS = ["Account", "Profile", "Practice Info", "Partners", "Terms & Payment"];
const PATIENT_STEPS = ["Account", "Personal Info", "Employment", "Insurance", "Next of Kin", "Terms & Payment"];

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
  const { signIn, signUp } = useAuth();
  
  const modeParam = searchParams.get("mode");
  const roleParam = searchParams.get("role") as UserRole | null;
  
  const [isLogin, setIsLogin] = useState(modeParam !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [accountCreated, setAccountCreated] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<UserRole>(roleParam || "doctor");
  const [countryCode, setCountryCode] = useState("+27");

  // Doctor fields
  const [fullName, setFullName] = useState("");
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
      setFullName(draft.fullName || "");
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
        userRole, fullName, countryCode, phone, mobileNumber, dob, physicalAddress, postalAddress,
        sameAsPhysical, employer, occupation, medicalInsurance, medicalInsuranceProduct,
        medicalInsuranceNumber, primaryMember, nextOfKinName, nextOfKinPhone, nextOfKinEmail,
        generalPractitioner, allergies, referredBy, practiceNumber, doctorNumber, practiceAddress,
        specialty, partners, currentStep,
      });
    }
  }, [currentStep, fullName, phone, mobileNumber, dob, physicalAddress]);

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
      const { data, error } = await signUp(email, password);
      if (error) throw error;
      if (data?.user) {
        setCreatedUserId(data.user.id);
        setAccountCreated(true);
        await supabase.from("user_roles").insert({ user_id: data.user.id, role: userRole });
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
      const fullPhone = `${countryCode} ${userRole === "doctor" ? mobileNumber : phone}`;

      if (userRole === "doctor") {
        const avatarUrl = await uploadAvatar(userId);
        const signatureUrl = await uploadSignature(userId);

        const nameParts = fullName.trim().toLowerCase().split(/\s+/);
        const firstName = nameParts[0] || "user";
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
        const mailboxAlias = lastName
          ? `${firstName}-${lastName}`.replace(/[^a-z0-9-]/g, '')
          : `${firstName}`.replace(/[^a-z0-9-]/g, '');

        await supabase.from("profiles").update({
          full_name: fullName,
          practice_number: practiceNumber,
          doctor_number: doctorNumber,
          practice_address: practiceAddress,
          specialty: specialty || null,
          avatar_url: avatarUrl,
          signature_url: signatureUrl,
          role: userRole,
          mailbox_alias: mailboxAlias,
          mobile_number: fullPhone,
          preferred_language: preferredLanguage,
        }).eq("id", userId);

        if (partners.length > 0) {
          await supabase.from("practice_partners").insert(
            partners.map((p) => ({
              user_id: userId,
              full_name: p.full_name,
              registration_number: p.registration_number,
              mobile_number: p.mobile_number || null,
            }))
          );
        }
      } else {
        const patientNameParts = fullName.trim().toLowerCase().split(/\s+/);
        const patientFirst = patientNameParts[0] || "user";
        const patientLast = patientNameParts.length > 1 ? patientNameParts[patientNameParts.length - 1] : "";
        const birthYear = dob ? new Date(dob).getFullYear().toString() : "";
        let patientAlias = patientLast ? `${patientFirst}-${patientLast}` : patientFirst;
        if (birthYear) patientAlias += `-${birthYear}`;
        patientAlias = patientAlias.replace(/[^a-z0-9-]/g, '');

        await supabase.from("profiles").update({
          full_name: fullName,
          role: userRole,
          mailbox_alias: patientAlias,
          mobile_number: fullPhone,
          preferred_language: preferredLanguage,
        }).eq("id", userId);

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
                email, phone: fullPhone, dob: dob || null,
                physical_address: physicalAddress,
                postal_address: sameAsPhysical ? physicalAddress : postalAddress,
                same_as_physical: sameAsPhysical, employer, occupation,
                medical_aid: medicalInsurance, medical_aid_number: medicalInsuranceNumber,
                medical_insurance_product: medicalInsuranceProduct, primary_member: primaryMember,
                next_of_kin_name: nextOfKinName, next_of_kin_phone: nextOfKinPhone,
                next_of_kin_email: nextOfKinEmail, general_practitioner: generalPractitioner,
                allergies, referred_by: referredBy,
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
        }
      }

      // Create trial subscription
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      await supabase.from("subscriptions").upsert({
        user_id: userId,
        plan_type: userRole,
        billing_cycle: "monthly",
        status: "trial_pending",
        is_trial: true,
        trial_ends_at: trialEndsAt.toISOString(),
        accepted_terms_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      try {
        const { data: paypalData } = await supabase.functions.invoke("paypal-subscription", {
          body: { action: "create-trial", planType: userRole, billingCycle: "monthly", userId },
        });
        if (paypalData?.approvalUrl) {
          clearDraft();
          toast({ title: "Account created!", description: "Redirecting to PayPal..." });
          window.location.href = paypalData.approvalUrl;
          return;
        }
      } catch {}

      clearDraft();
      toast({ title: "Account created!", description: "Welcome to Holarc!" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0 && !isLogin && !accountCreated) {
      if (!fullName.trim()) {
        toast({ title: "Required", description: "Full name is required", variant: "destructive" });
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast({ title: "Welcome back!", description: "Successfully signed in" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Country selector component
  const CountrySelector = () => (
    <Select value={countryCode} onValueChange={setCountryCode}>
      <SelectTrigger className="w-[140px]">
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
              <RadioGroup value={userRole} onValueChange={(v) => setUserRole(v as UserRole)} className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <RadioGroupItem value="doctor" id="doctor" className="peer sr-only" />
                  <Label htmlFor="doctor" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer">
                    <Stethoscope className="mb-2 h-6 w-6" />
                    <span className="text-sm font-medium">Healthcare Provider</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="patient" id="patient" className="peer sr-only" />
                  <Label htmlFor="patient" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer">
                    <UserCircle className="mb-2 h-6 w-6" />
                    <span className="text-sm font-medium">Patient</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="fullName" placeholder="Dr. John Smith" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
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
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} disabled={accountCreated} />
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
      case 1: // Profile
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Profile Photo</h3>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="text-lg bg-muted">
                  {fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'DR'}
                </AvatarFallback>
              </Avatar>
              <div>
                <input type="file" ref={avatarInputRef} accept="image/*" onChange={handleAvatarChange} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} className="gap-2">
                  <Camera className="h-4 w-4" />{avatarPreview ? 'Change Photo' : 'Upload Photo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF (max 2MB)</p>
              </div>
            </div>

            <h3 className="text-sm font-medium text-foreground pt-4 border-t border-border">Electronic Signature</h3>
            <div className="flex items-center gap-4">
              <div className="h-20 w-40 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                {signaturePreview ? <img src={signaturePreview} alt="Signature" className="max-h-full max-w-full object-contain" /> : <PenTool className="h-8 w-8 text-muted-foreground" />}
              </div>
              <div>
                <input type="file" ref={signatureInputRef} accept="image/*" onChange={handleSignatureChange} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => signatureInputRef.current?.click()} className="gap-2">
                  <PenTool className="h-4 w-4" />{signaturePreview ? 'Change' : 'Upload Signature'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG with transparent background</p>
              </div>
            </div>
          </div>
        );
      case 2: // Practice Info
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Specialty</Label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger><SelectValue placeholder="Select your specialty" /></SelectTrigger>
                <SelectContent>
                  {DOCTOR_SPECIALTIES.map((spec) => <SelectItem key={spec} value={spec}>{spec}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Practice Number</Label>
                <Input placeholder="e.g., PR123456" value={practiceNumber} onChange={(e) => setPracticeNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Registration Number</Label>
                <Input placeholder="e.g., MP123456" value={doctorNumber} onChange={(e) => setDoctorNumber(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address of Doctor's Rooms</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea placeholder="123 Medical Centre, Suite 4, Cape Town, 8001" value={practiceAddress} onChange={(e) => setPracticeAddress(e.target.value)} className="pl-10 min-h-[60px]" rows={2} />
              </div>
            </div>
          </div>
        );
      case 3: // Partners
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-1">Practice Partners (Optional)</h3>
              <p className="text-xs text-muted-foreground mb-4">Add partners of the same practice</p>
            </div>
            {partners.length > 0 && (
              <div className="space-y-2">
                {partners.map((partner, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border text-sm">
                    <div>
                      <p className="font-medium text-foreground">{partner.full_name}</p>
                      <p className="text-xs text-muted-foreground">Reg: {partner.registration_number}{partner.mobile_number && ` · ${partner.mobile_number}`}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePartner(index)} className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-3 p-3 border border-dashed border-border rounded-lg">
              <div className="space-y-2">
                <Label className="text-xs">Partner Full Name</Label>
                <Input value={newPartner.full_name} onChange={(e) => setNewPartner({ ...newPartner, full_name: e.target.value })} placeholder="Dr. Jane Doe" className="h-9" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs">Registration Number</Label>
                  <Input value={newPartner.registration_number} onChange={(e) => setNewPartner({ ...newPartner, registration_number: e.target.value })} placeholder="e.g., MP654321" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Mobile (Optional)</Label>
                  <Input value={newPartner.mobile_number} onChange={(e) => setNewPartner({ ...newPartner, mobile_number: e.target.value })} placeholder="082 123 4567" className="h-9" />
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addPartner} className="w-full gap-1"><Plus className="h-3 w-3" />Add Partner</Button>
            </div>
          </div>
        );
      case 4: // Terms
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
              <RadioGroup value={userRole} onValueChange={(v) => setUserRole(v as UserRole)} className="grid grid-cols-2 gap-3" disabled={!!inviteToken}>
                <div className="relative">
                  <RadioGroupItem value="doctor" id="doctor" className="peer sr-only" />
                  <Label htmlFor="doctor" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer">
                    <Stethoscope className="mb-2 h-6 w-6" />
                    <span className="text-sm font-medium">Healthcare Provider</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="patient" id="patient" className="peer sr-only" />
                  <Label htmlFor="patient" className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer">
                    <UserCircle className="mb-2 h-6 w-6" />
                    <span className="text-sm font-medium">Patient</span>
                  </Label>
                </div>
              </RadioGroup>
              {inviteToken && <p className="text-xs text-muted-foreground mt-2">You're registering via a doctor's invitation</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="fullName" placeholder="John Smith" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
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
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} disabled={accountCreated} />
              </div>
            </div>
          </div>
        );
      case 1: // Personal Info
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="flex gap-2">
                <CountrySelector />
                <Input placeholder="82 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1" />
              </div>
              <p className="text-xs text-muted-foreground">Language will be set to: {selectedCountry.lang}</p>
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Physical Address</Label>
              <Textarea placeholder="123 Main Street, Suburb, City, 1234" value={physicalAddress} onChange={(e) => setPhysicalAddress(e.target.value)} rows={2} />
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="sameAsPhysical" checked={sameAsPhysical} onChange={(e) => setSameAsPhysical(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <Label htmlFor="sameAsPhysical" className="text-sm">Postal address same as physical</Label>
            </div>
            {!sameAsPhysical && (
              <div className="space-y-2">
                <Label>Postal Address</Label>
                <Textarea placeholder="PO Box 123, Suburb, City, 1234" value={postalAddress} onChange={(e) => setPostalAddress(e.target.value)} rows={2} />
              </div>
            )}
          </div>
        );
      case 2: // Employment
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Employer</Label>
                <Input placeholder="Company name" value={employer} onChange={(e) => setEmployer(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Occupation</Label>
                <Input placeholder="Your job title" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Referred By</Label>
              <Input placeholder="Doctor or person who referred you" value={referredBy} onChange={(e) => setReferredBy(e.target.value)} />
            </div>
          </div>
        );
      case 3: // Insurance
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Medical Insurance Provider</Label>
                <Input placeholder="e.g., Discovery Health" value={medicalInsurance} onChange={(e) => setMedicalInsurance(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Insurance Product</Label>
                <Input placeholder="e.g., Executive Plan" value={medicalInsuranceProduct} onChange={(e) => setMedicalInsuranceProduct(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Membership Number</Label>
              <Input placeholder="Membership number" value={medicalInsuranceNumber} onChange={(e) => setMedicalInsuranceNumber(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Primary Member</Label>
                <Input placeholder="Main member name" value={primaryMember} onChange={(e) => setPrimaryMember(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>General Practitioner</Label>
                <Input placeholder="Your GP's name" value={generalPractitioner} onChange={(e) => setGeneralPractitioner(e.target.value)} />
              </div>
            </div>
          </div>
        );
      case 4: // Next of Kin
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Allergies</Label>
              <Textarea placeholder="List any allergies (medications, food, etc.)" value={allergies} onChange={(e) => setAllergies(e.target.value)} rows={2} />
            </div>
            <h3 className="text-sm font-medium text-foreground pt-2 border-t border-border">Next of Kin</h3>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="Emergency contact name" value={nextOfKinName} onChange={(e) => setNextOfKinName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="082 123 4567" value={nextOfKinPhone} onChange={(e) => setNextOfKinPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@example.com" value={nextOfKinEmail} onChange={(e) => setNextOfKinEmail(e.target.value)} />
              </div>
            </div>
          </div>
        );
      case 5: // Terms
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
                <img src={holarcLogo} alt="Holarc Health" className="h-[62px] w-auto" />
              </button>
              <h1 className="text-2xl font-bold text-foreground">Holarc</h1>
              <p className="text-muted-foreground mt-2">Sign In</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign In
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button type="button" onClick={() => navigate("/forgot-password")} className="text-sm text-muted-foreground hover:text-primary hover:underline">Forgot your password?</button>
              </div>
              <div className="mt-4 text-center">
                <button type="button" onClick={() => { setIsLogin(false); setCurrentStep(0); }} className="text-sm text-primary hover:underline">Don't have an account? Sign up</button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Signup wizard
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <button type="button" onClick={() => navigate("/")} className="flex justify-center mb-4 mx-auto hover:opacity-80 transition-opacity">
              <img src={holarcLogo} alt="Holarc Health" className="h-[62px] w-auto" />
            </button>
            <h1 className="text-2xl font-bold text-foreground">Holarc</h1>
            <p className="text-muted-foreground mt-1">{userRole === "doctor" ? "Healthcare Provider" : "Patient"} Registration</p>
          </div>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Step {currentStep + 1} of {totalSteps}</span>
              <span>{steps[currentStep]}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-2">
              {steps.map((step, i) => (
                <div key={step} className={`h-2 w-2 rounded-full ${i <= currentStep ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm max-h-[60vh] overflow-y-auto">
            {userRole === "doctor" ? renderDoctorStep() : renderPatientStep()}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-4 gap-3">
            <Button
              variant="outline"
              onClick={currentStep === 0 ? () => setIsLogin(true) : handlePrev}
              disabled={loading}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              {currentStep === 0 ? "Sign In" : "Back"}
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleFinalSubmit}
                disabled={loading || !acceptedTerms}
                className="gap-1 flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Free Trial
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={loading} className="gap-1 flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="mt-3 text-center">
            <button type="button" onClick={() => { setIsLogin(true); setCurrentStep(0); }} className="text-sm text-primary hover:underline">Already have an account? Sign in</button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
