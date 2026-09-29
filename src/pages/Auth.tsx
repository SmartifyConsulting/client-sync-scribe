import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import holarcLogoAsset from "@/assets/holarc-wealth-logo.png.asset.json";
const holarcLogo = holarcLogoAsset.url;
import {
  Mail, Lock, Loader2, User, Building2, MapPin, Plus, Trash2, Phone,
  Briefcase as Stethoscope, PenTool, UserCircle, Camera, ChevronLeft, ChevronRight, Globe,
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
import { lovable } from "@/integrations/lovable/index";

import { TrialSignupSection } from "@/components/auth/TrialSignupSection";
import { Footer } from "@/components/layout/Footer";
import { Progress } from "@/components/ui/progress";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";


import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { cn } from "@/lib/utils";
import { ShieldCheck, KeyRound } from "lucide-react";

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
  const { user, loading: authLoading, signIn, signUp, signInWithOtp, verifyOtp } = useAuth();

  // If someone is already logged in, never show the sign-in/sign-up forms —
  // send them straight to their dashboard so they can't accidentally create
  // a second account. Anyone wanting a different phone/email uses Settings.
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, user, navigate]);
  
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
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: "Google sign-in failed", description: result.error.message, variant: "destructive" });
        return;
      }
      if (result.redirected) return;
      navigate("/dashboard");
    } catch (e) {
      toast({ title: "Google sign-in failed", description: e instanceof Error ? e.message: "Unknown error", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const [breachedPassword, setBreachedPassword] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  // Signup: pick email or phone identifier
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("email");
  // Sign-in: pick email or phone
  const [loginTab, setLoginTab] = useState<"email" | "phone">("email");
  const [loginPhone, setLoginPhone] = useState("");

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setTimeout(() => setOtpCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCooldown]);

  const [userRole, setUserRole] = useState<UserRole>(roleParam || "patient");
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
    if (!password || password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
      return false;
    }
    if (signupMethod === "email" && !email) {
      toast({ title: "Email required", variant: "destructive" });
      return false;
    }
    const phoneInput = userRole === "doctor" ? mobileNumber : phone;
    if (signupMethod === "phone" && !phoneInput.trim()) {
      toast({ title: "Phone number required", variant: "destructive" });
      return false;
    }
    if (userRole === "doctor") {
      if (!practiceNumber.trim() || !doctorNumber.trim()) {
        toast({
          title: "Registration details required",
          description: "Please enter both your FSP Number and your License / Wealth Manager Registration Number to continue.",
          variant: "destructive",
        });
        return false;
      }
    }

    setLoading(true);
    try {
      let result;
      if (signupMethod === "email") {
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, role: userRole },
          },
        });
      } else {
        // Phone sign-up without SMS: use a synthetic email derived from the
        // normalized phone number so Supabase never invokes an SMS provider.
        const e164 = normalizePhone(phoneInput);
        const fullPhone = `${countryCode}${phoneInput.replace(/\s+/g, "")}`;
        // Pre-check: prevent duplicate phone numbers
        const { data: existingPhone } = await supabase
          .from("profiles")
          .select("id")
          .eq("mobile_number", fullPhone)
          .maybeSingle();
        if (existingPhone) {
          toast({
            title: "Phone number already registered",
            description: "This phone number is already in use. Please sign in instead.",
            variant: "destructive",
          });
          setLoading(false);
          return false;
        }
        const syntheticEmail = phoneToSyntheticEmail(e164);
        result = await supabase.auth.signUp({
          email: syntheticEmail,
          password,
          options: { data: { full_name: fullName, role: userRole, phone: e164 } },
        });
      }
      const { data, error } = result;
      if (error) throw error;
      if (data?.user) {
        setCreatedUserId(data.user.id);
        setAccountCreated(true);
        return true;
      }
      return false;
    } catch (error: any) {
      const raw = error?.message || "";
      const code = error?.code || "";
      const isBreached =
        code === "weak_password" ||
        /known to be weak|pwned|breach|leaked/i.test(raw);
      if (isBreached) {
        setBreachedPassword(true);
        setPassword("");
        setTimeout(() => document.getElementById("password")?.focus(), 0);
        toast({
          title: "Choose a different password",
          description: "This password has appeared in a known data breach. Even though it looks strong, it's unsafe to reuse. Please pick a unique password you haven't used elsewhere.",
          variant: "destructive",
        });
        return false;
      }
      const msg = /duplicate|unique|already/i.test(raw)
        ? "This phone number or email is already registered. Please sign in instead."
        : raw;
      toast({ title: "Sign-up failed", description: msg, variant: "destructive" });
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

      // Make sure the freshly minted access token is attached before any storage upload.
      await supabase.auth.getSession();

      // Upload optional profile picture (now that the user is authenticated).
      const avatarUrl = avatarFile ? await uploadAvatar(userId) : null;

      // Update profile with the few fields we collect at signup
      const profileUpdate: Record<string, any> = {
        full_name: fullName,
        role: userRole,
        mailbox_alias: baseAlias,
        mobile_number: fullPhone,
        preferred_language: preferredLanguage,
      };
      if (avatarUrl) profileUpdate.avatar_url = avatarUrl;
      if (userRole === "doctor") {
        profileUpdate.practice_number = practiceNumber.trim();
        profileUpdate.doctor_number = doctorNumber.trim();
      }
      await supabase.from("profiles").update(profileUpdate).eq("id", userId);

      if (userRole === "doctor") {
        supabase.functions.invoke("generate-about-me", { body: { notes: "" } })
          .then(async ({ data, error }) => {
            if (error) throw error;
            const aboutMe = (data as any)?.about_me?.trim();
            if (!aboutMe) return;
            await supabase.from("profiles").update({ about_me: aboutMe } as any).eq("id", userId).is("about_me", null);
          })
          .catch((error) => console.error("Auto About Me generation failed:", error));
      }


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
                email: email || null,
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
          // Non-invited patient: minimal patient record so MyDetails has something to edit.
          // Errors here (including a 23505 unique-violation if another flow,
          // e.g. MyDetails' own self-heal, concurrently created this user's
          // record first) are intentionally not fatal to signup — MyDetails
          // will find/use whichever record exists on next load either way.
          await supabase.from("patients").insert({
            user_id: userId,
            patient_user_id: userId,
            name: fullName,
            email: email || null,
            phone: fullPhone,
          });
        }
      }

      // MVP: no trial/subscription row created at signup — users get full access without countdowns.

      clearDraft();
      toast({
        title: "Account created!",
        description: "You're all set — let's continue.",
      });
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

  // SMS is not used anywhere in this app — phone-as-identifier is mapped to
  // a deterministic synthetic email so the Supabase Auth server never tries
  // to dispatch an SMS. Authenticator-app TOTP (handled by MfaGate) is the
  // single second factor for every user.
  const phoneToSyntheticEmail = (e164: string) => {
    const digits = e164.replace(/\D/g, "");
    return `${digits}@phone.holarc.local`;
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const isPhone = loginTab === "phone";
    const id = isPhone
      ? `${countryCode}${loginPhone.replace(/\s+/g, "")}`
      : loginId.trim();
    if ((isPhone ? !loginPhone.trim() : !id) || !password) {
      toast({
        title: "Required",
        description: isPhone ? "Enter your phone number and password" : "Enter your email and password",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const credentials = !isPhone
        ? { email: id, password }
        : { email: phoneToSyntheticEmail(normalizePhone(id)), password };
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
      <SelectTrigger className="w-[110px] [&>span]:line-clamp-none">
        <SelectValue>
          <span className="whitespace-nowrap">{selectedCountry.flag} {selectedCountry.code}</span>
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
              <Label htmlFor="user-type-doctor-step">I am a...</Label>
              <Select
                value={userRole}
                onValueChange={(v) => {
                  if (v === "patient" || v === "doctor") {
                    setUserRole(v as UserRole);
                  } else if (v === "fsp") {
                    setUserRole("doctor" as UserRole);
                  } else {
                    navigate(`/provider-signup?kind=${v}`);
                  }
                }}
              >
                <SelectTrigger id="user-type-doctor-step">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Client</SelectItem>
                  <SelectItem value="doctor">Wealth Manager</SelectItem>
                  <SelectItem value="fsp">FSP / Key Individual</SelectItem>
                  <SelectItem value="insurance">Insurer</SelectItem>
                </SelectContent>
              </Select>
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
              <Label>Profile Picture (optional)</Label>
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16 border-2 border-primary/40">
                  {avatarPreview && <AvatarImage src={avatarPreview} alt="Profile preview" />}
                  <AvatarFallback>
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()}>
                    {avatarPreview ? "Change photo" : "Upload photo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">Shown on your profile and to clients.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="practiceNumber">FSP Number <span className="text-destructive">*</span></Label>
                <Input
                  id="practiceNumber"
                  placeholder="e.g. 0123456"
                  value={practiceNumber}
                  onChange={(e) => setPracticeNumber(e.target.value)}
                  required
                  disabled={accountCreated}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctorNumber">License / Registration No. <span className="text-destructive">*</span></Label>
                <Input
                  id="doctorNumber"
                  placeholder="e.g. MP123456"
                  value={doctorNumber}
                  onChange={(e) => setDoctorNumber(e.target.value)}
                  required
                  disabled={accountCreated}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sign up with</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => !accountCreated && setSignupMethod("email")} disabled={accountCreated}
                  className={`rounded-lg border-2 p-2 text-xs font-medium ${signupMethod === "email" ? "border-primary bg-primary/10" : "border-muted bg-popover hover:bg-accent"}`}>
                  <Mail className="h-4 w-4 mx-auto mb-1" /> Email
                </button>
                <button type="button" onClick={() => !accountCreated && setSignupMethod("phone")} disabled={accountCreated}
                  className={`rounded-lg border-2 p-2 text-xs font-medium ${signupMethod === "phone" ? "border-primary bg-primary/10" : "border-muted bg-popover hover:bg-accent"}`}>
                  <Phone className="h-4 w-4 mx-auto mb-1" /> Phone Number
                </button>
              </div>
            </div>
            {signupMethod === "email" ? (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required disabled={accountCreated} />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Phone Number (used to sign in)</Label>
                <div className="flex gap-2">
                  <CountrySelector />
                  <Input placeholder="82 123 4567" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className="flex-1" required disabled={accountCreated} />
                </div>
                {mobileNumber && <p className="text-xs text-muted-foreground">Account ID: {normalizePhone(mobileNumber)}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); if (breachedPassword) setBreachedPassword(false); }} className={cn("pl-10 pr-10", breachedPassword && "border-destructive focus-visible:ring-destructive")} required minLength={6} disabled={accountCreated} aria-invalid={breachedPassword} />
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
              <Label htmlFor="user-type-patient-step">I am a...</Label>
              <Select
                value={userRole}
                disabled={!!inviteToken}
                onValueChange={(v) => {
                  if (v === "patient" || v === "doctor") {
                    setUserRole(v as UserRole);
                  } else if (v === "fsp") {
                    setUserRole("doctor" as UserRole);
                  } else {
                    navigate(`/provider-signup?kind=${v}`);
                  }
                }}
              >
                <SelectTrigger id="user-type-patient-step">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Client</SelectItem>
                  <SelectItem value="doctor">Wealth Manager</SelectItem>
                  <SelectItem value="fsp">FSP / Key Individual</SelectItem>
                  <SelectItem value="insurance">Insurer</SelectItem>
                </SelectContent>
              </Select>
              {inviteToken && <p className="text-xs text-muted-foreground mt-2">You're registering via a wealth manager's invitation</p>}
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
              <Label>Sign up with</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => !accountCreated && setSignupMethod("email")} disabled={accountCreated}
                  className={`rounded-lg border-2 p-2 text-xs font-medium ${signupMethod === "email" ? "border-primary bg-primary/10" : "border-muted bg-popover hover:bg-accent"}`}>
                  <Mail className="h-4 w-4 mx-auto mb-1" /> Email
                </button>
                <button type="button" onClick={() => !accountCreated && setSignupMethod("phone")} disabled={accountCreated}
                  className={`rounded-lg border-2 p-2 text-xs font-medium ${signupMethod === "phone" ? "border-primary bg-primary/10" : "border-muted bg-popover hover:bg-accent"}`}>
                  <Phone className="h-4 w-4 mx-auto mb-1" /> Phone Number
                </button>
              </div>
            </div>
            {signupMethod === "email" ? (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required disabled={accountCreated} />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Phone Number (used to sign in)</Label>
                <div className="flex gap-2">
                  <CountrySelector />
                  <Input placeholder="82 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1" required disabled={accountCreated} />
                </div>
                {phone && <p className="text-xs text-muted-foreground">Account ID: {normalizePhone(phone)}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); if (breachedPassword) setBreachedPassword(false); }} className={cn("pl-10 pr-10", breachedPassword && "border-destructive focus-visible:ring-destructive")} required minLength={6} disabled={accountCreated} aria-invalid={breachedPassword} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={password} breached={breachedPassword} />
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

  // Already signed in — never show sign-in/sign-up while a session exists.
  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Login form
  if (isLogin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <button type="button" onClick={() => navigate("/")} className="flex justify-center mb-4 mx-auto hover:opacity-80 transition-opacity">
                <img src={holarcLogo} alt="Indigro" className="h-[117px] w-auto" />
              </button>
            </div>
            {/* Sign In / Sign Up tabs */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 mb-4">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={cn(
                  "rounded-lg py-2 text-sm font-semibold transition-colors",
                  isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setCurrentStep(0); setAccountCreated(false); }}
                className={cn(
                  "rounded-lg py-2 text-sm font-semibold transition-colors",
                  !isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign Up
              </button>
            </div>
            <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">

              {!useOtp ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Email / Phone tab switch */}
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setLoginTab("email")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors",
                        loginTab === "email" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Mail className="h-3.5 w-3.5" /> Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginTab("phone")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors",
                        loginTab === "phone" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Phone className="h-3.5 w-3.5" /> Phone
                    </button>
                  </div>

                  {loginTab === "email" ? (
                    <div className="space-y-2">
                      <Label htmlFor="loginId">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="loginId"
                          type="email"
                          inputMode="email"
                          autoComplete="username"
                          placeholder="you@example.com"
                          value={loginId}
                          onChange={(e) => setLoginId(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="loginPhone">Phone number</Label>
                      <div className="flex gap-2">
                        <CountrySelector />
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="loginPhone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="82 123 4567"
                            value={loginPhone}
                            onChange={(e) => setLoginPhone(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      {loginPhone.trim() && (
                        <p className="text-xs text-muted-foreground">
                          You'll sign in as {normalizePhone(`${countryCode}${loginPhone}`)}
                        </p>
                      )}
                    </div>
                  )}

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
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                </div>
                <Button type="button" variant="outline" className="w-full" disabled={googleLoading} onClick={handleGoogleSignIn}>
                  {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z" />
                      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24z" />
                      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6v-3.1h-4a12 12 0 0 0 0 10.8l4-3.1z" />
                      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
                    </svg>
                  )}
                  Continue with Google
                </Button>

                <button
                  type="button"
                  onClick={() => { setUseOtp(!useOtp); setOtpSent(false); setOtpCode(""); setPassword(""); }}
                  className="block w-full text-center text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  {useOtp ? "Sign in with password instead" : "Prefer a one-time code? Email it to me"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/provider-signup")}
                  className="block w-full text-center text-xs font-medium text-primary hover:underline pt-2"
                >
                  Registering a hospital, emergency service or insurance company? Onboard your organisation →
                </button>
              </div>
            </div>
            {/* Trust band — moved to bottom of sign-in box */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Lock className="h-3.5 w-3.5 text-primary" /> Your data is encrypted
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                <KeyRound className="h-3.5 w-3.5 text-primary" /> 2FA required
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> HIPAA-aligned
              </span>
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
              <img src={holarcLogo} alt="Indigro" className="h-[117px] w-auto" />
            </button>
          </div>
          {/* Sign In / Sign Up tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 mb-4">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={cn(
                "rounded-lg py-2 text-sm font-semibold transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={cn(
                "rounded-lg py-2 text-sm font-semibold transition-colors",
                "bg-card text-foreground shadow-sm"
              )}
            >
              Sign Up
            </button>
          </div>
          <div className="text-center mb-3">
            <div className="mt-1"><Progress value={progress} className="h-1.5" /></div>
            <p className="text-xs text-muted-foreground mt-1">Step {currentStep + 1} of {totalSteps}: {steps[currentStep]}</p>
          </div>
          <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">
            {userRole === "doctor" ? renderDoctorStep() : renderPatientStep()}
            <div className="flex gap-2 mt-6">
              {currentStep > 0 && (
                <Button type="button" variant="outline" onClick={handlePrev} disabled={loading} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              {!isLastStep ? (
                <Button type="button" onClick={handleNext} disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="button" onClick={handleFinalSubmit} disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              )}
            </div>
          </div>
          {/* Trust band — bottom of signup box */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Lock className="h-3.5 w-3.5 text-primary" /> Your data is encrypted
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
              <KeyRound className="h-3.5 w-3.5 text-primary" /> 2FA required
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> HIPAA-aligned
            </span>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

