import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useClientWealth } from "@/features/wealth-workflow/client/useClientWealth";
import { WorkflowMap } from "@/features/wealth-workflow/map/WorkflowMap";

/** Client view of the shared Live Workspace for their own record. */
export default function MyWorkspace() {
  const { data, isLoading } = useClientWealth();
  const navigate = useNavigate();
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="page-title">Live Workspace</h1>
        <p className="text-xs text-muted-foreground">See where your plan is, and what is needed next, as it happens.</p>
      </div>
      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : data?.patientId ? (
        <WorkflowMap patientId={data.patientId} clientName={data.clientName} viewer="client"
          onOpenDocuments={() => navigate("/my-future?tab=documents")} />
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Your workspace will appear once your Wealth Manager starts your plan.</p>
      )}
    </div>
  );
}
