import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { recordPortalConnection } from "./portalLoginStatus";
import { toast } from "sonner";
import { ProtectorDialog } from "./InsurerLogin";

/** Route-independent connection recording and structural-incident forwarding. Never stores credentials. */
export function CompanionCoordinator() {
  const { user } = useAuth();
  const { hasAdvisorRole, hasAdminRole } = useUserRole();
  const authorised = hasAdvisorRole || hasAdminRole;
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockBusy, setUnlockBusy] = useState(false);
  const resume = useRef<(() => void) | null>(null);
  const unlock = async (passcode: string) => {
    setUnlockBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-broker-credentials", { body: { action: "reauth", passcode } });
      if (error || data?.error || !data?.token) { toast.error("Password Protector could not be unlocked. Please try again."); return; }
      sessionStorage.setItem("holarc-cred-token", JSON.stringify({ token: data.token, uid: user?.id, exp: Date.now() + Math.min(data.expiresInMs ?? 1800000, 1800000) }));
      setUnlockOpen(false); resume.current?.();
    } catch { toast.error("Password Protector could not be unlocked. Please try again."); }
    finally { setUnlockBusy(false); }
  };
  useEffect(() => {
    if (!user || !authorised) return;
    const key = `holarc-connection-attempts:${user.id}`;
    let pending: Record<string, { integrationId: string; provider: string; expires: number; attemptId?:string }> = {};
    try { pending = JSON.parse(sessionStorage.getItem(key) || "{}"); } catch { /* metadata only */ }
    const known = new Set<string>();
    const providerNames = new Map<string, string>();
    const renewal = new Map<string, any>();
    const renewing = new Set<string>();
    const renewed = new Set<string>();
    const stopped = new Set<string>();
    const announced = new Set<string>();
    const uploaded = new Set<string>(), uploading = new Set<string>();
    const observed = new Map<string, number>();
    let lastSaveError=0;
    const saveResult = (id:string,outcome:"success"|"failed") => recordPortalConnection(id,outcome).catch(()=>{
      if(Date.now()-lastSaveError>60_000){lastSaveError=Date.now();toast.error("The connection time could not be saved. Please refresh Holarc.");}
    });
    let alive = true;
    const renew = async (request: any) => {
      const id = request.recoveryId, scope = `${request.workflowId}|${request.insurer}`;
      if (!alive || renewed.has(id) || renewing.has(id) || stopped.has(scope) || !known.has(request.integrationId) || request.ownerId !== user.id || providerNames.get(request.integrationId) !== request.insurer) return;
      let token: string | null = null;
      try { const t = JSON.parse(sessionStorage.getItem("holarc-cred-token") || "null"); if (t?.uid === user.id && t.exp > Date.now()) token = t.token; } catch { /* expired/locked */ }
      const reply = (credentials = {}) => window.postMessage({ source: "holarc", type: "insurer-reconnect-credentials", insurer: request.insurer,
        workflowId: request.workflowId, connectionAttemptId: request.connectionAttemptId, recoveryId: id, ...credentials }, location.origin);
      const needsUnlock = () => {
        reply();
        if (!announced.has(id)) {
          announced.add(id);
          toast("Unlock Password Protector to reconnect", { action: { label: "Unlock", onClick: () => setUnlockOpen(true) } });
          setUnlockOpen(true);
        }
      };
      if (!token) { needsUnlock(); return; }
      renewing.add(id);
      try {
        const { data, error } = await supabase.functions.invoke("manage-broker-credentials", { body: { action: "reveal", integrationId: request.integrationId, token } });
        if (!alive || stopped.has(scope) || renewal.get(id) !== request) return;
        if (error || data?.error || !data?.fields?.password) { needsUnlock(); return; }
        const username = data.fields.username ?? data.username;
        if (!username) { needsUnlock(); return; }
        const pendingRequest = { integrationId: request.integrationId, provider: request.insurer, expires: Date.now() + 20 * 60_000, attemptId: request.connectionAttemptId };
        pending[scope] = pendingRequest;
        if (request.connectionAttemptId) pending[request.connectionAttemptId] = pendingRequest;
        persist();
        reply({ username, password: data.fields.password });
        renewed.add(id);
        renewal.delete(id);
      } catch { if (alive && !stopped.has(scope)) toast.error("Could not reconnect. Check your connection, then unlock Password Protector to retry."); }
      finally { renewing.delete(id); }
    };
    resume.current = () => { for (const request of renewal.values()) void renew(request); };
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
      providerNames.clear();
      const statuses = response.data?.credentials || [];
      const apps = (catalog.data || []).flatMap(entry => {
        const saved = statuses.find((row: any) => row.integration_id === entry.id && row.is_enabled && row.status === "configured");
        if (!saved) return [];
        try {
          const url = new URL(saved.portal_url || entry.portal_url);
          if (url.protocol !== "https:" || url.username || url.password) return [];
          known.add(entry.id);
          providerNames.set(entry.id, entry.name);
          return [{ id: entry.id, name: entry.name, origin: url.origin }];
        } catch { return []; }
      });
      window.postMessage({ source: "holarc", type: "companion-interface-register", apps }, location.origin);
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin) return;
      const data = event.data;
      if(data?.source==='holarc'&&data.type==='insurer-stop'){
        stopped.add(`${data.workflowId}|${data.insurer}`);
        for (const [id,r] of renewal) if(r.workflowId===data.workflowId&&r.insurer===data.insurer) renewal.delete(id);
        const request=pending[`${data.workflowId}|${data.insurer}`];
        if(!data.connectionAttemptId||request?.attemptId===data.connectionAttemptId){delete pending[`${data.workflowId}|${data.insurer}`];if(request?.attemptId)delete pending[request.attemptId];persist();}
      }
      if (data?.source === "holarc" && data.type === "insurer-login" && typeof data.integrationId === "string" && typeof data.workflowId === "string") {
        stopped.delete(`${data.workflowId}|${data.insurer}`);
        const request={ integrationId: data.integrationId, provider: data.insurer, expires: Date.now() + 20 * 60_000,attemptId:typeof data.connectionAttemptId==='string'?data.connectionAttemptId:undefined };
        pending[`${data.workflowId}|${data.insurer}`] = request;
        if(typeof data.connectionAttemptId==='string')pending[data.connectionAttemptId]=request;
        persist();
      }
      if (data?.source !== "holarc-extension") return;
      if (data.type === "insurer-session-expired" && data.ownerId === user.id && typeof data.recoveryId === "string" && typeof data.workflowId === "string" && typeof data.insurer === "string" && known.has(data.integrationId)) {
        if (renewed.has(data.recoveryId)) return;
        if (!renewal.has(data.recoveryId)) renewal.set(data.recoveryId, data);
        void renew(renewal.get(data.recoveryId));
      }
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
    return () => { alive=false; resume.current=null; renewal.clear(); clearInterval(interval); window.removeEventListener("message",receive); window.removeEventListener("focus",register); };
  }, [user?.id, authorised]);
  return <ProtectorDialog open={unlockOpen && !!user && authorised} busy={unlockBusy} onClose={() => setUnlockOpen(false)} onSubmit={unlock} />;
}
