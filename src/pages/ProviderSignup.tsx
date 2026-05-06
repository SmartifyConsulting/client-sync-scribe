import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Building2, ArrowLeft } from "lucide-react";
import hospitalIcon from "@/assets/marker-hospital.png";
import ambulanceIcon from "@/assets/marker-ambulance.png";
import { toast } from "sonner";

type ProviderType = "hospital" | "ambulance";
type Ownership = "public" | "private";

export default function ProviderSignup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<ProviderType>("ambulance");
  const [ownership, setOwnership] = useState<Ownership>("private");

  const [companyName, setCompanyName] = useState("");
  const [registration, setRegistration] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("South Africa");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !email || !password || !firstName || !lastName) {
      toast.error("Company name, contact name, email and password are required");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await signUp(email, password);
      if (error) throw error;
      const userId = data?.user?.id;
      if (!userId) throw new Error("Sign-up did not return a user");

      const fullName = `${firstName} ${lastName}`.trim();
      await supabase.from("profiles").update({ full_name: fullName, mobile_number: phone || null } as any).eq("id", userId);

      if (type === "hospital") {
        const { error: e2 } = await supabase.from("holarchelp_hospitals" as any).insert({
          owner_id: userId, name: companyName, registration_number: registration || null,
          contact_email: email, contact_phone: phone || null,
          address: address || null, city: city || null, country, ownership, status: "pending",
        } as any);
        if (e2) throw e2;
      } else {
        const { error: e2 } = await supabase.from("holarchelp_ambulance_providers" as any).insert({
          owner_id: userId, company_name: companyName, registration_number: registration || null,
          contact_email: email, contact_phone: phone || null,
          base_address: address || null, city: city || null, country, ownership, status: "pending",
        } as any);
        if (e2) throw e2;
      }

      toast.success("Application submitted! Awaiting admin approval.");
      navigate("/auth");
    } catch (err: any) {
      toast.error(err?.message ?? "Sign-up failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-8">
      <div className="mx-auto max-w-md space-y-4">
        <Link to="/auth"><Button size="sm" variant="ghost"><ArrowLeft className="mr-1 h-4 w-4" /> Back to sign-in</Button></Link>
        <div className="text-center">
          <Building2 className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-2 text-2xl font-extrabold">Emergency Service Provider Sign-Up</h1>
          <p className="mt-1 text-sm text-muted-foreground">Register your hospital or ambulance service.</p>
        </div>

        <Card>
          <CardContent className="p-5">
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Provider type</Label>
                <RadioGroup value={type} onValueChange={(v) => setType(v as ProviderType)} className="grid grid-cols-2 gap-3">
                  <Label htmlFor="t-hosp" className="flex flex-col items-center rounded-lg border-2 border-muted bg-popover p-3 cursor-pointer has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem value="hospital" id="t-hosp" className="sr-only" />
                    <img src={hospitalIcon} alt="" className="mb-2 h-8 w-8" />
                    <span className="text-sm font-medium">Hospital</span>
                  </Label>
                  <Label htmlFor="t-amb" className="flex flex-col items-center rounded-lg border-2 border-muted bg-popover p-3 cursor-pointer has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem value="ambulance" id="t-amb" className="sr-only" />
                    <img src={ambulanceIcon} alt="" className="mb-2 h-8 w-8" />
                    <span className="text-sm font-medium">Ambulance</span>
                  </Label>
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={type === "hospital" ? "Mediclinic Sandton" : "Emergency ER"} required />
              </div>

              <div className="space-y-1.5">
                <Label>Registration number</Label>
                <Input value={registration} onChange={(e) => setRegistration(e.target.value)} placeholder="e.g. 2019/123456/07" />
              </div>

              <div className="space-y-1.5">
                <Label>Address</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Street address" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Service type</Label>
                <RadioGroup value={ownership} onValueChange={(v) => setOwnership(v as Ownership)} className="grid grid-cols-2 gap-3">
                  <Label htmlFor="o-pub" className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 cursor-pointer has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem value="public" id="o-pub" className="sr-only" />
                    <span className="text-sm font-medium">Public</span>
                  </Label>
                  <Label htmlFor="o-priv" className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 cursor-pointer has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem value="private" id="o-priv" className="sr-only" />
                    <span className="text-sm font-medium">Private</span>
                  </Label>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Contact first name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Contact email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label>Contact phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27821234567" />
              </div>

              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              </div>

              <Button type="submit" className="w-full h-11" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit application
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Your account will be reviewed by an administrator before you can access the dispatch portal.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
