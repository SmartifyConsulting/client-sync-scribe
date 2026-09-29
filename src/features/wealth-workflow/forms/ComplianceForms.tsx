import { SignaturePad } from "./SignaturePad";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSignature } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { COMPLIANCE_FORMS, INSURERS, isValidSaId, type ComplianceForm } from "./definitions";

/** Library of the 7 compliance forms. Completed forms are saved to the client's documents. */
export function ComplianceForms() {
  const [open, setOpen] = useState<ComplianceForm | null>(null);
  return (
    <div className="space-y-3 max-w-5xl">
      <p className="text-sm text-muted-foreground">Compliance forms used through the advice process. Each completed form is signed, timestamped and saved to the client's documents.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {COMPLIANCE_FORMS.map((f) => (
          <Card key={f.id} className="p-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold flex items-center gap-1.5"><FileSignature className="h-4 w-4 text-primary shrink-0" />Form {f.number}: {f.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{f.when}</p>
              <span className="inline-block mt-2 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{f.stage}</span>
            </div>
            <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => setOpen(f)}>Complete</Button>
          </Card>
        ))}
      </div>
      {open && <FormDialog form={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function FormDialog({ form, onClose }: { form: ComplianceForm; onClose: () => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState("");
  const [v, setV] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [sigs, setSigs] = useState<Record<string, string | null>>({});
  const set = (k: string, val: any) => setV((p) => ({ ...p, [k]: val }));

  const { data: clients = [] } = useQuery({
    queryKey: ["compliance-form-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("id, name, id_passport_number").order("name");
      return data ?? [];
    },
  });
  const client = clients.find((c: any) => c.id === patientId) as any;
  const adviser = (profile as any)?.full_name || "Wealth Manager";
  const single = form.id === "fna" && v.singleNeed;

  const submit = async () => {
    if (!client) return toast({ title: "Choose a client", description: "Select the client this form is for.", variant: "destructive" });
    for (const f of form.fields) {
      if (single && f.fnaOnly) continue;
      if (f.required && !v[f.key]) return toast({ title: `${f.label} is missing`, description: "Complete every required field before signing.", variant: "destructive" });
      if (f.type === "said" && v[f.key] && !isValidSaId(v[f.key])) return toast({ title: "ID number is not valid", description: "Enter the client's 13-digit South African ID number.", variant: "destructive" });
    }
    if (!v.clientSignature?.trim()) return toast({ title: "Client signature missing", description: "The client must type their full name to sign.", variant: "destructive" });
    if (form.adviserSigns && !v.adviserSignature?.trim()) return toast({ title: "Adviser signature missing", description: "Type your full name to sign.", variant: "destructive" });
    if (form.id === "fica" && v.adverse) {
      if (!confirm("An adverse finding marks this client as high risk and stops onboarding. Continue?")) return;
    }
    setSaving(true);
    const stamp = new Date().toISOString();
    const attachments: { name: string; path: string; kind: string }[] = [];
    const upload = async (key: string, blob: Blob, name: string) => {
      const path = `${client.id}/${form.id}/${Date.now()}-${key}-${name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("compliance-docs").upload(path, blob);
      if (error) throw error;
      attachments.push({ name, path, kind: key });
    };
    try {
      for (const [k, f] of Object.entries(files)) await upload(k, f, f.name);
      for (const [k, d] of Object.entries(sigs)) if (d) await upload(k, await (await fetch(d)).blob(), `${k}.png`);
    } catch (e: any) {
      setSaving(false);
      return toast({ title: "Upload failed", description: "A file or signature couldn't be stored. Check your connection and try again.", variant: "destructive" });
    }
    const lines = form.fields.filter((f) => !(single && f.fnaOnly)).map((f) => `${f.label}: ${Array.isArray(v[f.key]) ? v[f.key].join(", ") : typeof v[f.key] === "boolean" ? (v[f.key] ? "Yes" : "No") : v[f.key] ?? "—"}`);
    const body = [
      `# Form ${form.number}: ${form.title}`,
      `Client: ${client.name}`,
      `Wealth Manager: ${adviser}`,
      form.disclosure ? `\n${form.disclosure(adviser)}\n` : "",
      single ? `\nSINGLE NEED DISCLAIMER\nThe client has declined a full Financial Needs Analysis and understands advice is limited to the single need stated.\n` : "",
      ...lines,
      "",
      `Client signature: ${v.clientSignature}`,
      form.adviserSigns ? `Adviser signature: ${v.adviserSignature}` : "",
      `Signed: ${new Date(stamp).toLocaleString("en-ZA")} (${stamp})`,
    ].filter(Boolean).join("\n");
    const kind = form.id === "fna" && single ? "fna_disclaimer" : form.id === "fica" && v.adverse ? "fica_adverse" : form.kind;
    const { error } = await supabase.from("documents").insert({
      user_id: user!.id, patient_id: client.id, patient_name: client.name,
      name: `${form.title} — ${client.name}`, template_name: `Form ${form.number}: ${form.title}`,
      content: body, document_kind: kind, record_date: stamp.slice(0, 10), attachments,
    } as any);
    setSaving(false);
    if (error) return toast({ title: "Form not saved", description: error.message, variant: "destructive" });
    toast({ title: "Form signed and saved", description: `Saved to ${client.name}'s documents.` });
    qc.invalidateQueries();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Form {form.number}: {form.title}</DialogTitle>
          <DialogDescription>{form.when}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select value={patientId} onValueChange={(id) => { setPatientId(id); const c: any = clients.find((x: any) => x.id === id); if (c) setV((p) => ({ ...p, fullName: p.fullName || c.name, idNumber: p.idNumber || c.id_passport_number || "" })); }}>
              <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
              <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {form.disclosure && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs whitespace-pre-wrap max-h-56 overflow-y-auto">{form.disclosure(adviser)}</div>
          )}
          {form.id === "fna" && (
            <label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={!!v.singleNeed} onCheckedChange={(c) => set("singleNeed", !!c)} />Proceed as a Single Need Only (no full FNA requested by client)</label>
          )}
          {single && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">I confirm I have declined a full Financial Needs Analysis. I understand that advice is limited to the single need I have requested and may not identify other gaps in my financial position.</div>
          )}
          {form.fields.filter((f) => !(single && f.fnaOnly)).map((f) => (
            <div key={f.key} className="space-y-1.5">
              {f.type !== "check" && <Label>{f.label}{f.required ? " *" : ""}</Label>}
              {f.type === "text" || f.type === "said" || f.type === "number" || f.type === "date" ? (
                <Input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} inputMode={f.type === "said" ? "numeric" : undefined} maxLength={f.type === "said" ? 13 : 300} value={v[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
              ) : f.type === "textarea" ? (
                <Textarea rows={4} maxLength={5000} value={v[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
              ) : f.type === "insurers" ? (
                <div className="flex flex-wrap gap-3">{INSURERS.map((i) => (
                  <label key={i} className="flex items-center gap-1.5 text-sm"><Checkbox checked={(v[f.key] ?? []).includes(i)} onCheckedChange={(c) => set(f.key, c ? [...(v[f.key] ?? []), i] : (v[f.key] ?? []).filter((x: string) => x !== i))} />{i}</label>
                ))}</div>
              ) : f.type === "file" ? (
                <Input type="file" accept="image/*,application/pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file && file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "Files must be 5MB or smaller.", variant: "destructive" }); e.target.value = ""; return; } set(f.key, file?.name ?? ""); setFiles((p) => { const n = { ...p }; if (file) n[f.key] = file; else delete n[f.key]; return n; }); }} />
              ) : f.type === "range" ? (
                <div className="flex items-center gap-3"><input type="range" min={1} max={5} value={v[f.key] ?? 3} onChange={(e) => set(f.key, e.target.value)} className="flex-1" /><span className="text-sm w-6">{v[f.key] ?? 3}</span></div>
              ) : f.type === "radio" ? (
                <div className="space-y-1.5">{f.options!.map((o) => (
                  <label key={o} className="flex items-start gap-2 text-sm"><input type="radio" name={f.key} checked={v[f.key] === o} onChange={() => set(f.key, o)} className="mt-1" />{o}</label>
                ))}</div>
              ) : (
                <label className="flex items-start gap-2 text-sm"><Checkbox checked={!!v[f.key]} onCheckedChange={(c) => set(f.key, !!c)} />{f.label}{f.required ? " *" : ""}</label>
              )}
            </div>
          ))}
          <div className="grid gap-3 sm:grid-cols-2 border-t pt-3">
            <div className="space-y-1.5"><Label>Client signature (type full name) *</Label><Input value={v.clientSignature ?? ""} onChange={(e) => set("clientSignature", e.target.value)} className="font-[cursive]" /><Label className="text-xs text-muted-foreground">Or draw signature</Label><SignaturePad onChange={(d) => setSigs((p) => ({ ...p, client_signature: d }))} /></div>
            {form.adviserSigns && <div className="space-y-1.5"><Label>Adviser signature (type full name) *</Label><Input value={v.adviserSignature ?? ""} onChange={(e) => set("adviserSignature", e.target.value)} className="font-[cursive]" /><Label className="text-xs text-muted-foreground">Or draw signature</Label><SignaturePad onChange={(d) => setSigs((p) => ({ ...p, adviser_signature: d }))} /></div>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Sign and save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
