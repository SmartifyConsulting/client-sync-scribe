import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { recordPortalConnection } from "./portalLoginStatus";
import { toast } from "sonner";

/** Route-independent connection recording and structural-incident forwarding. Never stores credentials. */
export function CompanionCoordinator() {
  const { user } = useAuth();
  const { hasAdvisorRole, hasAdminRole } = useUserRole();
  const authorised = hasAdvisorRole || hasAdminRole;
  useEffect(() => {
    if (!user || !authorised) return;
    const key = `holarc-connection-attempts:${user.id}`;
    let pending: Record<string, { integrationId: string; provider: string; expires: number; attemptId?:string }> = {};
    try { pending = JSON.parse(sessionStorage.getItem(key) || "{}"); } catch { /* metadata only */ }
    const known = new Set<string>();
    const uploaded = new Set<string>(), uploading = new Set<string>();
    const observed = new Map<string, number>();
    let lastSaveError=0;
    const saveResult = (id:string,outcome:"success"|"failed") => recordPortalConnection(id,outcome).catch(()=>{
      if(Date.now()-lastSaveError>60_000){lastSaveError=Date.now();toast.error("The connection time could not be saved. Please refresh Holarc.");}
    });
    let alive = true;
    const persist = () => {
      pending = Object.fromEntries(Object.entries(pending).filter(([,v]) => v.expires > Date.now()));
      sessionStorage.setItem(key, JSON.stringify(pending));
    };
    const register = async () => {
      const [catalog, response] = await Promise.all([
        supabase.from("app_integrations_catalog").select("id,name,portal_url").eq("is_active", true),
        supabase.functions.invoke("manage-broker-credentials", { body: { action: "list" } }),
      ]);
      if (!alive || catalog.error || response.error) return;
      known.clear();
      const statuses = response.data?.credentials || [];
      const apps = (catalog.data || []).flatMap(entry => {
        const saved = statuses.find((row: any) => row.integration_id === entry.id && row.is_enabled && row.status === "configured");
        if (!saved) return [];
        try {
          const url = new URL(saved.portal_url || entry.portal_url);
          if (url.protocol !== "https:" || url.username || url.password) return [];
          known.add(entry.id);
          return [{ id: entry.id, name: entry.name, origin: url.origin }];
        } catch { return []; }
      });
      window.postMessage({ source: "holarc", type: "companion-interface-register", apps }, location.origin);
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin) return;
      const data = event.data;
      if (data?.source === "holarc" && data.type === "insurer-login" && typeof data.integrationId === "string" && typeof data.workflowId === "string") {
        const request={ integrationId: data.integrationId, provider: data.insurer, expires: Date.now() + 20 * 60_000,attemptId:typeof data.connectionAttemptId==='string'?data.connectionAttemptId:undefined };
        pending[`${data.workflowId}|${data.insurer}`] = request;
        if(typeof data.connectionAttemptId==='string')pending[data.connectionAttemptId]=request;
        persist();
      }
      if (data?.source !== "holarc-extension") return;
      if (data.type === "insurer-login-result") {
        const request = pending[data.connectionAttemptId || `${data.workflowId}|${data.insurer}`];
        if (!request || request.provider !== data.insurer || request.expires < Date.now()) return;
        if(data.connectionAttemptId&&pending[`${data.workflowId}|${data.insurer}`]?.attemptId!==data.connectionAttemptId){delete pending[data.connectionAttemptId];persist();return;}
        delete pending[`${data.workflowId}|${data.insurer}`]; persist();
        if(data.connectionAttemptId)delete pending[data.connectionAttemptId];
        persist();
        void saveResult(request.integrationId, data.ok === true ? "success" : "failed");
      }
      if (data.type === "companion-session-connected" && known.has(data.integrationId)) {
        if (Date.now() - (observed.get(data.integrationId) || 0) < 60_000) return;
        observed.set(data.integrationId, Date.now());
        void saveResult(data.integrationId, "success");
      }
      if (data.type === "companion-interface-report" && Array.isArray(data.apps) && Array.isArray(data.incidents)) {
        window.dispatchEvent(new CustomEvent("holarc-interface-report", { detail: data }));
        for (const incident of data.incidents.slice(-50)) {
          if (!known.has(incident.integrationId) || !/^[a-f0-9]{64}$/.test(incident.fingerprint) || uploaded.has(incident.fingerprint) || uploading.has(incident.fingerprint)) continue;
          uploading.add(incident.fingerprint);
          void supabase.functions.invoke("companion-interface-incident", { body: incident }).then(({error,data:reply}) => {
            if (!error && reply?.id) uploaded.add(incident.fingerprint);
            window.dispatchEvent(new CustomEvent("holarc-interface-queue",{detail:{status:error||!reply?.id?"offline":reply.workerConfigured?"queued":"unconfigured"}}));
          }).finally(() => uploading.delete(incident.fingerprint));
        }
      }
    };
    window.addEventListener("message", receive);
    window.addEventListener("focus", register);
    const interval = setInterval(() => { void register(); window.postMessage({source:"holarc",type:"companion-interface-status"},location.origin); },60_000);
    void register();
    return () => { alive=false; clearInterval(interval); window.removeEventListener("message",receive); window.removeEventListener("focus",register); };
  }, [user?.id, authorised]);
  return null;
}
