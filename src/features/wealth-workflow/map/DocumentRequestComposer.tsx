import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

const DEFAULT_SUBJECT: Record<Kind, string> = {
  schedules_claims: "Request for policy schedules and claims history",
  quotes: "Request for quote",
};
const DEFAULT_BODY: Record<Kind, (client: string) => string> = {
  schedules_claims: (c) => `Good day,\n\nPlease could you send the current policy schedules and claims history for our mutual client, ${c}.\n\nMany thanks,`,
  quotes: (c) => `Good day,\n\nPlease could you provide a quote for our client, ${c}, based on the attached information.\n\nMany thanks,`,
};

type Kind = "schedules_claims" | "quotes";

export function DocumentRequestComposer({ kind, workflowId, patientId, clientName }: { kind: Kind; workflowId: string; patientId: string; clientName: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [checkedInsurers, setCheckedInsurers] = useState<Set<string>>(new Set());
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState(DEFAULT_SUBJECT[kind]);
  const [body, setBody] = useState(DEFAULT_BODY[kind](clientName));
  const [busy, setBusy] = useState(false);

  const insurers = useQuery({
    queryKey: ["wealth-insurer-contacts", user?.id],
    enabled: !!user,
    queryFn: async () => (await db.from("wealth_insurer_contacts").select("*").eq("broker_user_id", user!.id).order("sort_order")).data ?? [],
  });

  const docs = useQuery({
    queryKey: ["client-documents-for-request", patientId],
    enabled: kind === "quotes" && !!patientId,
    queryFn: async () => (await db.from("documents").select("id,name,document_kind").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(30)).data ?? [],
  });

  const requests = useQuery({
    queryKey: ["document-requests", workflowId, kind],
    enabled: !!workflowId,
    queryFn: async () => (await db.from("wealth_document_requests").select("*").eq("workflow_id", workflowId).eq("kind", kind).order("created_at", { ascending: false })).data ?? [],
  });

  // Default-select every insurer that has an address on file.
  useEffect(() => {
    const withAddress = (insurers.data ?? []).filter((i: any) => i.request_address);
    setCheckedInsurers(new Set(withAddress.map((i: any) => i.insurer_name)));
  }, [insurers.data]);

  useEffect(() => {
    if (kind !== "quotes") return;
    setCheckedDocs(new Set((docs.data ?? []).map((d: any) => d.id)));
  }, [docs.data, kind]);

  const selectedInsurers = useMemo(
    () => (insurers.data ?? []).filter((i: any) => checkedInsurers.has(i.insurer_name) && i.request_address),
    [insurers.data, checkedInsurers],
  );

  const send = async () => {
    if (!selectedInsurers.length) return toast({ title: "Select at least one insurer with an address", variant: "destructive" });
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("wealth-send-document-request", {
      body: {
        workflowId, patientId, kind, subject, body,
        insurers: selectedInsurers.map((i: any) => ({ name: i.insurer_name, address: i.request_address })),
        attachedDocumentIds: kind === "quotes" ? Array.from(checkedDocs) : [],
      },
    });
    setBusy(false);
    if (error || data?.error) return toast({ title: "Couldn't send the request", description: data?.error ?? "Please try again.", variant: "destructive" });
    toast({ title: `Sent to ${data.sent} insurer${data.sent === 1 ? "" : "s"}`, description: data.failed?.length ? `Failed: ${data.failed.join(", ")}` : undefined });
    qc.invalidateQueries({ queryKey: ["document-requests"] });
    qc.invalidateQueries({ queryKey: ["wealth-map-records"] });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold"><Mail className="h-3.5 w-3.5" /> Request by email</p>

      <div>
        <p className="mb-1 text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Insurers</p>
        {insurers.isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
          <div className="grid max-h-32 grid-cols-2 gap-1 overflow-y-auto">
            {(insurers.data ?? []).map((i: any) => (
              <label key={i.id} className={`flex items-center gap-1.5 text-xs ${!i.request_address ? "opacity-40" : ""}`}>
                <input type="checkbox" disabled={!i.request_address} checked={checkedInsurers.has(i.insurer_name)}
                  onChange={(e) => setCheckedInsurers((s) => { const n = new Set(s); e.target.checked ? n.add(i.insurer_name) : n.delete(i.insurer_name); return n; })} />
                {i.insurer_name}
              </label>
            ))}
          </div>
        )}
        <p className="mt-1 text-2xs text-muted-foreground">Manage addresses in the Quotes screen.</p>
      </div>

      {kind === "quotes" && !!docs.data?.length && (
        <div>
          <p className="mb-1 text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Documents to attach</p>
          <div className="max-h-28 space-y-1 overflow-y-auto">
            {docs.data.map((d: any) => (
              <label key={d.id} className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={checkedDocs.has(d.id)}
                  onChange={(e) => setCheckedDocs((s) => { const n = new Set(s); e.target.checked ? n.add(d.id) : n.delete(d.id); return n; })} />
                {d.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Template</p>
        <Input className="h-8 text-xs" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea rows={4} className="text-xs" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>

      <Button size="sm" className="w-full rounded-full" disabled={busy || !selectedInsurers.length} onClick={send}>
        {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
        Send to {selectedInsurers.length || 0} insurer{selectedInsurers.length === 1 ? "" : "s"}
      </Button>

      {!!requests.data?.length && (
        <div className="space-y-1">
          <p className="text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Sent requests</p>
          {requests.data.map((r: any) => (
            <p key={r.id} className="text-2xs text-muted-foreground">
              {new Date(r.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })} · {r.insurer_names.join(", ")} · {r.status === "documents_received" ? "Documents filed" : "Awaiting reply"}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
