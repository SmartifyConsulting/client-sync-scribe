import { useState, useEffect } from "react";
import { Shield, Loader2, CheckCircle, Copy, AlertTriangle, Check, Download, Apple, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import holarcLogoAsset from "@/assets/holarc-wealth-logo.png.asset.json";
const holarcLogo = holarcLogoAsset.url;

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TwoFactorSetup({ open, onOpenChange, onSuccess }: TwoFactorSetupProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"setup" | "verify" | "success">("setup");
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);
  const isMobile = typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (open && step === "setup") {
      enrollMFA();
    }
  }, [open]);

  const enrollMFA = async () => {
    setLoading(true);
    try {
      // Reuse any existing unverified TOTP factor instead of creating a new one
      const { data: factorList } = await supabase.auth.mfa.listFactors();
      const existingUnverified = (factorList?.all || []).find(
        (f) => f.factor_type === "totp" && f.status !== "verified"
      );

      if (existingUnverified && (existingUnverified as any).totp?.qr_code) {
        setQrCode((existingUnverified as any).totp.qr_code);
        setSecret((existingUnverified as any).totp.secret);
        setFactorId(existingUnverified.id);
      } else {
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to set up 2FA",
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const verifyMFA = async () => {
    if (!factorId || verifyCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      setStep("success");
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been enabled for your account",
      });
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "That code didn't work",
        description: "Codes refresh every 30 seconds — open your authenticator app and try the newest 6-digit code.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast({ title: "Copied", description: "Secret key copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", description: "Long-press the key to copy it manually.", variant: "destructive" });
    }
  };

  const handleClose = () => {
    setStep("setup");
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setVerifyCode("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <img src={holarcLogo} alt="Indigro" className="h-8 w-auto" />
          </div>
          <p className="text-center text-sm uppercase tracking-wider text-muted-foreground">
            Account security · One-time setup
          </p>
          <DialogTitle className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === "setup" && (
              <>{isMobile ? "Tap" : "Click"} below to set up your authenticator app</>
            )}
            {step === "verify" && "Enter the code from your authenticator app"}
            {step === "success" && "Your account is now protected"}
          </DialogDescription>
        </DialogHeader>

        {loading && step === "setup" ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : step === "setup" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Don't have an authenticator app yet?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium hover:bg-muted min-h-11"
                >
                  <Download className="h-4 w-4 text-primary" /> Google Authenticator — Android
                </a>
                <a
                  href="https://apps.apple.com/app/google-authenticator/id388497605"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium hover:bg-muted min-h-11"
                >
                  <Apple className="h-4 w-4 text-primary" /> Google Authenticator — iPhone
                </a>
                <a
                  href="https://authy.com/download/"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium hover:bg-muted min-h-11"
                >
                  <Download className="h-4 w-4 text-primary" /> Authy
                </a>
                <a
                  href="https://www.microsoft.com/en-us/security/mobile-authenticator-app"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium hover:bg-muted min-h-11"
                >
                  <Shield className="h-4 w-4 text-primary" /> Microsoft Authenticator
                </a>
              </div>
            </div>

            {qrCode && (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white p-3 rounded-lg border border-border">
                  <img
                    src={qrCode}
                    alt="QR code for two-factor authentication setup. Scan with your authenticator app."
                    className="w-[min(70vw,200px)] h-[min(70vw,200px)] sm:w-48 sm:h-48"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Scan with Google Authenticator, Authy, or any TOTP app
                </p>
              </div>
            )}

            {secret && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Can't scan? Enter this code manually:
                </Label>
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
                <Button variant="outline" onClick={copySecret} className="w-full min-h-11">
                  {copied ? (
                    <><Check className="h-4 w-4 mr-2 text-primary" /> Copied!</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-2" /> Copy Setup Key</>
                  )}
                </Button>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warning-foreground">
                Save this secret key in a safe place. You'll need it if you lose access to your authenticator app.
              </p>
            </div>

            <Button onClick={() => setStep("verify")} className="w-full min-h-12">
              Continue
            </Button>

            <a
              href="mailto:support@holarchealth.com"
              className="block text-center text-xs text-muted-foreground hover:text-primary"
            >
              Need help? Contact support
            </a>
          </div>
        ) : step === "verify" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verifyCode">Verification Code</Label>
              <Input
                id="verifyCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-widest font-mono h-14"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("setup")} className="flex-1 min-h-12">
                Back
              </Button>
              <Button onClick={verifyMFA} disabled={loading || verifyCode.length !== 6} className="flex-1 min-h-12">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
            </div>
            <a
              href="mailto:support@holarchealth.com"
              className="block text-center text-xs text-muted-foreground hover:text-primary"
            >
              Need help? Contact support
            </a>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="text-center py-4"
            >
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">You're all set!</h3>
              <p className="text-muted-foreground mb-4">
                Your account is now protected with two-factor authentication.
              </p>
              <Button onClick={handleClose} className="w-full min-h-12">
                Continue to Dashboard
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </DialogContent>
    </Dialog>
  );
}
