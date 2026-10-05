import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPasswordError } from "@/lib/passwordPolicy";

/** Simple, self-serve signup for Referral Agents — no practice/FSP details
 *  needed, unlike the Wealth Manager signup wizard. */
export default function ReferrerSignup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [f, setF] = useState({ fullName: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  if (user) navigate("/referrer-dashboard", { replace: true });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (mode === "signup") {
      const passwordError = getPasswordError(f.password, { name: f.fullName, email: f.email });
      if (passwordError) return setErr(passwordError);
      setBusy(true);
      const { data, error } = await supabase.auth.signUp({
        email: f.email.trim(), password: f.password,
        options: { emailRedirectTo: `${window.location.origin}/referrer-dashboard`, data: { full_name: f.fullName.trim(), role: "referral_agent" } },
      });
      setBusy(false);
      if (error) return setErr(error.message);
      if (!data.session) setCheckEmail(true);
      else navigate("/referrer-dashboard", { replace: true });
    } else {
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
      setBusy(false);
      if (error) return setErr("That email and password don't match. Check them and try again.");
      navigate("/referrer-dashboard", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 md:p-8 space-y-6 shadow-sm">
        <Logo />
        <div className="space-y-1">
          <h1 className="page-title">{mode === "signup" ? "Become a Referral Agent" : "Welcome back"}</h1>
          <p className="page-subtitle">{mode === "signup" ? "Refer clients to a Wealth Manager and track the commission you earn." : "Sign in to your Referral Agent account."}</p>
        </div>

        {checkEmail ? (
          <p className="text-sm text-muted-foreground">We've sent a confirmation email to <b className="text-foreground">{f.email}</b>. Open it on this device to finish — you'll come straight back here.</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5"><Label>Full name</Label><Input required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></div>
            )}
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input type={show ? "text" : "password"} required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="pr-10" />
                <button type="button" tabIndex={-1} aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Create account" : "Sign in"}</Button>
            <button type="button" className="w-full text-xs text-muted-foreground" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setErr(null); }}>
              {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
