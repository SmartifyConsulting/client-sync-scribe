import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { MessageThread, sendMessage, useMessages } from "@/features/messenger/MessageThread";
import type { WealthRecommendation } from "../types";

/**
 * Izenzo-style offer / counter-offer loop on the Record of Advice.
 * The client requests changes, the Wealth Manager counters, until the client agrees.
 * Agreement locks the current version (changes_requested) and the Wealth Manager redrafts a new version.
 */
export function RoaNegotiation({ viewer, patientId, workflowId, recs, current, clientFirst, onAccept, accepting }: {
  viewer: "manager" | "client"; patientId?: string; workflowId: string; recs: WealthRecommendation[];
  current: WealthRecommendation; clientFirst: string; onAccept: () => void; accepting: boolean;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: pt } = useQuery({
    queryKey: ["patient-parties", patientId], enabled: !!patientId,
    queryFn: async () => (await (supabase as any).from("patients").select("user_id").eq("id", patientId).maybeSingle()).data,
  });
  const advisorId: string | null = pt?.user_id ?? null;
  const { data: advisor } = useQuery({
    queryKey: ["profile-name", advisorId], enabled: !!advisorId,
    queryFn: async () => (await supabase.from("profiles").select("full_name").eq("id", advisorId!).maybeSingle()).data,
  });
  const wmFirst = advisor?.full_name?.split(" ")[0] || "Your Wealth Manager";
  // Thread spans the version under discussion; when redrafted it continues on the new version.
  const { data: msgs = [] } = useMessages(patientId, current.id);
  const agreed = current.status === "changes_requested";
  const hasRequest = msgs.some((m) => m.kind === "change_request");

  const agree = async () => {
    if (!patientId) return;
    setBusy(true);
    try {
      await sendMessage(patientId, "I agree to these changes. Please redraft the Record of Advice.", "accept", current.id);
      const { error } = await (supabase as any).rpc("wealth_record_decision", { _recommendation_id: current.id, _decision: "changes_requested", _reason: "Changes agreed in conversation" });
      if (error) throw error;
      qc.invalidateQueries();
      toast({ title: `Agreed. ${wmFirst} will redraft your Record of Advice.` });
    } catch (e: any) {
      toast({ title: "That didn't go through", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const redraft = async () => {
    if (!patientId) return;
    setBusy(true);
    try {
      const agreedText = msgs.filter((m) => m.kind !== "accept").map((m) => `- ${m.body}`).join("\n");
      const nextVersion = Math.max(...recs.map((r) => r.version)) + 1;
      let roaId: string | null = null;
      if (current.roa_document_id) {
        const { data: doc } = await (supabase as any).from("documents").select("*").eq("id", current.roa_document_id).maybeSingle();
        if (doc) {
          const { id, created_at, updated_at, ...rest } = doc;
          const note = `<h2>Changes agreed with ${clientFirst}</h2><ul>${msgs.filter((m) => m.kind !== "accept").map((m) => `<li>${m.body.replace(/</g, "&lt;")}</li>`).join("")}</ul>`;
          const content = String(rest.content ?? "").replace("<!--/roa-body-->", `${note}<!--/roa-body-->`);
          const ins = await (supabase as any).from("documents").insert({ ...rest, title: `Record of Advice v${nextVersion}`, content: content.includes(note) ? content : content + note }).select("id").single();
          if (ins.error) throw ins.error;
          roaId = ins.data.id;
        }
      }
      const { error } = await (supabase as any).from("wealth_recommendations").insert({
        workflow_id: workflowId, version: nextVersion, title: current.title, supersedes_id: current.id, status: "draft",
        summary: `${current.summary ?? ""}\n\nAgreed changes:\n${agreedText}`.trim(), roa_document_id: roaId,
      });
      if (error) throw error;
      await sendMessage(patientId, `I've redrafted your Record of Advice as version ${nextVersion} with the changes we agreed.`, "redraft", current.id);
      qc.invalidateQueries();
      toast({ title: `Version ${nextVersion} drafted. Present it to ${clientFirst} when ready.` });
    } catch (e: any) {
      toast({ title: "Could not redraft", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  if (!patientId) return null;
  const canAct = current.status === "presented";

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {viewer === "client"
          ? `Not quite right? Tell ${wmFirst} what you'd like changed. You can go back and forth until you're happy.`
          : `Discuss changes with ${clientFirst} here. Once ${clientFirst} agrees, redraft the Record of Advice.`}
      </p>
      <MessageThread patientId={patientId} advisorUserId={advisorId} recommendationId={current.id} compact
        names={{ advisor: wmFirst, client: clientFirst }} hideComposer={agreed || current.status === "draft"} />
      {viewer === "client" && canAct && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button className="rounded-full" disabled={accepting || busy} onClick={onAccept}><Check className="mr-2 h-4 w-4" />I accept this advice</Button>
          <Button variant="outline" className="rounded-full" disabled={busy || !hasRequest} onClick={agree} title={hasRequest ? undefined : "Send your requested changes first"}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Repeat className="mr-2 h-4 w-4" />}Agree changes and redraft
          </Button>
        </div>
      )}
      {viewer === "manager" && agreed && (
        <Button className="w-full rounded-full" disabled={busy} onClick={redraft}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Redraft ROA with agreed changes
        </Button>
      )}
      {viewer === "client" && agreed && <p className="text-xs text-muted-foreground">{wmFirst} is redrafting your Record of Advice with the changes you agreed.</p>}
      {current.status === "draft" && <p className="text-xs text-muted-foreground">{viewer === "client" ? `${wmFirst} is preparing version ${current.version}. You'll see it here once it's presented.` : `Version ${current.version} is a draft. Present it to ${clientFirst} in the step above.`}</p>}
    </div>
  );
}
