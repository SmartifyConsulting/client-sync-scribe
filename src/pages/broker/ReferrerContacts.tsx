import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Send, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const db = supabase as any;
/** Referrer contacts share referral_partners with referral Wealth Managers; this tag keeps them apart. */
export const REFERRER_TAG = "Referrer";

type Contact = { id: string; first_name: string; last_name: string; email: string | null; phone: string | null };
type Invite = { id: string; recipient_email: string; status: string; created_at: string };
const empty = { first_name: "", last_name: "", email: "", phone: "" };

export function inviteStatus(email: string | null, invites: Invite[]) {
  const mine = invites.filter((i) => i.recipient_email?.toLowerCase() === email?.trim().toLowerCase());
  if (mine.some((i) => i.status === "accepted")) return "accepted";
  if (mine.some((i) => i.status === "pending")) return "pending";
  return "none";
}

export function ReferrerContacts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const contacts = useQuery({
    queryKey: ["referrer-contacts", user?.id], enabled: !!user,
    queryFn: async () => ((await db.from("referral_partners").select("id,first_name,last_name,email,phone")
      .eq("user_id", user!.id).eq("specialty", REFERRER_TAG).order("created_at", { ascending: false })).data ?? []) as Contact[],
  });
  const invites = useQuery({
    queryKey: ["referrer-invites", user?.id], enabled: !!user,
    queryFn: async () => ((await db.from("user_invitations").select("id,recipient_email,status,created_at").eq("sender_id", user!.id)).data ?? []) as Invite[],
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["referrer-contacts"] }); qc.invalidateQueries({ queryKey: ["referrer-invites"] }); };

  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [sendNow, setSendNow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const invite = async (c: { first_name: string; last_name: string; email: string }) => {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
    const { error } = await supabase.functions.invoke("send-user-invitation", {
      body: { recipientEmail: c.email.trim(), isReferral: true,
        message: `${name ? `Hello ${name},\n\n` : ""}I'd like to invite you to refer clients to me on Holarc Wealth and earn commission on every policy that's issued.` },
    });
    if (error) throw error;
  };

  const save = async () => {
    if (!form.first_name.trim() || !form.email.trim()) return toast.error("First name and email are required.");
    setBusy(true);
    try {
      const row = { first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim(), phone: form.phone.trim() || null, specialty: REFERRER_TAG };
      const { error } = editId ? await db.from("referral_partners").update(row).eq("id", editId)
        : await db.from("referral_partners").insert({ ...row, user_id: user!.id });
      if (error) throw error;
      if (!editId && sendNow) await invite(row);
      toast.success(editId ? "Referrer updated" : sendNow ? `Invitation sent to ${row.email}` : "Referrer added");
      setOpen(false); refresh();
    } catch (e: any) { toast.error(e.message || "Couldn't save the referrer."); }
    finally { setBusy(false); }
  };

  const resend = async (c: Contact) => {
    if (!c.email) return;
    try { await invite({ ...c, email: c.email }); toast.success(`Invitation resent to ${c.email}`); refresh(); }
    catch (e: any) { toast.error(e.message || "Couldn't resend the invitation."); }
  };

  const remove = async () => {
    const c = contacts.data?.find((x) => x.id === removeId);
    setRemoveId(null);
    if (!c) return;
    const { error } = await db.from("referral_partners").delete().eq("id", c.id);
    if (error) return toast.error("Couldn't remove the referrer.");
    if (c.email) await db.from("user_invitations").delete().eq("sender_id", user!.id).eq("status", "pending").ilike("recipient_email", c.email);
    toast.success("Referrer removed"); refresh();
  };

  const list = contacts.data ?? [];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Invited referrers</p>
        <Button size="sm" onClick={() => { setForm(empty); setEditId(null); setSendNow(true); setOpen(true); }}><UserPlus className="mr-1.5 h-4 w-4" />Add referrer</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {contacts.isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          : !list.length ? <p className="py-8 text-center text-sm text-muted-foreground">No invited referrers yet.</p>
          : <table className="w-full text-xs">
            <thead><tr className="border-b border-border/60 text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">Name</th><th className="px-4 py-2 font-medium">Telephone</th>
              <th className="px-4 py-2 font-medium">Email</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2" />
            </tr></thead>
            <tbody>{list.map((c) => {
              const s = inviteStatus(c.email, invites.data ?? []);
              return <tr key={c.id} className="border-b border-border/40 last:border-0">
                <td className="px-4 py-2 font-medium">{[c.first_name, c.last_name].filter(Boolean).join(" ")}</td>
                <td className="px-4 py-2">{c.phone ? <a className="hover:underline" href={`tel:${c.phone}`}>{c.phone}</a> : "—"}</td>
                <td className="px-4 py-2">{c.email ?? "—"}</td>
                <td className="px-4 py-2">{s === "accepted" ? <Badge className="text-2xs">Signed up</Badge>
                  : s === "pending" ? <Badge variant="secondary" className="text-2xs">Pending sign-up</Badge>
                  : <Badge variant="outline" className="text-2xs">Not invited</Badge>}</td>
                <td className="px-4 py-2"><div className="flex justify-end gap-1">
                  {s !== "accepted" && <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`${s === "pending" ? "Resend" : "Send"} invitation to ${c.first_name}`} title={s === "pending" ? "Resend invitation" : "Send invitation"} onClick={() => resend(c)}><Send className="h-3.5 w-3.5" /></Button>}
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${c.first_name}`} onClick={() => { setForm({ first_name: c.first_name, last_name: c.last_name, email: c.email ?? "", phone: c.phone ?? "" }); setEditId(c.id); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remove ${c.first_name}`} onClick={() => setRemoveId(c.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                </div></td>
              </tr>;
            })}</tbody>
          </table>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="settings-scope text-xs sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm font-semibold">{editId ? "Edit referrer" : "Add a referrer"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {([["first_name", "First Name", "text"], ["last_name", "Last Name", "text"], ["email", "Email", "email"], ["phone", "Telephone Number", "tel"]] as const).map(([k, l, type]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-xs font-bold" htmlFor={`ref-${k}`}>{l}</Label>
                <Input id={`ref-${k}`} type={type} className="text-xs" value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} placeholder={k === "phone" ? "e.g. 082 123 4567" : undefined} />
              </div>
            ))}
            {!editId && <label className="flex items-center gap-2"><Checkbox checked={sendNow} onCheckedChange={(v) => setSendNow(!!v)} />Send the invitation email now</label>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}{editId ? "Save" : sendNow ? "Add & invite" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove this referrer?</AlertDialogTitle>
            <AlertDialogDescription>Their pending invitation is cancelled. Referrals they have already made are kept.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove}>Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
