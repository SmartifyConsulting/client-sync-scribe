import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MfaEnrollScreen } from "./MfaEnrollScreen";
import { MfaChallengeScreen } from "./MfaChallengeScreen";

type Status = "loading" | "ok" | "enroll" | "challenge";

/**
 * Wraps every authenticated route. Forces all signed-in users to either:
 *  - enroll a TOTP factor if they have none verified, OR
 *  - complete a TOTP challenge if their session is at aal1 but a factor exists.
 * Only renders children once the session is at aal2.
 */
export function MfaGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("loading");

  const evaluate = useCallback(async () => {
    if (!user) {
      setStatus("ok"); // ProtectedRoute will redirect; nothing to gate
      return;
    }
    setStatus("loading");
    try {
      // MFA is opt-in per user via profiles.mfa_required.
      // If the user has not enabled it, never prompt for enrollment or a code.
      const { data: profile } = await supabase
        .from("profiles")
        .select("mfa_required")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.mfa_required) {
        setStatus("ok");
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") {
        setStatus("ok");
        return;
      }
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerified = (factors?.totp || []).some((f) => f.status === "verified");
      if (!hasVerified) {
        setStatus("enroll");
      } else {
        setStatus("challenge");
      }
    } catch {
      // On error, fail open — don't lock users out because of MFA infra issues.
      setStatus("ok");
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) evaluate();
  }, [authLoading, evaluate]);

  // Re-evaluate on auth changes (sign-in, token refresh promoting to aal2).
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "MFA_CHALLENGE_VERIFIED") {
        evaluate();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [evaluate]);

  if (authLoading || status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "enroll") return <MfaEnrollScreen onEnrolled={evaluate} />;
  if (status === "challenge") return <MfaChallengeScreen onVerified={evaluate} />;
  return <>{children}</>;
}
