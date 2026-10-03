import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { Lock, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/layout/Footer";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const recoveryVerifiedRef = useRef(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryVerifiedRef.current = true;
        setAuthReady(true);
        setInitialLoading(false);
      } else if (event === 'SIGNED_IN' && !recoveryVerifiedRef.current && session) {
        // Fallback: some Supabase versions emit SIGNED_IN for recovery
        setAuthReady(true);
        setInitialLoading(false);
      }
    });

    // Also check if session already exists (token may have been processed before mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        recoveryVerifiedRef.current = true;
        setAuthReady(true);
        setInitialLoading(false);
      }
    });

    // Safety timeout — if nothing fires in 5s, link is expired
    timeoutId = setTimeout(() => {
      if (!recoveryVerifiedRef.current) {
        setInitialLoading(false);
        toast({
          title: "Invalid or expired link",
          description: "Please request a new password reset link",
          variant: "destructive",
        });
        navigate("/forgot-password");
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authReady) return;

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Password updated",
        description: "Your password has been successfully reset",
      });

      // Clean URL hash to prevent re-trigger
      window.history.replaceState(null, "", window.location.pathname);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const [{ data: profileData }, { data: roleRows }] = await Promise.all([
          supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle(),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id),
        ]);

        const resolvedRole =
          profileData?.role ??
          ((roleRows ?? []).some((row) => row.role === "patient") ? "patient" : null);

        setTimeout(() => {
          navigate(resolvedRole === "patient" ? "/patient/details" : "/dashboard");
        }, 2000);
      } else {
        setTimeout(() => navigate("/auth"), 2000);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <h1 className="page-title">Holarc Wealth</h1>
            <p className="text-muted-foreground mt-2">Set your new password</p>
          </div>

          <div className="rounded-xl border border-primary bg-card p-6 shadow-sm">
            {initialLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Verifying your reset link...</p>
              </div>
            ) : success ? (
              <div className="text-center py-4">
                <div className="flex justify-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Password Reset Successful</h2>
                <p className="text-muted-foreground">Redirecting you...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !authReady}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Password
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
