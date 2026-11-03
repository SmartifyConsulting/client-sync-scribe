import { supabase } from "@/integrations/supabase/client";

/** Metadata only; passwords and OTPs are never sent to this RPC. */
export async function recordPortalLogin(integrationId: string) {
  const { error } = await (supabase as any).rpc("record_broker_portal_login", { _integration_id: integrationId });
  if (error) throw error;
  window.dispatchEvent(new Event("holarc-portal-login-recorded"));
}
