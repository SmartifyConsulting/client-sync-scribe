import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import medipadLogo from "@/assets/medipad-logo.jpg";
import {
  Mail,
  Lock,
  Loader2,
  User,
  Building2,
  MapPin,
  Plus,
  Trash2,
  Phone,
  Stethoscope,
  PenTool,
  UserCircle,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TrialSignupSection } from "@/components/auth/TrialSignupSection";
import { Footer } from "@/components/layout/Footer";

const DOCTOR_SPECIALTIES = [
  "General Practitioner",
  "Cardiologist",
  "Dermatologist",
  "Endocrinologist",
  "Gastroenterologist",
  "Neurologist",
  "Oncologist",
  "Ophthalmologist",
  "Orthopaedics",
  "Paediatrician",
  "Psychiatrist",
  "Pulmonologist",
  "Radiologist",
  "Rheumatologist",
  "Urologist",
  "Other",
];

interface PartnerInput {
  full_name: string;
  registration_number: string;
  mobile_number: string;
}

type UserRole = "doctor" | "patient";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();
  
  // Read mode and role from URL params
  const modeParam = searchParams.get("mode");
  const roleParam = searchParams.get("role") as UserRole | null;
  
  const [isLogin, setIsLogin] = useState(modeParam !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Role selection - default from URL param or doctor
  const [userRole, setUserRole] = useState<UserRole>(roleParam || "doctor");

  // Doctor registration fields
  const [fullName, setFullName] = useState("");
  const [practiceNumber, setPracticeNumber] = useState("");
  const [doctorNumber, setDoctorNumber] = useState("");
  const [practiceAddress, setPracticeAddress] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [partners, setPartners] = useState<PartnerInput[]>([]);
  const [newPartner, setNewPartner] = useState<PartnerInput>({
    full_name: "",
    registration_number: "",
    mobile_number: "",
  });

  // Patient registration fields
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

  // Terms and trial acceptance
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Invitation token
  const inviteToken = searchParams.get("invite");

  useEffect(() => {
    if (inviteToken) {
      setIsLogin(false);
      setUserRole("patient");
    }
  }, [inviteToken]);

  const addPartner = () => {
    if (!newPartner.full_name.trim() || !newPartner.registration_number.trim()) {
      toast({
        title: "Missing fields",
        description: "Partner name and registration number are required",
        variant: "destructive",
      });
      return;
    }
    setPartners([...partners, newPartner]);
    setNewPartner({ full_name: "", registration_number: "", mobile_number: "" });
  };

  const removePartner = (index: number) => {
    setPartners(partners.filter((_, i) => i !== index));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;
    
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true });
    
    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return null;
    }
    
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadSignature = async (userId: string): Promise<string | null> => {
    if (!signatureFile) return null;
    
    const fileExt = signatureFile.name.split('.').pop();
    const fileName = `${userId}/signature.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, signatureFile, { upsert: true });
    
    if (uploadError) {
      console.error('Signature upload error:', uploadError);
      return null;
    }
    
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: "Welcome back!", description: "Successfully signed in" });
        navigate("/dashboard");
      } else {
        // Validate terms acceptance for signup
        if (!acceptedTerms) {
          toast({
            title: "Terms Required",
            description: "You must accept the Terms and Conditions to create an account",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Sign up with additional metadata
        const { data, error } = await signUp(email, password);
        if (error) throw error;

        if (data?.user) {
          // Insert user role
          const { error: roleError } = await supabase.from("user_roles").insert({
            user_id: data.user.id,
            role: userRole,
          });

          if (roleError) {
            console.error("Role insert error:", roleError);
          }

          if (userRole === "doctor") {
            // Upload avatar if provided
            let avatarUrl: string | null = null;
            if (avatarFile) {
              avatarUrl = await uploadAvatar(data.user.id);
            }

            // Upload signature if provided
            let signatureUrl: string | null = null;
            if (signatureFile) {
              signatureUrl = await uploadSignature(data.user.id);
            }

            // Auto-generate mailbox alias from name
            const nameParts = fullName.trim().toLowerCase().split(/\s+/);
            const firstName = nameParts[0] || "user";
            const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
            const year = new Date().getFullYear();
            const mailboxAlias = lastName 
              ? `${firstName}-${lastName}-${year}`.replace(/[^a-z0-9-]/g, '')
              : `${firstName}-${year}`.replace(/[^a-z0-9-]/g, '');

            // Update profile with doctor info
            const { error: profileError } = await supabase
              .from("profiles")
              .update({
                full_name: fullName,
                practice_number: practiceNumber,
                doctor_number: doctorNumber,
                practice_address: practiceAddress,
                specialty: specialty || null,
                avatar_url: avatarUrl,
                signature_url: signatureUrl,
                role: userRole,
                mailbox_alias: mailboxAlias,
              })
              .eq("id", data.user.id);

            if (profileError) {
              console.error("Profile update error:", profileError);
            }

            // Add partners if any
            if (partners.length > 0) {
              const partnersToInsert = partners.map((p) => ({
                user_id: data.user.id,
                full_name: p.full_name,
                registration_number: p.registration_number,
                mobile_number: p.mobile_number || null,
              }));

              const { error: partnersError } = await supabase.from("practice_partners").insert(partnersToInsert);

              if (partnersError) {
                console.error("Partners insert error:", partnersError);
              }
            }
          } else {
            // Patient registration - update profile
            const { error: profileError } = await supabase
              .from("profiles")
              .update({
                full_name: fullName,
                role: userRole,
              })
              .eq("id", data.user.id);

            if (profileError) {
              console.error("Profile update error:", profileError);
            }

            // If there's an invite token, update the invitation and link to the patient record
            if (inviteToken) {
              // Get the invitation details
              const { data: invitation, error: inviteError } = await supabase
                .from("patient_invitations")
                .select("*")
                .eq("token", inviteToken)
                .eq("status", "pending")
                .single();

              if (!inviteError && invitation) {
                // Update invitation status
                await supabase.from("patient_invitations").update({ status: "accepted" }).eq("id", invitation.id);

                // Link user to patient record if it exists
                if (invitation.patient_id) {
                  // Update the patient record with patient_user_id and additional info from registration
                  await supabase
                    .from("patients")
                    .update({
                      patient_user_id: data.user.id,
                      email: email,
                      phone: phone,
                      dob: dob || null,
                      physical_address: physicalAddress,
                      postal_address: sameAsPhysical ? physicalAddress : postalAddress,
                      same_as_physical: sameAsPhysical,
                      employer: employer,
                      occupation: occupation,
                      medical_aid: medicalInsurance,
                      medical_aid_number: medicalInsuranceNumber,
                      medical_insurance_product: medicalInsuranceProduct,
                      primary_member: primaryMember,
                      next_of_kin_name: nextOfKinName,
                      next_of_kin_phone: nextOfKinPhone,
                      next_of_kin_email: nextOfKinEmail,
                      general_practitioner: generalPractitioner,
                      allergies: allergies,
                      referred_by: referredBy,
                    })
                    .eq("id", invitation.patient_id);
                }

                // Create doctor-patient access with default permissions
                await supabase.from("doctor_patient_access").insert({
                  doctor_id: invitation.doctor_id,
                  patient_user_id: data.user.id,
                  permissions: ["patient_info", "calendar", "session_summaries", "prescription_history"],
                  is_active: true,
                });

                // Award signup bonus lollipop
                const { data: signupConfig } = await supabase
                  .from("gamification_config")
                  .select("lollipops_awarded")
                  .eq("visit_category", "Signup Bonus")
                  .eq("is_active", true)
                  .maybeSingle();

                const signupLollipops = signupConfig?.lollipops_awarded || 1;

                const { data: rewardData } = await supabase
                  .from("patient_rewards")
                  .insert({
                    patient_id: invitation.patient_id,
                    session_id: null,
                    reward_type: "lollipop",
                    visit_category: "Signup Bonus",
                    lollipops_count: signupLollipops,
                    awarded_by: data.user.id,
                  })
                  .select()
                  .single();

                // Create welcome notification
                if (rewardData) {
                  await supabase.from("notifications").insert({
                    user_id: data.user.id,
                    title: `🍭 Welcome! You earned ${signupLollipops} lollipop${signupLollipops > 1 ? "s" : ""}!`,
                    description: `Congratulations on signing up! You received ${signupLollipops} lollipop${signupLollipops > 1 ? "s" : ""} as a welcome bonus.`,
                    type: "reward",
                    reference_id: rewardData.id,
                  });
                }
              }
            }
          }
        }

        // Create trial subscription entry
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        if (data?.user) {
          const { error: subError } = await supabase.from("subscriptions").upsert({
            user_id: data.user.id,
            plan_type: userRole,
            billing_cycle: "monthly",
            status: "trial_pending",
            is_trial: true,
            trial_ends_at: trialEndsAt.toISOString(),
            accepted_terms_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

          if (subError) {
            console.error("Subscription creation error:", subError);
          }

          // Initiate PayPal subscription for trial
          try {
            const { data: paypalData, error: paypalError } = await supabase.functions.invoke(
              "paypal-subscription",
              {
                body: {
                  action: "create-trial",
                  planType: userRole,
                  billingCycle: "monthly",
                  userId: data.user.id,
                },
              }
            );

            if (paypalError) throw paypalError;

            if (paypalData?.approvalUrl) {
              toast({ 
                title: "Account created!", 
                description: "Redirecting to PayPal to set up your free trial..." 
              });
              window.location.href = paypalData.approvalUrl;
              return;
            }
          } catch (paypalErr) {
            console.error("PayPal trial setup error:", paypalErr);
            // Continue to dashboard even if PayPal fails - they can set it up later
          }
        }

        toast({ title: "Account created!", description: "Welcome to MediPad!" });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex justify-center mb-4 mx-auto hover:opacity-80 transition-opacity"
          >
            <img src={medipadLogo} alt="MediPad" className="h-[62px] w-auto" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">MediPad</h1>
          <p className="text-muted-foreground mt-2">
            {isLogin 
              ? `${userRole === "doctor" ? "Doctor" : "Patient"} Sign In` 
              : `${userRole === "doctor" ? "Healthcare Provider" : "Patient"} Registration`}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm max-h-[70vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Registration-only fields */}
            {!isLogin && (
              <>
                {/* Role Selection */}
                <div className="pt-4 border-t border-border">
                  <Label className="text-sm font-medium mb-3 block">I am a...</Label>
                  <RadioGroup
                    value={userRole}
                    onValueChange={(value) => setUserRole(value as UserRole)}
                    className="grid grid-cols-2 gap-3"
                    disabled={!!inviteToken}
                  >
                    <div className="relative">
                      <RadioGroupItem value="doctor" id="doctor" className="peer sr-only" />
                      <Label
                        htmlFor="doctor"
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <Stethoscope className="mb-2 h-6 w-6" />
                        <span className="text-sm font-medium">Healthcare Provider</span>
                      </Label>
                    </div>
                    <div className="relative">
                      <RadioGroupItem value="patient" id="patient" className="peer sr-only" />
                      <Label
                        htmlFor="patient"
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <UserCircle className="mb-2 h-6 w-6" />
                        <span className="text-sm font-medium">Patient</span>
                      </Label>
                    </div>
                  </RadioGroup>
                  {inviteToken && (
                    <p className="text-xs text-muted-foreground mt-2">You're registering via a doctor's invitation</p>
                  )}
                </div>

                {/* Common Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder={userRole === "doctor" ? "Dr. John Smith" : "John Smith"}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Doctor-specific fields */}
                {userRole === "doctor" && (
                  <>
                    {/* Profile Photo */}
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-sm font-medium text-foreground mb-4">Profile Photo</h3>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={avatarPreview || undefined} />
                          <AvatarFallback className="text-lg bg-muted">
                            {fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'DR'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <input
                            type="file"
                            ref={avatarInputRef}
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => avatarInputRef.current?.click()}
                            className="gap-2"
                          >
                            <Camera className="h-4 w-4" />
                            {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1">
                            JPG, PNG or GIF (max 2MB)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Electronic Signature */}
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-sm font-medium text-foreground mb-4">Electronic Signature</h3>
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-40 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                          {signaturePreview ? (
                            <img 
                              src={signaturePreview} 
                              alt="Signature preview" 
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <PenTool className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            ref={signatureInputRef}
                            accept="image/*"
                            onChange={handleSignatureChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => signatureInputRef.current?.click()}
                            className="gap-2"
                          >
                            <PenTool className="h-4 w-4" />
                            {signaturePreview ? 'Change Signature' : 'Upload Signature'}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG with transparent background recommended
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <h3 className="text-sm font-medium text-foreground mb-4">Practice Information</h3>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="specialty">Specialty</Label>
                          <Select value={specialty} onValueChange={setSpecialty}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your specialty" />
                            </SelectTrigger>
                            <SelectContent>
                              {DOCTOR_SPECIALTIES.map((spec) => (
                                <SelectItem key={spec} value={spec}>
                                  {spec}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="practiceNumber">Practice Number</Label>
                            <Input
                              id="practiceNumber"
                              placeholder="e.g., PR123456"
                              value={practiceNumber}
                              onChange={(e) => setPracticeNumber(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="doctorNumber">Doctor Registration Number</Label>
                            <Input
                              id="doctorNumber"
                              placeholder="e.g., MP123456"
                              value={doctorNumber}
                              onChange={(e) => setDoctorNumber(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="practiceAddress">Address of Doctor's Rooms</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Textarea
                              id="practiceAddress"
                              placeholder="123 Medical Centre, Suite 4, Cape Town, 8001"
                              value={practiceAddress}
                              onChange={(e) => setPracticeAddress(e.target.value)}
                              className="pl-10 min-h-[60px]"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Partners Section */}
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-sm font-medium text-foreground mb-2">Practice Partners (Optional)</h3>
                      <p className="text-xs text-muted-foreground mb-4">Add partners of the same practice</p>

                      {/* Existing Partners */}
                      {partners.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {partners.map((partner, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border text-sm"
                            >
                              <div>
                                <p className="font-medium text-foreground">{partner.full_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Reg: {partner.registration_number}
                                  {partner.mobile_number && ` · ${partner.mobile_number}`}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removePartner(index)}
                                className="h-7 w-7 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add New Partner */}
                      <div className="space-y-3 p-3 border border-dashed border-border rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="partnerName" className="text-xs">
                            Partner Full Name
                          </Label>
                          <Input
                            id="partnerName"
                            value={newPartner.full_name}
                            onChange={(e) => setNewPartner({ ...newPartner, full_name: e.target.value })}
                            placeholder="Dr. Jane Doe"
                            className="h-9"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor="partnerReg" className="text-xs">
                              Registration Number
                            </Label>
                            <Input
                              id="partnerReg"
                              value={newPartner.registration_number}
                              onChange={(e) => setNewPartner({ ...newPartner, registration_number: e.target.value })}
                              placeholder="e.g., MP654321"
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="partnerMobile" className="text-xs">
                              Mobile (Optional)
                            </Label>
                            <Input
                              id="partnerMobile"
                              value={newPartner.mobile_number}
                              onChange={(e) => setNewPartner({ ...newPartner, mobile_number: e.target.value })}
                              placeholder="082 123 4567"
                              className="h-9"
                            />
                          </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addPartner} className="w-full gap-1">
                          <Plus className="h-3 w-3" />
                          Add Partner
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Patient-specific fields */}
                {userRole === "patient" && (
                  <>
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-sm font-medium text-foreground mb-4">Personal Information</h3>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              placeholder="082 123 4567"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dob">Date of Birth</Label>
                            <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="physicalAddress">Physical Address</Label>
                          <Textarea
                            id="physicalAddress"
                            placeholder="123 Main Street, Suburb, City, 1234"
                            value={physicalAddress}
                            onChange={(e) => setPhysicalAddress(e.target.value)}
                            rows={2}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="sameAsPhysical"
                            checked={sameAsPhysical}
                            onChange={(e) => setSameAsPhysical(e.target.checked)}
                            className="h-4 w-4 rounded border-border"
                          />
                          <Label htmlFor="sameAsPhysical" className="text-sm">
                            Postal address same as physical
                          </Label>
                        </div>

                        {!sameAsPhysical && (
                          <div className="space-y-2">
                            <Label htmlFor="postalAddress">Postal Address</Label>
                            <Textarea
                              id="postalAddress"
                              placeholder="PO Box 123, Suburb, City, 1234"
                              value={postalAddress}
                              onChange={(e) => setPostalAddress(e.target.value)}
                              rows={2}
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="employer">Employer</Label>
                            <Input
                              id="employer"
                              placeholder="Company name"
                              value={employer}
                              onChange={(e) => setEmployer(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="occupation">Occupation</Label>
                            <Input
                              id="occupation"
                              placeholder="Your job title"
                              value={occupation}
                              onChange={(e) => setOccupation(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="referredBy">Referred By</Label>
                          <Input
                            id="referredBy"
                            placeholder="Doctor or person who referred you"
                            value={referredBy}
                            onChange={(e) => setReferredBy(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Medical Insurance Section */}
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-sm font-medium text-foreground mb-4">Medical Insurance Information</h3>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="medicalInsurance">Medical Insurance Provider</Label>
                            <Input
                              id="medicalInsurance"
                              placeholder="e.g., Discovery Health"
                              value={medicalInsurance}
                              onChange={(e) => setMedicalInsurance(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="medicalInsuranceProduct">Medical Insurance Product</Label>
                            <Input
                              id="medicalInsuranceProduct"
                              placeholder="e.g., Executive Plan"
                              value={medicalInsuranceProduct}
                              onChange={(e) => setMedicalInsuranceProduct(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="medicalInsuranceNumber">Medical Insurance Number</Label>
                          <Input
                            id="medicalInsuranceNumber"
                            placeholder="Membership number"
                            value={medicalInsuranceNumber}
                            onChange={(e) => setMedicalInsuranceNumber(e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="primaryMember">Primary Member</Label>
                            <Input
                              id="primaryMember"
                              placeholder="Main member name"
                              value={primaryMember}
                              onChange={(e) => setPrimaryMember(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="generalPractitioner">General Practitioner</Label>
                            <Input
                              id="generalPractitioner"
                              placeholder="Your GP's name"
                              value={generalPractitioner}
                              onChange={(e) => setGeneralPractitioner(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="allergies">Allergies</Label>
                          <Textarea
                            id="allergies"
                            placeholder="List any allergies (medications, food, etc.)"
                            value={allergies}
                            onChange={(e) => setAllergies(e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Next of Kin Section */}
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-sm font-medium text-foreground mb-4">Next of Kin</h3>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="nextOfKinName">Full Name</Label>
                          <Input
                            id="nextOfKinName"
                            placeholder="Emergency contact name"
                            value={nextOfKinName}
                            onChange={(e) => setNextOfKinName(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="nextOfKinPhone">Phone</Label>
                            <Input
                              id="nextOfKinPhone"
                              placeholder="082 123 4567"
                              value={nextOfKinPhone}
                              onChange={(e) => setNextOfKinPhone(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="nextOfKinEmail">Email</Label>
                            <Input
                              id="nextOfKinEmail"
                              type="email"
                              placeholder="email@example.com"
                              value={nextOfKinEmail}
                              onChange={(e) => setNextOfKinEmail(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Trial Signup Section - only show for signup */}
            {!isLogin && (
              <TrialSignupSection
                userRole={userRole}
                acceptedTerms={acceptedTerms}
                onAcceptedTermsChange={setAcceptedTerms}
              />
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || (!isLogin && !acceptedTerms)}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Sign In" : "Start Free Trial"}
            </Button>
          </form>

          {isLogin && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                Forgot your password?
              </button>
            </div>
          )}

          <div className="mt-4 text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
