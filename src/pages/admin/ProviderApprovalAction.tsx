import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type State =
  | { kind: "loading" }
  | { kind: "success"; action: "approve" | "reject"; orgName?: string; providerKind?: string }
  | { kind: "error"; message: string };

export default function ProviderApprovalAction() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const action = params.get("action") as "approve" | "reject" | null;
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token || (action !== "approve" && action !== "reject")) {
      setState({ kind: "error", message: "This link is incomplete or invalid." });
      return;
    }
    (async () => {
      const { data, error } = await supabase.functions.invoke("process-provider-approval", {
        body: { token, action },
      });
      if (error) {
        setState({ kind: "error", message: error.message });
        return;
      }
      const res = data as {
        ok: boolean;
        action?: string;
        kind?: string;
        org_name?: string;
        error?: string;
      };
      if (!res?.ok) {
        const msg =
          res?.error === "already_used"
            ? `This link has already been used (${res?.action ?? "actioned"}).`
            : res?.error === "expired"
              ? "This approval link has expired."
              : res?.error === "invalid_token"
                ? "This approval link is invalid or has been revoked."
                : (res?.error ?? "Could not process this approval.");
        setState({ kind: "error", message: msg });
        return;
      }
      setState({
        kind: "success",
        action: res.action as "approve" | "reject",
        orgName: res.org_name,
        providerKind: res.kind,
      });
    })();
  }, [token, action]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          {state.kind === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
              <h1 className="text-xl font-semibold">Processing…</h1>
            </>
          )}
          {state.kind === "success" && state.action === "approve" && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-600" />
              <h1 className="text-xl font-semibold">Approved</h1>
              <p className="text-muted-foreground">
                {state.orgName ?? "The provider"} has been approved and can now sign in.
              </p>
            </>
          )}
          {state.kind === "success" && state.action === "reject" && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-red-600" />
              <h1 className="text-xl font-semibold">Rejected</h1>
              <p className="text-muted-foreground">
                {state.orgName ?? "The application"} has been marked as rejected.
              </p>
            </>
          )}
          {state.kind === "error" && (
            <>
              <AlertTriangle className="h-12 w-12 mx-auto text-amber-600" />
              <h1 className="text-xl font-semibold">Cannot process</h1>
              <p className="text-muted-foreground">{state.message}</p>
            </>
          )}
          <Button onClick={() => navigate("/")} className="w-full mt-2">
            Return Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
