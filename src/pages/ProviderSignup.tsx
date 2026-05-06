import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Building2, ArrowLeft, MapPin } from "lucide-react";
import hospitalIcon from "@/assets/marker-hospital.png";
import ambulanceIcon from "@/assets/marker-ambulance.png";
import { toast } from "sonner";

type ProviderType = "hospital" | "ambulance";
type Ownership = "public" | "private";

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

interface Suggestion { description: string; place_id: string }

export default function ProviderSignup() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<ProviderType>("ambulance");
  const [ownership, setOwnership] = useState<Ownership>("private");

  const [companyName, setCompanyName] = useState("");
  const [registration, setRegistration] = useState("");

  const [addressInput, setAddressInput] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("South Africa");
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowSug(false);
    };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  const onAddressChange = (v: string) => {
    setAddressInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await callFn("places-autocomplete-public", { input: v });
        setSuggestions(data.predictions ?? []);
        setShowSug(true);
      } catch (e) {
        console.error(e);
      } finally { setSearching(false); }
    }, 350);
  };

  const pickSuggestion = async (s: Suggestion) => {
    setShowSug(false);
    setAddressInput(s.description);
    try {
      const d = await callFn("place-details-public", { place_id: s.place_id });
      if (d.formatted_address) setAddressInput(d.formatted_address);
      if (d.city) setCity(d.city);
      if (d.country) setCountry(d.country);
      if (typeof d.lat === "number" && typeof d.lng === "number") setCoords({ lat: d.lat, lng: d.lng });
      if (d.name && !companyName) setCompanyName(d.name);
      if (d.phone && !phone) setPhone(d.phone);
    } catch (e) {
      console.error(e);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !email || !password || !firstName || !lastName || !addressInput) {
      toast.error("Please fill in all required fields including address");
      return;
    }
    setSubmitting(true);
    try {
      await callFn("register-emergency-provider", {
        type, ownership,
        company_name: companyName,
        registration_number: registration,
        address: addressInput, city, country,
        latitude: coords.lat, longitude: coords.lng,
        first_name: firstName, last_name: lastName,
        email, phone, password,
      });
      toast.success("Application submitted! Verify your email, then sign in. An administrator must also activate your account before you can access the dispatch portal.");
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

              <div className="space-y-1.5" ref={wrapRef}>
                <Label>Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={addressInput}
                    onChange={(e) => onAddressChange(e.target.value)}
                    placeholder="Search hospital or company address"
                    className="pl-10"
                    required
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                  {showSug && suggestions.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 bg-card border border-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {suggestions.map((s) => (
                        <button key={s.place_id} type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 text-foreground border-b border-border/30 last:border-0"
                          onClick={() => pickSuggestion(s)}>
                          {s.description}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">Pick from suggestions to auto-fill city, country and coordinates.</p>
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
