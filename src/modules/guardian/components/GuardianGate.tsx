import { useGuardianAccess } from "../hooks/useGuardianAccess";
import { Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function GuardianGate({ children }: { children: React.ReactNode }) {
  const { enabled, loading } = useGuardianAccess();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="mx-auto max-w-md px-5 pt-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sos/10">
          <Shield className="h-8 w-8 text-sos" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold">Holarc Guardian</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Emergency SOS, live location sharing, and instant responder dispatch — an optional
          subscription module on top of your Holarc account.
        </p>
        <div className="mt-6 rounded-2xl border bg-card p-4 text-left text-sm">
          <p className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" /> Not enabled yet</p>
          <p className="mt-1 text-muted-foreground">
            Guardian is currently activated by an administrator. Contact your administrator to
            request access.
          </p>
        </div>
        <Button variant="outline" className="mt-6" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  return <>{children}</>;
}
