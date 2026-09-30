import { useEffect, useMemo, useState } from "react";
import { Shield, Loader2, Copy, AlertTriangle, LogOut, Smartphone, Download, Apple, CheckCircle2, Check, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { BackupCodesScreen } from "./BackupCodesScreen";


const isMobileUA = () =>
  typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);

interface Props {
  onEnrolled: () => void;
}

export function MfaEnrollScreen({ onEnrolled }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [isPhoneUser, setIsPhoneUser] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email || "";
      setIsPhoneUser(email.endsWith("@phone.holarc.local"));
    });
  }, []);


  useEffect(() => {
    (async () => {
      try {
        // Reuse any existing unverified TOTP factor so the QR/secret stays stable
        // if the user abandons and returns. Only create a new factor when none exists.
        const { data: factorList } = await supabase.auth.mfa.listFactors();
        const existingUnverified = (factorList?.all || []).find(
          (f) => f.factor_type === "totp" && f.status !== "verified"
        );
        if (existingUnverified && (existingUnverified as any).totp?.qr_code) {
          setQrCode((existingUnverified as any).totp.qr_code);
          setSecret((existingUnverified as any).totp.secret);
          setFactorId(existingUnverified.id);
        } else {
          // listFactors doesn't always return qr_code; if missing, unenroll + re-enroll once.
          if (existingUnverified) {
            await supabase.auth.mfa.unenroll({ factorId: existingUnverified.id });
          }
          const { data, error } = await supabase.auth.mfa.enroll({
            factorType: "totp",
            friendlyName: "Holarc Authenticator",
          });
          if (error) throw error;
          if (data) {
            setQrCode(data.totp.qr_code);
            setSecret(data.totp.secret);
            setFactorId(data.id);
          }
        }
      } catch (err: any) {
        toast({ title: "Could not start 2FA setup", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast({ title: "Copied", description: "Secret key copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Long-press the key to copy it manually.", variant: "destructive" });
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || code.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code,
      });
      if (vErr) throw vErr;
      setVerified(true);
      toast({ title: "2FA enabled", description: "Your account is now protected." });
      // Phone-only users get backup codes shown next (their only self-service recovery).
      // Email users have email-based password reset, so we skip straight to onEnrolled.
      setTimeout(() => {
        if (isPhoneUser) {
          setShowBackupCodes(true);
        } else {
          onEnrolled();
        }
      }, 1100);
    } catch (err: any) {
      toast({
        title: "That code didn't work",
        description: "Codes refresh every 30 seconds — open your authenticator app and try the newest 6-digit code.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  if (showBackupCodes) {
    return <BackupCodesScreen onContinue={onEnrolled} />;
  }



  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-start sm:items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-5 sm:mb-6 px-1">
            <div className="flex justify-center mb-3">
              <Logo size="md" />
            </div>
            <div className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
              <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            </div>
            <p className="text-sm uppercase tracking-wider text-primary font-semibold mb-1">
              Account security · One-time setup
            </p>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">Set up Two-Factor Authentication</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              This account holds sensitive health information. 2FA is required for every user — please enrol an
              authenticator app to continue.
            </p>
          </div>

          <div className="rounded-xl border border-primary bg-card p-4 sm:p-6 shadow-sm space-y-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Setting up 2FA…</p>
              </div>
            ) : (
              <>
                <AnimatePresence>
                  {verified && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      className="flex flex-col items-center py-6"
                    >
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <CheckCircle2 className="h-10 w-10 text-primary" />
                      </div>
                      <p className="text-base font-semibold text-foreground">2FA enabled</p>
                      <p className="text-xs text-muted-foreground mt-1">Taking you in…</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!verified && (
                  <>
                    <AuthenticatorDownload />

                    {qrCode && (
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-white p-3 rounded-lg border border-border">
                          <img
                            src={qrCode}
                            alt="QR code for two-factor authentication setup. Scan with your authenticator app."
                            className="w-[min(80vw,280px)] h-[min(80vw,280px)] sm:w-44 sm:h-44"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Scan this with Google Authenticator, Authy, Microsoft Authenticator, or any TOTP app.
                        </p>
                      </div>
                    )}

                    {secret && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Setup key (for manual entry)</Label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono break-all select-all">
                            {secretVisible ? secret : "•".repeat(secret.length)}
                          </code>
                          <button
                            type="button"
                            onClick={() => setSecretVisible((v) => !v)}
                            aria-label={secretVisible ? "Hide setup key" : "Show setup key"}
                            aria-pressed={secretVisible}
                            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors min-h-11 min-w-11 flex items-center justify-center"
                          >
                            {secretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={copySecret}
                          className="w-full min-h-12"
                        >
                          {copied ? (
                            <>
                              <Check className="h-4 w-4 mr-2 text-primary" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" /> Copy Setup Key
                            </>
                          )}
                        </Button>
                        <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
                          <Smartphone className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground">
                            On a mobile phone? Copy this key and paste it into Google Authenticator under{" "}
                            <strong>"Enter a setup key"</strong>.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/40 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground font-medium">
                        Save this key somewhere safe. You'll need it if you lose access to your authenticator app.
                      </p>
                    </div>

                    <form onSubmit={verify} className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="code">Enter the 6-digit code from your app</Label>
                        <Input
                          id="code"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="000000"
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="text-center text-2xl sm:text-3xl tracking-[0.4em] font-mono h-14 sm:h-12"
                          maxLength={6}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full min-h-12 text-base"
                        disabled={verifying || code.length !== 6}
                      >
                        {verifying ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying code…
                          </>
                        ) : (
                          "Verify & enable 2FA"
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </>
            )}

            {!verified && (
              <>
                <a
                  href="mailto:support@holarchealth.com"
                  className="block text-center text-xs text-muted-foreground hover:text-primary py-1"
                >
                  Need help? Contact support
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = "/auth";
                  }}
                  className="flex items-center justify-center gap-1.5 w-full text-xs text-muted-foreground hover:text-destructive py-2"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthenticatorDownload() {
  const platform = useMemo(() => {
    if (typeof navigator === "undefined") return "other";
    const ua = navigator.userAgent || "";
    if (/android/i.test(ua)) return "android";
    if (/iphone|ipad|ipod/i.test(ua)) return "ios";
    return "other";
  }, []);

  const androidBtn = (
    <a
      href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-xs font-medium text-foreground hover:bg-muted transition-colors min-h-12"
    >
      <Download className="h-4 w-4 text-primary" />
      <span>Google Authenticator — Android</span>
    </a>
  );
  const iosBtn = (
    <a
      href="https://apps.apple.com/app/google-authenticator/id388497605"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-xs font-medium text-foreground hover:bg-muted transition-colors min-h-12"
    >
      <Apple className="h-4 w-4 text-primary" />
      <span>Google Authenticator — iPhone</span>
    </a>
  );
  const authyBtn = (
    <a
      href="https://authy.com/download/"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-xs font-medium text-foreground hover:bg-muted transition-colors min-h-12"
    >
      <Download className="h-4 w-4 text-primary" />
      <span>Authy</span>
    </a>
  );
  const msBtn = (
    <a
      href="https://www.microsoft.com/en-us/security/mobile-authenticator-app"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-xs font-medium text-foreground hover:bg-muted transition-colors min-h-12"
    >
      <Shield className="h-4 w-4 text-primary" />
      <span>Microsoft Authenticator</span>
    </a>
  );

  const verb = isMobileUA() ? "Tap" : "Click";

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <p className="text-xs font-semibold text-foreground">Don't have an authenticator app yet?</p>
      <p className="text-sm text-muted-foreground">
        {verb} below to install one of these authenticator apps, then come back here to scan the code.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {platform === "ios" ? (
          <>
            {iosBtn}
            {androidBtn}
          </>
        ) : (
          <>
            {androidBtn}
            {iosBtn}
          </>
        )}
        {authyBtn}
        {msBtn}
      </div>
    </div>
  );
}
