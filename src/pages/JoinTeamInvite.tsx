import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/brand/Logo";

type Preview = { status: string; fullName: string; email: string; role: "referral_agent" | "fsp" };
const ROLE_LABEL: Record<Preview["role"], string> = { referral_agent: "Referral Agent", fsp: "FSP" };

export default function JoinTeamInvite() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [f, setF] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    supabase.functions.invoke("wealth-team-invite", { body: { action: "preview", token } }).then(({ data, error }) => {
      if (error || data?.error) return setErr(data?.error ?? "This invitation link isn't valid. Ask your administrator for a new one.");
      setPreview(data);
      setF((v) => ({ ...v, email: data.email ?? "" }));
    });
  }, [token]);

  const accept = async () => {
    setBusy(true); setErr(null);
    const { data, error } = await supabase.functions.invoke("wealth-team-invite", { body: { action: "accept", token } });
    setBusy(false);
    if (error || data?.error) {
      let msg: string | undefined = data?.error;
      try { msg = msg ?? (await (error as any)?.context?.json?.())?.error; } catch { /* ignore */ }
      return setErr(msg ?? "We couldn't link your account. Please try again.");
    }
    navigate("/doctor-dashboard", { replace: true });
  };

  const [autoTried, setAutoTried] = useState(false);
  useEffect(() => {
    if (!autoTried && user && preview && f.email.trim().toLowerCase() === user.email?.toLowerCase()) {
      setAutoTried(true);
      accept();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, preview]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: f.email.trim(), password: f.password,
        options: { emailRedirectTo: `${window.location.origin}/join-team/${token}`, data: { full_name: preview?.fullName ?? "" } },
      });
      setBusy(false);
      if (error) return setErr(error.message);
      if (!data.session) setCheckEmail(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
      setBusy(false);
      if (error) return setErr("That email and password don't match. Check them and try again.");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 min-h-12">
          <Logo />
        </div>

        {!preview && !err && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {err && !preview && <p className="text-sm text-destructive">{err}</p>}

        {preview && (
          <>
            <div className="space-y-1">
              <h1 className="page-title">Welcome{preview.fullName ? `, ${preview.fullName}` : ""}</h1>
              <p className="page-subtitle">You've been invited to join as a {ROLE_LABEL[preview.role]}. Create your account to continue.</p>
            </div>

            {authLoading ? null : user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Signed in as <b className="text-foreground">{user.email}</b>.</p>
                {err && <p className="text-sm text-destructive">{err}</p>}
                <Button className="w-full" disabled={busy} onClick={accept}>{busy ? "Linking…" : "Continue"}</Button>
                <button className="w-full text-xs text-muted-foreground underline" onClick={() => supabase.auth.signOut()}>Not you? Sign out</button>
              </div>
            ) : checkEmail ? (
              <p className="text-sm text-muted-foreground">We've sent a confirmation email to <b className="text-foreground">{f.email}</b>. Open it on this device to finish — you'll come straight back here.</p>
            ) : (
              <form onSubmit={submit} className="space-y-3">
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
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</Button>
                <button type="button" className="w-full text-xs text-muted-foreground" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setErr(null); }}>
                  {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
