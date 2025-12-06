import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, User, Building2, MapPin, Plus, Trash2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface PartnerInput {
  full_name: string;
  registration_number: string;
  mobile_number: string;
}

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Registration fields
  const [fullName, setFullName] = useState("");
  const [practiceNumber, setPracticeNumber] = useState("");
  const [doctorNumber, setDoctorNumber] = useState("");
  const [practiceAddress, setPracticeAddress] = useState("");
  const [partners, setPartners] = useState<PartnerInput[]>([]);
  const [newPartner, setNewPartner] = useState<PartnerInput>({ full_name: "", registration_number: "", mobile_number: "" });

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
        
        // Update profile with additional info
        if (data?.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: fullName,
              practice_number: practiceNumber,
              doctor_number: doctorNumber,
              practice_address: practiceAddress,
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
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground mb-4">Practice Information</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="fullName"
                          placeholder="Dr. John Smith"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10"
                        />
                      </div>
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
