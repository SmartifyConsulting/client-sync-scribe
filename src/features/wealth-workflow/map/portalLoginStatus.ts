import { supabase } from "@/integrations/supabase/client";

/** Metadata only; passwords and OTPs are never sent to this RPC. */
export async function recordPortalConnection(integrationId: string, outcome: "success" | "failed" | "unconfirmed") {
  const { error } = await (supabase as any).rpc("record_broker_portal_connection", { _integration_id: integrationId, _outcome: outcome });
  if (error) throw error;
  window.dispatchEvent(new Event("holarc-portal-login-recorded"));
}
