import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Loader2, User, Building2, MapPin, Plus, Trash2, Phone, Stethoscope, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Role selection
  const [userRole, setUserRole] = useState<UserRole>("doctor");
  
  // Doctor registration fields
  const [fullName, setFullName] = useState("");
  const [practiceNumber, setPracticeNumber] = useState("");
  const [doctorNumber, setDoctorNumber] = useState("");
  const [practiceAddress, setPracticeAddress] = useState("");
  const [partners, setPartners] = useState<PartnerInput[]>([]);
  const [newPartner, setNewPartner] = useState<PartnerInput>({ full_name: "", registration_number: "", mobile_number: "" });

  // Patient registration fields
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [postalAddress, setPostalAddress] = useState("");
  const [sameAsPhysical, setSameAsPhysical] = useState(false);
  const [employer, setEmployer] = useState("");
  const [occupation, setOccupation] = useState("");
  const [medicalAid, setMedicalAid] = useState("");
  const [medicalAidNumber, setMedicalAidNumber] = useState("");
  const [primaryMember, setPrimaryMember] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [nextOfKinEmail, setNextOfKinEmail] = useState("");
  const [generalPractitioner, setGeneralPractitioner] = useState("");
  const [allergies, setAllergies] = useState("");
  const [referredBy, setReferredBy] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: "Welcome back!", description: "Successfully signed in" });
        navigate("/");
      } else {
        // Sign up with additional metadata
        const { data, error } = await signUp(email, password);
        if (error) throw error;
        
        if (data?.user) {
          // Insert user role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: data.user.id,
              role: userRole,
            });

          if (roleError) {
            console.error('Role insert error:', roleError);
          }

          if (userRole === "doctor") {
            // Update profile with doctor info
            const { error: profileError } = await supabase
              .from('profiles')
              .update({
                full_name: fullName,
                practice_number: practiceNumber,
                doctor_number: doctorNumber,
                practice_address: practiceAddress,
                role: userRole,
              })
              .eq('id', data.user.id);

            if (profileError) {
              console.error('Profile update error:', profileError);
            }

            // Add partners if any
            if (partners.length > 0) {
              const partnersToInsert = partners.map(p => ({
                user_id: data.user.id,
                full_name: p.full_name,
                registration_number: p.registration_number,
                mobile_number: p.mobile_number || null,
              }));

              const { error: partnersError } = await supabase
                .from('practice_partners')
                .insert(partnersToInsert);

              if (partnersError) {
                console.error('Partners insert error:', partnersError);
              }
            }
          } else {
            // Patient registration - update profile
            const { error: profileError } = await supabase
              .from('profiles')
              .update({
                full_name: fullName,
                role: userRole,
              })
              .eq('id', data.user.id);

            if (profileError) {
              console.error('Profile update error:', profileError);
            }

            // If there's an invite token, update the invitation and link to the patient record
            if (inviteToken) {
              // Get the invitation details
              const { data: invitation, error: inviteError } = await supabase
                .from('patient_invitations')
                .select('*')
                .eq('token', inviteToken)
                .eq('status', 'pending')
                .single();

              if (!inviteError && invitation) {
                // Update invitation status
                await supabase
                  .from('patient_invitations')
                  .update({ status: 'accepted' })
                  .eq('id', invitation.id);

                // Link user to patient record if it exists
                if (invitation.patient_id) {
                  // Update the patient record with patient_user_id and additional info from registration
                  await supabase
                    .from('patients')
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
                      medical_aid: medicalAid,
                      medical_aid_number: medicalAidNumber,
                      primary_member: primaryMember,
                      next_of_kin_name: nextOfKinName,
                      next_of_kin_phone: nextOfKinPhone,
                      next_of_kin_email: nextOfKinEmail,
                      general_practitioner: generalPractitioner,
                      allergies: allergies,
                      referred_by: referredBy,
                    })
                    .eq('id', invitation.patient_id);
                }

                // Create doctor-patient access with default permissions
                await supabase
                  .from('doctor_patient_access')
                  .insert({
                    doctor_id: invitation.doctor_id,
                    patient_user_id: data.user.id,
                    permissions: ['patient_info', 'calendar', 'session_summaries', 'prescription_history'],
                    is_active: true,
                  });
              }
            }
          }
        }
        
        toast({ title: "Account created!", description: "You can now sign in" });
        navigate("/");
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <span className="text-2xl font-bold text-primary-foreground">M</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">MedPad</h1>
          <p className="text-muted-foreground mt-2">
            {isLogin ? "Sign in to your account" : "Create a new account"}
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
                    <p className="text-xs text-muted-foreground mt-2">
                      You're registering via a doctor's invitation
                    </p>
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
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-sm font-medium text-foreground mb-4">Practice Information</h3>
                      
                      <div className="space-y-4">
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
                      <p className="text-xs text-muted-foreground mb-4">
                        Add partners of the same practice
                      </p>

                      {/* Existing Partners */}
                      {partners.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {partners.map((partner, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border text-sm">
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
                          <Label htmlFor="partnerName" className="text-xs">Partner Full Name</Label>
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
                            <Label htmlFor="partnerReg" className="text-xs">Registration Number</Label>
                            <Input 
                              id="partnerReg"
                              value={newPartner.registration_number}
                              onChange={(e) => setNewPartner({ ...newPartner, registration_number: e.target.value })}
                              placeholder="e.g., MP654321"
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="partnerMobile" className="text-xs">Mobile (Optional)</Label>
                            <Input 
                              id="partnerMobile"
                              value={newPartner.mobile_number}
                              onChange={(e) => setNewPartner({ ...newPartner, mobile_number: e.target.value })}
                              placeholder="082 123 4567"
                              className="h-9"
                            />
                          </div>
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={addPartner}
                          className="w-full gap-1"
                        >
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
                            <Input
                              id="dob"
                              type="date"
                              value={dob}
                              onChange={(e) => setDob(e.target.value)}
                            />
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
                          <Label htmlFor="sameAsPhysical" className="text-sm">Postal address same as physical</Label>
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

                    {/* Medical Aid Section */}
                    <div className="pt-4 border-t border-border">
                      <h3 className="text-sm font-medium text-foreground mb-4">Medical Aid Information</h3>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="medicalAid">Medical Aid Provider</Label>
                            <Input
                              id="medicalAid"
                              placeholder="e.g., Discovery Health"
                              value={medicalAid}
                              onChange={(e) => setMedicalAid(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="medicalAidNumber">Medical Aid Number</Label>
                            <Input
                              id="medicalAidNumber"
                              placeholder="Membership number"
                              value={medicalAidNumber}
                              onChange={(e) => setMedicalAidNumber(e.target.value)}
                            />
                          </div>
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
