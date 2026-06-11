import { useEffect, useMemo, useState } from "react";
import { Shield, Loader2, Copy, AlertTriangle, LogOut, Smartphone, Download, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onEnrolled: () => void;
}

export function MfaEnrollScreen({ onEnrolled }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Clean up any unverified factors from a previous attempt so we don't
        // accumulate "unverified" rows in Supabase.
        const { data: factorList } = await supabase.auth.mfa.listFactors();
        const unverified = (factorList?.all || []).filter((f) => f.status !== "verified");
        for (const f of unverified) {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
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
      toast({ title: "2FA enabled", description: "Your account is now protected." });
      onEnrolled();
    } catch (err: any) {
      toast({ title: "Invalid code", description: err.message || "Try the next code from your app.", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Set up Two-Factor Authentication</h1>
            <p className="text-sm text-muted-foreground mt-2">
              This account holds sensitive health information. 2FA is required for every user — please enroll an authenticator app to continue.
            </p>
          </div>

          <div className="rounded-xl border border-primary bg-card p-6 shadow-sm space-y-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Authenticator download helpers */}
                <AuthenticatorDownload />

                {qrCode && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-3 rounded-lg border border-border">
                      <img src={qrCode} alt="2FA QR code" className="w-44 h-44" />
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
                        {secret}
                      </code>
                    </div>
                    <Button type="button" variant="outline" onClick={copySecret} className="w-full">
                      <Copy className="h-4 w-4 mr-2" /> Copy Secret Key
                    </Button>
                    <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
                      <Smartphone className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">
                        On a mobile phone? Copy this key and paste it into Google Authenticator under <strong>"Enter a setup key"</strong>.
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
                      className="text-center text-2xl tracking-widest font-mono"
                      maxLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={verifying || code.length !== 6}>
                    {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify & enable 2FA
                  </Button>
                </form>
              </>
            )}

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
              className="flex items-center justify-center gap-1.5 w-full text-xs text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
