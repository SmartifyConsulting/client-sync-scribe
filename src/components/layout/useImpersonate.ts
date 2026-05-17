import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useImpersonate() {
  const [switching, setSwitching] = useState<string | null>(null);

  async function impersonate(email: string) {
    if (switching) return;
    setSwitching(email);
    try {
      const { data, error } = await supabase.functions.invoke("admin-impersonate", { body: { email } });
      if (error || !data?.token_hash) throw new Error(error?.message || data?.error || "Failed");
      await supabase.auth.signOut();
      const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "email" });
      if (vErr) throw vErr;
      toast.success(`Signed in as ${email}`);
      window.location.href = "/dashboard";
    } catch (e: any) {
      toast.error(`Switch failed: ${e.message}`);
      setSwitching(null);
    }
  }

  return { impersonate, switching };
}
