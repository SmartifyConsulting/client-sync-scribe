import { useEffect, useState } from "react";
import { Shield, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onVerified: () => void;
}

export function MfaChallengeScreen({ onVerified }: Props) {
  const { toast } = useToast();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        const totp = data?.totp?.find((f) => f.status === "verified");
        if (!totp) throw new Error("No verified authenticator found.");
        setFactorId(totp.id);
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (chErr) throw chErr;
        setChallengeId(ch.id);
      } catch (err: any) {
        toast({ title: "Could not start verification", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !challengeId || code.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
      if (error) throw error;
      toast({ title: "Verified", description: "Welcome back." });
      onVerified();
    } catch (err: any) {
      toast({ title: "Invalid code", description: err.message || "The code didn't match. Try the next one.", variant: "destructive" });
      // Issue a fresh challenge for the next attempt
      try {
        const { data: ch } = await supabase.auth.mfa.challenge({ factorId });
        if (ch) setChallengeId(ch.id);
      } catch {}
      setCode("");
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
            <h1 className="text-xl font-semibold text-foreground">Two-Factor Verification</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Open your authenticator app and enter the 6-digit code for Holarc Health.
            </p>
          </div>

          <div className="rounded-xl border border-primary bg-card p-6 shadow-sm space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <form onSubmit={verify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={verifying || code.length !== 6}>
                  {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </form>
            )}

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
              className="flex items-center justify-center gap-1.5 w-full text-xs text-muted-foreground hover:text-destructive pt-2 border-t border-border"
            >
              <LogOut className="h-3.5 w-3.5" /> Cancel and sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
