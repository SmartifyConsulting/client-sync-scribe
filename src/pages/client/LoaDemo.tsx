import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WorkflowMap } from "@/features/wealth-workflow/map/WorkflowMap";

export default function LoaDemo() {
  const navigate = useNavigate();
  const { data: client, isLoading } = useQuery({
    queryKey: ["loa-signing-demo"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from("clients")
        .select("id,name,patient_user_id,is_sample")
        .eq("id", "caefec42-4c52-4dc3-b5d7-f459baec8e4c")
        .eq("patient_user_id", user.id).eq("is_sample", true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <Loader2 className="m-6 h-6 w-6 animate-spin text-primary" />;
  if (!client) return <p className="p-4 text-muted-foreground">Switch to the LOA demo client to view this workspace.</p>;
  return <div className="space-y-3 p-4">
    <h1 className="page-title">{client.name}</h1>
    <p className="text-xs text-muted-foreground">Demo only · Simulated checks, not real KYC or KYB verification.</p>
    <WorkflowMap clientId={client.id} clientName={client.name} viewer="client" onOpenDocuments={() => navigate("/client/documents")} />
  </div>;
}