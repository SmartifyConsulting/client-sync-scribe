import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, Phone, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  { code: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", name: "United States", flag: "🇺🇸" },
  { code: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+351", name: "Portugal", flag: "🇵🇹" },
  { code: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+86", name: "China", flag: "🇨🇳" },
  { code: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "+971", name: "UAE", flag: "🇦🇪" },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "+263", name: "Zimbabwe", flag: "🇿🇼" },
  { code: "+267", name: "Botswana", flag: "🇧🇼" },
  { code: "+258", name: "Mozambique", flag: "🇲🇿" },
];

/**
 * Self-contained sign-in form: email/phone + password, OTP, Google.
 * Used both on the /auth route and embedded directly on the home page.
 * Sign-up stays a separate wizard reached via `onSignUp`/`/auth?mode=signup`.
 */
export function SignInCard({ onSignUp }: { onSignUp?: () => void }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { verifyOtp } = useAuth();

  const [loginTab, setLoginTab] = useState<"email" | "phone">("email");
  const [loginId, setLoginId] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+27");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [useOtp, setUseOtp] = useState(false);
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setTimeout(() => setOtpCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCooldown]);

  const normalizePhone = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.startsWith("+")) return "+" + trimmed.slice(1).replace(/\D/g, "");
    const digits = trimmed.replace(/\D/g, "").replace(/^0+/, "");
    return `${countryCode}${digits}`.replace(/\s+/g, "");
  };

  const phoneToSyntheticEmail = (e164: string) => {
    const digits = e164.replace(/\D/g, "");
    return `${digits}@phone.holarc.local`;
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
    navigate(resolvedRole === "patient" ? "/patient/details" : resolvedRole === "emergency" ? "/provider" : "/dashboard");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const isPhone = loginTab === "phone";
    const id = isPhone ? `${countryCode}${loginPhone.replace(/\s+/g, "")}` : loginId.trim();
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
      const credentials = !isPhone ? { email: id, password } : { email: phoneToSyntheticEmail(normalizePhone(id)), password };
      const { data, error } = await supabase.auth.signInWithPassword(credentials as any);
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("invalid") || msg.includes("credentials")) throw new Error("Invalid credentials");
        if (msg.includes("not found") || msg.includes("does not exist")) throw new Error("Account does not exist");
        throw error;
      }
      toast({ title: "Welcome back!", description: "Successfully signed in" });
      const userId = data?.user?.id;
      if (userId) await routeAfterLogin(userId);
      else navigate("/dashboard");
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
        body: { type: "magiclink", email, redirectTo: `${window.location.origin}/` },
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) {
        toast({ title: "Google sign-in failed", description: result.error.message, variant: "destructive" });
        return;
      }
      if (result.redirected) return;
      navigate("/dashboard");
    } catch (e) {
      toast({ title: "Google sign-in failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Sign In / Sign Up tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 mb-4">
        <button type="button" className="rounded-lg py-2 text-sm font-semibold bg-card text-foreground shadow-sm">
          Sign In
        </button>
        <button
          type="button"
          onClick={() => (onSignUp ? onSignUp() : navigate("/auth?mode=signup"))}
          className="rounded-lg py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign Up
        </button>
      </div>

      <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">
        {!useOtp ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setLoginTab("email")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors",
                  loginTab === "email" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Mail className="h-3.5 w-3.5" /> Email
              </button>
              <button
                type="button"
                onClick={() => setLoginTab("phone")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors",
                  loginTab === "phone" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Phone className="h-3.5 w-3.5" /> Phone
              </button>
            </div>

            {loginTab === "email" ? (
              <div className="space-y-2">
                <Label htmlFor="sic-loginId">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="sic-loginId"
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
                <Label htmlFor="sic-loginPhone">Phone number</Label>
                <div className="flex gap-2">
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
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="sic-loginPhone"
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
                  <p className="text-xs text-muted-foreground">You'll sign in as {normalizePhone(`${countryCode}${loginPhone}`)}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sic-password">Password</Label>
                <button type="button" tabIndex={-1} onClick={() => navigate("/forgot-password")} className="text-xs text-muted-foreground hover:text-primary hover:underline">
                  Forgot your password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="sic-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
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
              <Label htmlFor="sic-otp-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="sic-otp-email"
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
                  <Label htmlFor="sic-otp">Enter 6-digit code</Label>
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
                  <p className="text-xs text-muted-foreground text-center">Or click the magic link we emailed you.</p>
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

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Lock className="h-3.5 w-3.5 text-primary" /> Your data is encrypted
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
          <KeyRound className="h-3.5 w-3.5 text-primary" /> 2FA required
        </span>
      </div>
    </div>
  );
}

export default SignInCard;
