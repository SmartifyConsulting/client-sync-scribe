import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, MessageCircle, UserPlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { usePracticeInfo } from "../practice/usePracticeInfo";

const REQUIRED = [
  ["planner_name", "Planner name"], ["phone", "Telephone"], ["email_primary", "Email"],
  ["fsp_name", "FSP name"], ["fsb_licence", "FSP licence number"], ["compliance_officer", "Compliance officer"],
] as const;

const waNumber = (p?: string | null) => {
  const d = (p ?? "").replace(/\D/g, "");
  return d.startsWith("0") ? "27" + d.slice(1) : d;
};
const message = (first: string, manager: string, url: string) =>
  `Hi ${first}, this is ${manager}. Please open this secure link to set up your Holarc Wealth account and start your onboarding: ${url}`;

function SendOptions({ first, phone, email, url, manager }: { first: string; phone?: string | null; email?: string | null; url: string; manager: string }) {
  const { toast } = useToast();
  const text = message(first, manager, url);
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs break-all text-muted-foreground">{url}</div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button asChild variant="default"><a href={`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a></Button>
        <Button asChild variant="outline"><a href={`mailto:${email ?? ""}?subject=${encodeURIComponent("Your Holarc Wealth onboarding link")}&body=${encodeURIComponent(text)}`}><Mail className="h-4 w-4" />Email</a></Button>
        <Button variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast({ title: "Link copied" }); }}><Copy className="h-4 w-4" />Copy link</Button>
      </div>
      <p className="text-xs text-muted-foreground">The link works once and expires in 14 days.</p>
    </div>
  );
}

function InvitesSheet({ open, onOpenChange, manager }: { open: boolean; onOpenChange: (v: boolean) => void; manager: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [renewed, setRenewed] = useState<{ id: string; url: string } | null>(null);
  const { data = [] } = useQuery({
    queryKey: ["client-invites", user?.id], enabled: open && !!user,
    queryFn: async () => (await (supabase as any).from("wealth_client_invites").select("*").eq("owner_user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });
  const status = (i: any) => i.status === "accepted" ? "Signed up" : i.status === "cancelled" ? "Cancelled" : new Date(i.expires_at) < new Date() ? "Expired" : "Invited";
  const renew = async (id: string) => {
    const { data: r, error } = await supabase.functions.invoke("wealth-client-invite", { body: { action: "renew", inviteId: id, origin: window.location.origin } });
    if (error || r?.error) return toast({ title: "Couldn't resend", description: r?.error ?? "Please try again.", variant: "destructive" });
    setRenewed({ id, url: r.url }); qc.invalidateQueries({ queryKey: ["client-invites"] });
  };
  const cancel = async (id: string) => {
    await (supabase as any).from("wealth_client_invites").update({ status: "cancelled" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["client-invites"] });
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>Client invitations</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-3">
          {data.length === 0 && <p className="empty-state">No invitations sent yet.</p>}
          {data.map((i: any) => {
            const s = status(i);
            return (
              <div key={i.id} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div><p className="text-sm font-medium">{i.first_name} {i.last_name}</p><p className="text-xs text-muted-foreground">{i.phone || i.email || "No contact"} · {new Date(i.created_at).toLocaleDateString("en-ZA")}</p></div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{s}</span>
                </div>
                {s !== "Signed up" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => renew(i.id)}><Send className="h-3.5 w-3.5" />Resend</Button>
                    {s === "Invited" && <Button size="sm" variant="ghost" onClick={() => cancel(i.id)}>Cancel</Button>}
                  </div>
                )}
                {renewed?.id === i.id && <SendOptions first={i.first_name} phone={i.phone} email={i.email} url={renewed.url} manager={manager} />}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function NewClientInvite({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: info } = usePracticeInfo(user?.id);
  const [open, setOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [f, setF] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const missing = REQUIRED.filter(([k]) => !info?.[k]).map(([, l]) => l);
  const manager = info?.planner_name || "your Wealth Manager";

  const create = async () => {
    if (!f.firstName.trim() || !f.lastName.trim()) return toast({ title: "Name required", description: "Enter the client's first name and surname.", variant: "destructive" });
    if (!f.phone.trim() && !f.email.trim()) return toast({ title: "Contact required", description: "Add a cell number or email so you can send the link.", variant: "destructive" });
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("wealth-client-invite", { body: { action: "create", ...f, origin: window.location.origin } });
    setBusy(false);
    if (error || data?.error) return toast({ title: "Couldn't create client", description: data?.error ?? "Please try again.", variant: "destructive" });
    setResult(data.url);
    qc.invalidateQueries({ queryKey: ["client-invites"] });
    qc.invalidateQueries({ queryKey: ["patients"] });
  };
  const close = (v: boolean) => { setOpen(v); if (!v) { setResult(null); setF({ firstName: "", lastName: "", phone: "", email: "" }); } };

  return (
    <>
      <div className="flex gap-2">
        <Button className={compact ? "h-8 md:h-9 text-xs" : ""} onClick={() => setOpen(true)}><UserPlus className="h-4 w-4" />New Client</Button>
        <Button variant="outline" className={compact ? "h-8 md:h-9 text-xs" : ""} onClick={() => setListOpen(true)}>Invitations</Button>
      </div>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{result ? "Send the onboarding link" : "New Client"}</DialogTitle>
            <DialogDescription>{result ? `Send ${f.firstName} this link. They sign up and land on Step 1 to complete KYC, AML and PEP screening.` : "Creates a Client ID and a secure sign-up link for your client."}</DialogDescription>
          </DialogHeader>
          {result ? (
            <SendOptions first={f.firstName} phone={f.phone} email={f.email} url={result} manager={manager} />
          ) : (
            <div className="space-y-3">
              {missing.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
                  <p className="font-medium text-foreground">Complete your profile</p>
                  <p className="text-muted-foreground">Your client's Letter of Authority fills in from My Business. Missing: {missing.join(", ")}.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>First name</Label><Input value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Surname</Label><Input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Cell number</Label><Input type="tel" placeholder="082 123 4567" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Email (optional)</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
              <Button className="w-full" disabled={busy} onClick={create}>{busy ? "Creating…" : "Create client and link"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <InvitesSheet open={listOpen} onOpenChange={setListOpen} manager={manager} />
    </>
  );
}
