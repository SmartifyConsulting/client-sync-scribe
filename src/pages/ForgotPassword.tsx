import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import holarcLogo from "@/assets/holarc-logo-clear-2.png";
import { Loader2, ArrowLeft, Shield, Eye, EyeOff, CheckCircle, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/layout/Footer";

type Step = "identify" | "verify" | "email_sent" | "done";
type CodeType = "totp" | "backup";

const looksLikeEmail = (s: string) => /@/.test(s.trim());

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
  const [codeType, setCodeType] = useState<CodeType>("totp");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEmail = looksLikeEmail(identifier);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = identifier.trim();
    if (!id) {
      toast({ title: t("auth.common.error"), description: t("auth.forgot.identifyHelper"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (looksLikeEmail(id)) {
        // Email users: standard email reset link.
        const { error } = await supabase.auth.resetPasswordForEmail(id, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setStep("email_sent");
      } else {
        // Phone-only users: verify via authenticator or backup code.
        const { data, error } = await supabase.functions.invoke("auth-recovery-lookup", {
          body: { identifier: id },
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || "Unable to start recovery");
        setCodeType("totp");
        setStep("verify");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeType === "totp" && code.replace(/\D/g, "").length !== 6) {
      toast({ title: t("auth.common.error"), description: t("auth.forgot.verifyHelper"), variant: "destructive" });
      return;
    }
    if (codeType === "backup" && code.replace(/[^A-Za-z0-9]/g, "").length !== 8) {
      toast({ title: t("auth.common.error"), description: t("auth.forgot.verifyHelper"), variant: "destructive" });
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      toast({ title: t("auth.common.error"), description: t("auth.reset.newPassword"), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("auth.common.error"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auth-recovery-reset", {
        body: { identifier: identifier.trim(), code, newPassword, code_type: codeType },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Reset failed");
      setStep("done");
      toast({ title: t("auth.reset.success"), description: t("auth.reset.success") });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
              <img src={holarcLogo} alt="Holarc Health" className="h-[81px] w-auto" />
            </button>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("auth.forgot.title")}</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("auth.forgot.instructions")}
            </p>
          </div>

          <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">
            {step === "identify" && (
              <form onSubmit={handleIdentify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">{t("auth.forgot.email")}</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="you@example.com or +27 82 123 4567"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoFocus
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {identifier.trim() === ""
                      ? t("auth.forgot.identifyHelper")
                      : isEmail
                      ? t("auth.forgot.email")
                      : t("auth.forgot.identifyHelper")}
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("auth.common.continue")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate("/auth")} className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" /> {t("auth.common.backToSignIn")}
                </Button>
              </form>
            )}

            {step === "email_sent" && (
              <div className="text-center py-4 space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-foreground">{t("auth.forgot.checkEmail")}</h2>
                <p className="text-sm text-muted-foreground">
                  If <strong>{identifier.trim()}</strong> matches an account, we've sent a reset
                  link. Click it within 1 hour to choose a new password.
                </p>
                <Button onClick={() => navigate("/auth")} className="w-full">
                  {t("auth.common.backToSignIn")}
                </Button>
                <button
                  type="button"
                  onClick={() => setStep("identify")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Wrong email? Try again
                </button>
              </div>
            )}

            {step === "verify" && (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="flex items-center justify-center mb-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    {codeType === "totp" ? (
                      <Shield className="h-6 w-6 text-primary" />
                    ) : (
                      <KeyRound className="h-6 w-6 text-primary" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {codeType === "totp"
                    ? t("auth.forgot.verifyHelper")
                    : t("auth.forgot.verifyHelper")}
                </p>

                <div className="space-y-2">
                  <Label htmlFor="code">
                    {codeType === "totp" ? t("auth.forgot.verifyCode") : t("auth.forgot.verifyCode")}
                  </Label>
                  {codeType === "totp" ? (
                    <Input
                      id="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="text-center text-2xl tracking-widest font-mono"
                      maxLength={6}
                    />
                  ) : (
                    <Input
                      id="code"
                      autoComplete="one-time-code"
                      autoFocus
                      placeholder="XXXX-XXXX"
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 9))
                      }
                      className="text-center text-lg tracking-widest font-mono uppercase"
                      maxLength={9}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCode("");
                      setCodeType(codeType === "totp" ? "backup" : "totp");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {codeType === "totp"
                      ? t("auth.forgot.verifyHelper")
                      : t("auth.forgot.verifyHelper")}
                  </button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t("auth.reset.newPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("auth.reset.confirmPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPw2 ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPw2((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPw2 ? "Hide password" : "Show password"}
                    >
                      {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("auth.reset.reset")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setStep("identify")} className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Use a different account
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Lost both your authenticator and backup codes? Contact support to verify your
                  identity manually.
                </p>
              </form>
            )}

            {step === "done" && (
              <div className="text-center py-4 space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-foreground">{t("auth.reset.success")}</h2>
                <p className="text-sm text-muted-foreground">
                  Sign in with your new password — you'll be prompted for your authenticator code
                  one more time.
                </p>
                <Button onClick={() => navigate("/auth")} className="w-full">
                  Go to Sign In
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
