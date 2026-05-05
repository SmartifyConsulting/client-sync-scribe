import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

type Severity = "low" | "medium" | "high" | "critical";
type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  notify_min_severity: Severity;
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

export default function HolarcHelpContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState<{ name: string; phone: string; email: string; relationship: string; notify_min_severity: Severity }>({
    name: "", phone: "", email: "", relationship: "", notify_min_severity: "low",
  });

  const load = async () => {
    const { data } = await supabase.from("holarchelp_emergency_contacts" as any).select("*").order("created_at", { ascending: true });
    setContacts((data as any) ?? []);
  };
  useEffect(() => { if (user) load(); }, [user]);

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
    } as any);
    if (error) return toast.error(error.message);
    setForm({ name: "", phone: "", email: "", relationship: "", notify_min_severity: "low" });
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

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-extrabold">Emergency contacts</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You need at least one contact to use SOS. They'll be emailed your live tracking link automatically — but only when an incident reaches the severity you choose for them.
      </p>

      <form onSubmit={add} className="mt-5 grid gap-3 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="grid gap-1.5"><Label htmlFor="cname">Name</Label>
          <Input id="cname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl" /></div>
        <div className="grid gap-1.5"><Label htmlFor="cphone">Phone (with country code)</Label>
          <Input id="cphone" type="tel" placeholder="+27821234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className="rounded-xl" /></div>
        <div className="grid gap-1.5"><Label htmlFor="cemail">Email</Label>
          <Input id="cemail" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl" /></div>
        <div className="grid gap-1.5"><Label htmlFor="crel">Relationship (optional)</Label>
          <Input id="crel" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="rounded-xl" placeholder="Spouse, parent, friend…" /></div>
        <div className="grid gap-1.5">
          <Label htmlFor="csev">Notify when incident is</Label>
          <Select value={form.notify_min_severity} onValueChange={(v) => setForm({ ...form, notify_min_severity: v as Severity })}>
            <SelectTrigger id="csev" className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Contact will only be alerted for incidents at this severity or higher.</p>
        </div>
        <Button type="submit" className="h-12 gap-2 rounded-xl"><UserPlus className="h-4 w-4" /> Add contact</Button>
      </form>

      <ul className="mt-5 space-y-2">
        {contacts.length === 0 && <li className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">No contacts yet</li>}
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground truncate">{c.email}{c.phone && ` · ${c.phone}`}{c.relationship && ` · ${c.relationship}`}</p>
              <div className="mt-2">
                <Select value={c.notify_min_severity ?? "low"} onValueChange={(v) => updateSeverity(c.id, v as Severity)}>
                  <SelectTrigger className="h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(c.id)} aria-label="Remove"><Trash2 className="h-4 w-4 text-sos" /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
