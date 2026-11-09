import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { FileSignature } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplateSectionEditor } from "@/features/documents/templates/TemplateSectionEditor";
import { disclosureHtml, loaHtml, roaHtml, serviceAgreementHtml, complianceFormHtml } from "../map/onboardingTemplates";
import { defaultRoaBody } from "../map/RoaDraftForm";
import { COMPLIANCE_FORMS } from "./definitions";
import defaultLogo from "@/assets/elysian-logo-navy.png";

type Template = { template_key: string; title: string; content: string; archived: boolean };
const db = supabase as any;
const clean = (html: string) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const client = "[Client name]";
const date = "[Record date]";
// Template previews have no specific Wealth Manager's saved firm profile to
// pull a logo from, so show the platform's own logo rather than a blank header.
const defaultPractice = { __businessLogo: defaultLogo };
const defaults: Template[] = COMPLIANCE_FORMS.flatMap(form => {
  const base = { template_key: form.id, title: `Form ${form.number} · ${form.title}`, archived: false };
  if (form.id === "mandate") return [
    { ...base, template_key: "disclosure", title: "Disclosure Agreement", content: disclosureHtml(client, date, defaultPractice) },
    { ...base, template_key: "loa", title: "Letter of Authority", content: loaHtml(client, date, defaultPractice) },
    { ...base, template_key: "service_agreement", title: "Masthead Service Level Agreement", content: serviceAgreementHtml(client, date, defaultPractice) },
  ];
  if (form.id === "roa") return [{ ...base, content: roaHtml(defaultRoaBody(), client, date, "[Version]", defaultPractice, {
    adviceDate: "[Advice date]", adviser: "[Adviser name]", contact: "[Client contact]",
  }) }];
  if (form.id === "broker_change") return [{ ...base, content: complianceFormHtml("Broker Change Letter", client, date,
    `<p style="margin:0 0 12px">Current broker: [Current broker]<br>New broker: [New broker]<br>New firm or FSP: [New firm or FSP]<br>Insurers and policy numbers: [Insurers and policy numbers]</p>
    <p style="margin:0">I request that the named broker be appointed for the policies listed above.</p>`, defaultPractice) }];
  if (form.id === "limited_advice_waiver") return [{ ...base, content: complianceFormHtml("Limited Advice Waiver", client, date,
    `<p style="margin:0 0 12px">I confirm the information I supplied is complete and correct for the advice requested. I decline a full financial needs analysis and understand that other needs may go unidentified.</p>
    <p style="margin:0">Scope of advice: [Requested scope]</p>`, defaultPractice) }];
  return [{ ...base, content: complianceFormHtml(form.title, client, date,
    `<p style="margin:0 0 12px">Adviser: [Adviser name]</p>
    ${form.fields.map(field => `<p style="margin:0 0 12px"><strong>${escape(field.label)}</strong>${field.type === "check" ? " ☐" : `: ${field.options ? escape(field.options.join(" / ")) : "[Response]"}`}</p>`).join("")}`, defaultPractice) }];
});

function TemplateDialog({ item, viewing, onClose, onSave }: {
  item: Template; viewing: boolean; onClose: () => void; onSave: (item: Template) => Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(() => clean(item.content));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave({ ...item, title: title.trim(), content: clean(body) });
      onClose();
    } catch {
      // Keep the editor open so the changes can be retried.
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
      <DialogHeader><DialogTitle>{viewing ? item.title : "Edit form template"}</DialogTitle></DialogHeader>
      {viewing ? <div className="overflow-x-auto rounded-lg border bg-white p-4 text-sm text-slate-900" dangerouslySetInnerHTML={{ __html: body }} /> :
        <div className="space-y-3">
          <div className="space-y-1"><Label htmlFor="wealth-template-title">Template name</Label><Input id="wealth-template-title" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="space-y-1"><Label>Document content</Label><TemplateSectionEditor value={{ text: body, alignment: "left" }} onChange={value => setBody(value.text)} rows={12} showImageUpload={false} /></div>
        </div>}
      <DialogFooter>
        <Button variant="outline" disabled={saving} onClick={onClose}>{viewing ? "Close" : "Cancel"}</Button>
        {!viewing && <Button disabled={saving || !title.trim() || !body.trim()} onClick={() => void save()}>{saving ? "Saving…" : "Save template"}</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function ComplianceForms() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ item: Template; viewing: boolean } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState<string>();
  const key = ["wealth-form-templates", user?.id];
  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async (): Promise<Template[]> => {
      const { data, error } = await db.from("wealth_form_templates").select("template_key,title,content,archived").eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function save(item: Template) {
    const { error } = await db.from("wealth_form_templates").upsert({ user_id: user!.id, ...item }, { onConflict: "user_id,template_key" });
    if (error) {
      toast({ title: "Template not saved", description: error.message, variant: "destructive" });
      throw error;
    }
    await qc.cancelQueries({ queryKey: key });
    qc.setQueryData<Template[]>(key, rows => [...(rows ?? []).filter(row => row.template_key !== item.template_key), item]);
  }

  async function archive(item: Template) {
    setBusy(item.template_key);
    try {
      await save({ ...item, archived: !item.archived });
      toast({ title: item.archived ? "Template restored" : "Template archived" });
    } catch {
      // Save reports the error.
    } finally {
      setBusy(undefined);
    }
  }

  const stored = new Map(query.data?.map(item => [item.template_key, item]));
  const items = [...defaults.map(item => stored.get(item.template_key) ?? item), ...(query.data ?? []).filter(item => item.template_key.startsWith("custom:"))];
  const editNew = (title = "", content = "") => setDialog({
    item: { template_key: `custom:${crypto.randomUUID()}`, title, content, archived: false }, viewing: false,
  });

  if (query.isPending) return <p className="text-xs text-muted-foreground">Loading templates…</p>;
  if (query.isError) return <Button variant="outline" onClick={() => void query.refetch()}>Could not load templates · Retry</Button>;
  return <div className="max-w-5xl space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">View and edit the document templates in your library. Complete and sign client documents in their workflow.</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" aria-pressed={showArchived} onClick={() => setShowArchived(value => !value)}>{showArchived ? "Active templates" : "Archived templates"}</Button>
        <Button size="sm" onClick={() => editNew()}>Add new</Button>
      </div>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      {items.filter(item => item.archived === showArchived).map(item => <Card key={item.template_key} className="space-y-3 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold"><FileSignature className="h-4 w-4 shrink-0 text-primary" />{item.title}</p>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setDialog({ item, viewing: true })}>View</Button>
          {!item.archived && <Button size="sm" variant="outline" onClick={() => setDialog({ item, viewing: false })}>Edit</Button>}
          <Button size="sm" variant="outline" onClick={() => editNew(`${item.title.slice(0, 193)} (copy)`, item.content)}>Copy</Button>
          <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void archive(item)}>{item.archived ? "Restore" : "Archive"}</Button>
        </div>
      </Card>)}
    </div>
    {!items.some(item => item.archived === showArchived) && <p className="text-xs text-muted-foreground">No {showArchived ? "archived" : "active"} templates.</p>}
    {dialog && <TemplateDialog key={dialog.item.template_key} item={dialog.item} viewing={dialog.viewing} onClose={() => setDialog(null)} onSave={save} />}
  </div>;
}
