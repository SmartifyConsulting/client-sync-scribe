import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Paperclip, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/ui/page-header";

const sb = supabase as any;
const CLAIM_TYPES = ["Death", "Disability", "Income protection", "Severe illness", "Short-term (vehicle / home)", "Funeral", "Other"];
const STATUSES = ["submitted", "in_review", "awaiting_documents", "approved", "declined", "paid"];
const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted", in_review: "In review", awaiting_documents: "Awaiting documents",
  approved: "Approved", declined: "Declined", paid: "Paid",
};
const statusLabel = (s?: string | null) => STATUS_LABEL[s ?? ""] ?? (s ? s.replace(/_/g, " ") : "Submitted");
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—");

type Claim = {
  id: string; patient_id: string; application_id: string | null; claim_type: string; description: string | null;
  status: string | null; attachment_path: string | null; created_at: string; updated_at: string;
};
type Draft = { id?: string; patient_id: string; application_id: string; claim_type: string; description: string; status: string; file: File | null; attachment_path?: string | null };

export default function Claims() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isClient = role === "patient";
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  // Clients the viewer can see. RLS limits this to the client's own record or a Wealth Manager's clients.
  const clients = useQuery({
    queryKey: ["claims-clients", user?.id, isClient],
    enabled: !!user && role !== null,
    queryFn: async () => {
      let query = sb.from("patients").select("id,name").order("name");
      if (isClient) query = query.eq("patient_user_id", user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
  const clientIds = (clients.data ?? []).map((c) => c.id);
  const clientName = (id: string) => clients.data?.find((c) => c.id === id)?.name ?? "—";

  const claims = useQuery({
    queryKey: ["claims", clientIds.join(",")],
    enabled: clients.isSuccess,
    queryFn: async () => {
      if (!clientIds.length) return [] as Claim[];
      const { data, error } = await sb.from("wealth_claims").select("*").in("patient_id", clientIds).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Claim[];
    },
  });

  const apps = useQuery({
    queryKey: ["claims-apps", clientIds.join(",")],
    enabled: clients.isSuccess && clientIds.length > 0,
    queryFn: async () => {
      const { data } = await sb.from("wealth_applications").select("id,product,provider,wealth_workflows!inner(patient_id)").in("wealth_workflows.patient_id", clientIds);
      return (data ?? []).map((a: any) => ({ id: a.id, label: [a.provider, a.product].filter(Boolean).join(" · ") || "Policy", patient_id: a.wealth_workflows?.patient_id })) as { id: string; label: string; patient_id: string }[];
    },
  });
  const appLabel = (id?: string | null) => (id ? apps.data?.find((a) => a.id === id)?.label ?? "Linked policy" : "—");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (claims.data ?? []).filter((c) =>
      (statusFilter === "all" || (c.status ?? "submitted") === statusFilter) &&
      (clientFilter === "all" || c.patient_id === clientFilter) &&
      (!term || [c.claim_type, c.description, clientName(c.patient_id)].some((v) => v?.toLowerCase().includes(term))));
  }, [claims.data, q, statusFilter, clientFilter, clients.data]);

  const openNew = () => setDraft({ patient_id: isClient ? clientIds[0] ?? "" : clientFilter !== "all" ? clientFilter : "", application_id: "", claim_type: "", description: "", status: "submitted", file: null });
  const openEdit = (c: Claim) => setDraft({ id: c.id, patient_id: c.patient_id, application_id: c.application_id ?? "", claim_type: c.claim_type, description: c.description ?? "", status: c.status ?? "submitted", file: null, attachment_path: c.attachment_path });

  const viewAttachment = async (path: string) => {
    const { data, error } = await supabase.storage.from("compliance-docs").createSignedUrl(path, 300);
    if (error || !data) return toast.error("We couldn't open that attachment. Please try again.");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.patient_id) return toast.error("Choose the client this claim is for.");
    if (!draft.claim_type) return toast.error("Choose the type of claim.");
    if (draft.file && draft.file.size > 5 * 1024 * 1024) return toast.error("That file is larger than 5MB. Please attach a smaller file.");
    setSaving(true);
    try {
      let attachment_path = draft.attachment_path ?? null;
      if (draft.file) {
        const path = `${draft.patient_id}/claims/${Date.now()}-${draft.file.name}`;
        const { error } = await supabase.storage.from("compliance-docs").upload(path, draft.file);
        if (error) throw error;
        attachment_path = path;
      }
      const base = { claim_type: draft.claim_type, description: draft.description || null, application_id: draft.application_id || null, attachment_path };
      if (draft.id) {
        const patch: any = { ...base };
        if (!isClient) patch.status = draft.status;
        const { error } = await sb.from("wealth_claims").update(patch).eq("id", draft.id);
        if (error) throw error;
        toast.success("Claim updated.");
      } else {
        const { error } = await sb.from("wealth_claims").insert({ ...base, patient_id: draft.patient_id, created_by: user?.id, ...(isClient ? {} : { status: draft.status }) });
        if (error) throw error;
        toast.success(isClient ? "Claim logged. Your Wealth Manager will be in touch." : "Claim logged.");
      }
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["claims"] });
      qc.invalidateQueries({ queryKey: ["client-wealth"] });
    } catch (e: any) {
      toast.error(`We couldn't save the claim: ${e.message || "please try again."}`);
    } finally {
      setSaving(false);
    }
  };

  const draftApps = (apps.data ?? []).filter((a) => a.patient_id === draft?.patient_id);

  return (
    <div className="page-container space-y-5">
      <PageHeader
        title="Claims"
        subtitle={isClient ? "Every claim you've logged, and where each one stands." : "Claims across your clients. Log, review and update their status."}
        actions={<Button size="sm" className="rounded-full" onClick={openNew} disabled={!clientIds.length}><Plus className="mr-1 h-4 w-4" />Log a claim</Button>}
      />

      <div className="frame">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-8 pl-8 text-xs" placeholder="Search claims" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {!isClient && (
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All clients</SelectItem>{(clients.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {claims.isLoading || clients.isLoading ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : !rows.length ? (
          <p className="empty-state">{claims.data?.length ? "No claims match your filters." : isClient ? "You haven't logged any claims. Use \"Log a claim\" if you need to claim on a policy." : "No claims have been logged for your clients yet."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr>
                {!isClient && <th>Client</th>}<th>Claim type</th><th>Policy</th><th>Description</th><th>Status</th><th>Logged</th><th>Updated</th><th></th>
              </tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} onClick={() => openEdit(c)} className="cursor-pointer">
                    {!isClient && <td className="font-medium">{clientName(c.patient_id)}</td>}
                    <td>{c.claim_type}</td>
                    <td className="text-muted-foreground">{appLabel(c.application_id)}</td>
                    <td className="max-w-[260px] truncate text-muted-foreground">{c.description || "—"}</td>
                    <td><Badge variant="outline" className="rounded-full text-[10px] font-medium">{statusLabel(c.status)}</Badge></td>
                    <td className="whitespace-nowrap">{fmt(c.created_at)}</td>
                    <td className="whitespace-nowrap">{fmt(c.updated_at)}</td>
                    <td>{c.attachment_path && <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader><SheetTitle className="page-title text-lg">{draft?.id ? "Claim details" : "Log a claim"}</SheetTitle></SheetHeader>
          {draft && (
            <div className="mt-5 space-y-4">
              {!isClient && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Client</Label>
                  <Select value={draft.patient_id} onValueChange={(v) => setDraft({ ...draft, patient_id: v, application_id: "" })} disabled={!!draft.id}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose a client" /></SelectTrigger>
                    <SelectContent>{(clients.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Claim type</Label>
                <Select value={draft.claim_type} onValueChange={(v) => setDraft({ ...draft, claim_type: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose a type" /></SelectTrigger>
                  <SelectContent>{CLAIM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Policy</Label>
                <Select value={draft.application_id || "none"} onValueChange={(v) => setDraft({ ...draft, application_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Not linked to a policy</SelectItem>{draftApps.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">What happened</Label>
                <Textarea rows={4} className="text-sm" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                {isClient ? (
                  <p className="text-sm text-foreground">{statusLabel(draft.status)} <span className="text-xs text-muted-foreground">· updated by your Wealth Manager</span></p>
                ) : (
                  <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Supporting document (max 5MB)</Label>
                {draft.attachment_path && (
                  <button onClick={() => viewAttachment(draft.attachment_path!)} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Paperclip className="h-3.5 w-3.5" /> View current attachment
                  </button>
                )}
                <Input type="file" className="text-xs" onChange={(e) => setDraft({ ...draft, file: e.target.files?.[0] ?? null })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setDraft(null)}>Cancel</Button>
                <Button size="sm" className="rounded-full" onClick={save} disabled={saving}>{saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}{draft.id ? "Save changes" : "Log claim"}</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
