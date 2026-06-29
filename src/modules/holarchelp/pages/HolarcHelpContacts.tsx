import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, UserPlus, ChevronLeft, ChevronDown, Pencil, Check, X, Info } from "lucide-react";
import { toast } from "sonner";

type Severity = "low" | "medium" | "high" | "critical";
type Source = "manual" | "personal_info_seed";
type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  notify_min_severity: Severity;
  source?: Source;
  personal_info_ref?: string | null;
};

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: "low", label: "Low (any incident)" },
  { value: "medium", label: "Medium or higher" },
  { value: "high", label: "High or critical only" },
  { value: "critical", label: "Critical only" },
];

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6, "Enter a valid number with country code").max(20),
  email: z.string().trim().email("Enter a valid email").max(255),
  relationship: z.string().trim().max(60).optional(),
  notify_min_severity: z.enum(["low", "medium", "high", "critical"]),
});

const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2) || "?";

export default function HolarcHelpContacts() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Contact>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; phone: string; email: string; relationship: string; notify_min_severity: Severity }>({
    name: "", phone: "", email: "", relationship: "", notify_min_severity: "low",
  });

  const load = async () => {
    const { data } = await supabase
      .from("holarchelp_emergency_contacts" as any)
      .select("*")
      .order("created_at", { ascending: true });
    setContacts((data as any) ?? []);
    setLoading(false);
    return (data as any) ?? [];
  };

  // First load + auto-seed from Personal Information if SOS list is empty
  useEffect(() => {
    if (!user) return;
    (async () => {
      const initial = await load();
      if (initial.length === 0) {
        try {
          const { data, error } = await supabase.functions.invoke("seed-sos-contacts-from-personal-info");
          if (!error && (data as any)?.seeded > 0) {
            await load();
          }
        } catch {
          /* non-fatal: page still works empty */
        }
      }
    })();
  }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { error } = await supabase.from("holarchelp_emergency_contacts" as any).insert({
      user_id: user.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      relationship: parsed.data.relationship || null,
      notify_min_severity: parsed.data.notify_min_severity,
      source: "manual",
    } as any);
    if (error) return toast.error(error.message);
    setForm({ name: "", phone: "", email: "", relationship: "", notify_min_severity: "low" });
    setAddOpen(false);
    toast.success("Contact added");
    load();
  };

  const updateSeverity = async (id: string, sev: Severity) => {
    const { error } = await supabase
      .from("holarchelp_emergency_contacts" as any)
      .update({ notify_min_severity: sev } as any)
      .eq("id", id);
    if (error) return toast.error(error.message);
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, notify_min_severity: sev } : c)));
  };

  const remove = async (id: string) => {
    await supabase.from("holarchelp_emergency_contacts" as any).delete().eq("id", id);
    toast.success("Removed");
    load();
  };

  const startEdit = (c: Contact) => {
    setEditingId(c.id);
    setEditDraft({ name: c.name, phone: c.phone, email: c.email, relationship: c.relationship });
  };

  const cancelEdit = () => { setEditingId(null); setEditDraft({}); };

  const saveEdit = async (id: string) => {
    const patch: any = {
      name: (editDraft.name ?? "").toString().trim(),
      phone: (editDraft.phone ?? "")?.toString().trim() || null,
      email: (editDraft.email ?? "")?.toString().trim() || null,
      relationship: (editDraft.relationship ?? "")?.toString().trim() || null,
    };
    if (!patch.name) return toast.error("Name is required");
    const { error } = await supabase.from("holarchelp_emergency_contacts" as any).update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } as Contact : c)));
    cancelEdit();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-2 h-8 -ml-2 gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/patient/holarchelp")}
      >
        <ChevronLeft className="h-4 w-4" /> {t("common.back")}
      </Button>

      <h1 className="text-2xl font-extrabold">{t("holarcHelp.emergency.contacts.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("holarcHelp.emergency.contacts.description")}
      </p>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3 text-xs text-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <span>
          {t("holarcHelp.emergency.contacts.infoText")}
        </span>
      </div>

      {/* Contact list — scannable first */}
      <ul className="mt-5 space-y-2">
        {loading && (
          <li className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">{t("common.loading")}</li>
        )}
        {!loading && contacts.length === 0 && (
          <li className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">
            {t("holarcHelp.emergency.contacts.noContacts")}
          </li>
        )}
        {contacts.map((c) => {
          const isEditing = editingId === c.id;
          return (
            <li key={c.id} className="rounded-2xl border-2 border-primary/30 bg-card p-3 shadow-[var(--shadow-card)]">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials(c.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px]">{t("common.name")}</Label>
                        <Input value={(editDraft.name ?? "") as string} onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-[11px]">{t("holarcHelp.emergency.contacts.relationship")}</Label>
                        <Input value={(editDraft.relationship ?? "") as string} onChange={(e) => setEditDraft((d) => ({ ...d, relationship: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-[11px]">{t("common.phone")}</Label>
                        <Input value={(editDraft.phone ?? "") as string} onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-[11px]">{t("common.email")}</Label>
                        <Input type="email" value={(editDraft.email ?? "") as string} onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{c.name}</p>
                        {c.relationship && (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">· {c.relationship}</span>
                        )}
                        {c.source === "personal_info_seed" && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {t("holarcHelp.emergency.contacts.fromPersonalInfo")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.email}{c.phone && ` · ${c.phone}`}
                      </p>
                    </>
                  )}

                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Select value={c.notify_min_severity ?? "low"} onValueChange={(v) => updateSeverity(c.id, v as Severity)}>
                      <SelectTrigger className="h-8 w-[180px] rounded-lg text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => saveEdit(c.id)} aria-label={t("common.save")}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit} aria-label={t("common.cancel")}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(c)} aria-label={t("common.edit")}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(c.id)} aria-label={t("common.delete")}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Add form — collapsible, below the list */}
      <Collapsible open={addOpen} onOpenChange={setAddOpen} className="mt-5 rounded-2xl border-2 border-primary/30 bg-card">
        <CollapsibleTrigger className="group flex w-full items-center justify-between p-3 hover:bg-muted/40 transition-colors rounded-2xl">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4 text-primary" />
            {t("holarcHelp.emergency.contacts.addNew")}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <form onSubmit={add} className="grid gap-3 p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cname">{t("common.name")}</Label>
                <Input id="cname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="crel">{t("holarcHelp.emergency.contacts.relationshipOptional")}</Label>
                <Input id="crel" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder={t("holarcHelp.emergency.contacts.relationshipPlaceholder")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cphone">{t("holarcHelp.emergency.contacts.phoneWithCountry")}</Label>
                <Input id="cphone" type="tel" placeholder="+27821234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cemail">{t("common.email")}</Label>
                <Input id="cemail" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="csev">{t("holarcHelp.emergency.contacts.notifyWhen")}</Label>
              <Select value={form.notify_min_severity} onValueChange={(v) => setForm({ ...form, notify_min_severity: v as Severity })}>
                <SelectTrigger id="csev"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("holarcHelp.emergency.contacts.notifyHint")}</p>
            </div>
            <Button type="submit" className="h-11 gap-2 rounded-xl">
              <UserPlus className="h-4 w-4" /> {t("holarcHelp.emergency.contacts.addContactButton")}
            </Button>
          </form>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
