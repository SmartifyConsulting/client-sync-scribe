import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Building2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import hospitalIcon from "@/assets/marker-hospital.png";
import ambulanceIcon from "@/assets/marker-ambulance.png";
import { toast } from "sonner";

type ProviderType = "hospital" | "ambulance";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callFn(name: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data;
}

export default function ProviderSignup() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<ProviderType>("ambulance");

  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !email || !password || !firstName || !lastName) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!acceptedTerms) {
      toast.error("You must accept the Terms and Conditions");
      return;
    }
    setSubmitting(true);
    try {
      // Minimal signup. Address, registration number, ownership and the rest
      // are completed later from the provider's profile screen.
      await callFn("register-emergency-provider", {
        type,
        ownership: "private",
        company_name: companyName,
        registration_number: null,
        address: null,
        city: null,
        country: null,
        latitude: null,
        longitude: null,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
      });
      toast.success(
        "Application submitted! Verify your email, then sign in to complete your profile. An administrator will activate your account before you can access the dispatch portal."
      );
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
        <Link to="/auth">
          <Button size="sm" variant="ghost">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to sign-in
          </Button>
        </Link>
        <div className="text-center">
          <Building2 className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-2 text-2xl font-extrabold">Emergency Service Provider Sign-Up</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your account in two steps. You'll fill in the rest of your organisation's details from your profile after signing in.
          </p>
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
                    <span className="text-sm font-medium">ER Provider</span>
                  </Label>
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
                <Label>Organisation name</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={type === "hospital" ? "Mediclinic Sandton" : "Emergency ER"}
                  required
                />
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
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
                <Checkbox
                  id="accept-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(v) => setAcceptedTerms(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="accept-terms" className="text-xs leading-relaxed cursor-pointer">
                  I accept the{" "}
                  <Link to="/terms" className="text-primary hover:underline" target="_blank">
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                    Privacy Policy
                  </Link>
                  .
                </Label>
              </div>

              <Button type="submit" className="w-full h-11" disabled={submitting || !acceptedTerms}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create account
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                After signing in you'll complete your organisation's address, registration number and service details. An administrator will then review and activate your account before dispatch is enabled.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
