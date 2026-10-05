import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/brand/Logo";

type Preview = { status: string; firstName: string; lastName: string; phone?: string; email?: string; managerName: string; fspName?: string | null; businessLogo?: string | null; fspLogo?: string | null };

export default function JoinInvite() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [f, setF] = useState({ first: "", last: "", email: "", password: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    supabase.functions.invoke("wealth-client-invite", { body: { action: "preview", token } }).then(({ data, error }) => {
      if (error || data?.error) return setErr(data?.error ?? "This invitation link isn't valid. Ask your Wealth Manager for a new one.");
      setPreview(data);
      setF((v) => ({ ...v, first: data.firstName ?? "", last: data.lastName ?? "", email: data.email ?? "" }));
    });
  }, [token]);

  const accept = async () => {
    setBusy(true); setErr(null);
    const { data, error } = await supabase.functions.invoke("wealth-client-invite", { body: { action: "accept", token } });
    setBusy(false);
    if (error || data?.error) {
      let msg: string | undefined = data?.error;
      try { msg = msg ?? (await (error as any)?.context?.json?.())?.error; } catch { /* ignore */ }
      return setErr(msg ?? "We couldn't link your account. Please try again.");
    }
    navigate("/my-workspace", { replace: true });
  };

  // Once a client has signed up or signed in on this page, link them automatically.
  const [autoTried, setAutoTried] = useState(false);
  useEffect(() => {
    if (!autoTried && user && preview && (mode === "signup" ? f.password : f.password) && f.email.trim().toLowerCase() === user.email?.toLowerCase()) {
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
        options: { emailRedirectTo: `${window.location.origin}/join/${token}`, data: { full_name: `${f.first} ${f.last}`.trim(), role: "patient" } },
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
          {preview?.businessLogo ? <img src={preview.businessLogo} alt="" className="max-h-12 max-w-[45%] object-contain" /> : <Logo />}
          {preview?.fspLogo && <img src={preview.fspLogo} alt="" className="max-h-12 max-w-[45%] object-contain" />}
        </div>

        {!preview && !err && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {err && !preview && <p className="text-sm text-destructive">{err}</p>}

        {preview && (
          <>
            <div className="space-y-1">
              <h1 className="page-title">Welcome{preview.firstName ? `, ${preview.firstName}` : ""}</h1>
              <p className="page-subtitle">{preview.managerName}{preview.fspName ? ` of ${preview.fspName}` : ""} has invited you to Elysian. Create your account to start onboarding — your first step is a quick identity and screening check.</p>
            </div>

            {authLoading ? null : user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Signed in as <b className="text-foreground">{user.email}</b>.</p>
                {err && <p className="text-sm text-destructive">{err}</p>}
                {err?.includes("your own client invitation") ? (
                  <>
                    <p className="text-sm text-muted-foreground">This link is for {preview.firstName || "your client"} to create their own account. To test it, open the link in a private (incognito) window, or sign out below.</p>
                    <Button className="w-full" onClick={async () => { await supabase.auth.signOut(); setErr(null); setMode("signup"); }}>Sign out and register as {preview.firstName || "the client"}</Button>
                    <Button variant="outline" className="w-full" onClick={() => navigate("/practice")}>Back to My Clients</Button>
                  </>
                ) : (
                  <>
                    <Button className="w-full" disabled={busy} onClick={accept}>{busy ? "Linking…" : "Continue to onboarding"}</Button>
                    <button className="w-full text-xs text-muted-foreground underline" onClick={() => supabase.auth.signOut()}>Not you? Sign out</button>
                  </>
                )}
              </div>
            ) : checkEmail ? (
              <p className="text-sm text-muted-foreground">We've sent a confirmation email to <b className="text-foreground">{f.email}</b>. Open it on this device to finish — you'll come straight back here.</p>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                {mode === "signup" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>First name</Label><Input required value={f.first} onChange={(e) => setF({ ...f, first: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Surname</Label><Input required value={f.last} onChange={(e) => setF({ ...f, last: e.target.value })} /></div>
                  </div>
                )}
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Password</Label>
                    {mode === "signin" && <Link to="/forgot-password" tabIndex={-1} className="text-xs text-muted-foreground underline">Forgot password?</Link>}
                  </div>
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
