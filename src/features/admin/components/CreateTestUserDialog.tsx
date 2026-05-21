import { useState } from "react";
import { Loader2, UserPlus, Copy, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateTestUserDialogProps {
  onCreated?: () => void;
}

export function CreateTestUserDialog({ onCreated }: CreateTestUserDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [autoGen, setAutoGen] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [manualPassword, setManualPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setEmail("");
    setFullName("");
    setManualPassword("");
    setAutoGen(true);
    setSendEmail(true);
    setResult(null);
    setCopied(false);
  };

  const create = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    if (!autoGen && manualPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-set-user-password", {
        body: {
          email: email.trim(),
          full_name: fullName.trim() || undefined,
          auto_generate: autoGen,
          password: autoGen ? undefined : manualPassword,
          send_email: sendEmail,
          create_if_missing: true,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult({ email: data.email, password: data.password, emailed: !!data.emailed });
      toast({
        title: data.action === "created" ? "Test user created" : "Password updated",
        description: data.emailed ? `Credentials emailed to ${data.email}` : `Password ready — copy it before closing.`,
      });
      onCreated?.();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const copyCreds = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(`${result.email}\n${result.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          Create test user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create test user</DialogTitle>
          <DialogDescription>
            Creates the account (or resets the password if it already exists). For MVP testing.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ctu-email">Email</Label>
              <Input id="ctu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="test.user@example.com" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ctu-name">Full name (optional)</Label>
              <Input id="ctu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Test User" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Auto-generate password</p>
                <p className="text-xs text-muted-foreground">14 chars, mixed case + digits + symbols</p>
              </div>
              <Switch checked={autoGen} onCheckedChange={setAutoGen} />
            </div>
            {!autoGen && (
              <div className="space-y-1.5">
                <Label htmlFor="ctu-pwd">Password</Label>
                <Input id="ctu-pwd" type="text" value={manualPassword} onChange={(e) => setManualPassword(e.target.value)} placeholder="Min 8 chars" />
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Email credentials to user</p>
                <p className="text-xs text-muted-foreground">Send the login + password by email</p>
              </div>
              <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button onClick={create} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">This password is shown only once</p>
              <p className="text-amber-900/80 dark:text-amber-200/80">Copy it now if you need it. {result.emailed ? "We also emailed it to the user." : "Email was not sent."}</p>
            </div>
            <div className="rounded-lg border bg-card p-3 font-mono text-sm space-y-1.5">
              <div><span className="text-muted-foreground">Email:</span> {result.email}</div>
              <div><span className="text-muted-foreground">Password:</span> <span className="font-bold">{result.password}</span></div>
            </div>
            <Button onClick={copyCreds} variant="outline" className="w-full gap-2">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy email + password"}
            </Button>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
