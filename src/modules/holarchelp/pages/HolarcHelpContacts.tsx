import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

type Contact = { id: string; name: string; email: string | null; phone: string | null; relationship: string | null };
const schema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6, "Enter a valid number with country code").max(20),
  email: z.string().trim().email("Enter a valid email").max(255),
  relationship: z.string().trim().max(60).optional(),
});

export default function HolarcHelpContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", relationship: "" });

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
    } as any);
    if (error) return toast.error(error.message);
    setForm({ name: "", phone: "", email: "", relationship: "" });
    toast.success("Contact added");
    load();
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
        You need at least one contact to use SOS. They'll be emailed your live tracking link automatically.
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
        <Button type="submit" className="h-12 gap-2 rounded-xl"><UserPlus className="h-4 w-4" /> Add contact</Button>
      </form>

      <ul className="mt-5 space-y-2">
        {contacts.length === 0 && <li className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">No contacts yet</li>}
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.email}{c.phone && ` · ${c.phone}`}{c.relationship && ` · ${c.relationship}`}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(c.id)} aria-label="Remove"><Trash2 className="h-4 w-4 text-sos" /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
