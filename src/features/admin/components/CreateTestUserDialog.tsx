import { useState } from "react";
import { Loader2, UserPlus, Copy, Check, ArrowLeft, User, Building2, Siren, Pill, ShieldCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ProviderVettingForm,
  defaultProviderVettingValues,
  providerVettingSchema,
  type ProviderVettingValues,
  type ProviderKind,
} from "@/features/admin/components/ProviderVettingForm";

interface CreateTestUserDialogProps {
  onCreated?: () => void;
}

type UserKind = "patient" | "hospital" | "esp" | "pharmacy" | "admin";

const KIND_OPTIONS: Array<{ kind: UserKind; label: string; description: string; icon: React.ComponentType<any> }> = [
  { kind: "patient", label: "Patient", description: "Standard patient account.", icon: User },
  { kind: "hospital", label: "Hospital", description: "Hospital â€” requires vetting.", icon: Building2 },
  { kind: "esp", label: "Emergency Service Provider", description: "ER / Ambulance â€” requires vetting.", icon: Siren },
  { kind: "pharmacy", label: "Pharmacy", description: "Pharmacy account.", icon: Pill },
  { kind: "admin", label: "Admin", description: "Full platform admin access.", icon: ShieldCheck },
];

const KIND_TO_ROLE: Record<UserKind, string> = {
  patient: "patient",
  hospital: "hospital_staff",
  esp: "ambulance_staff",
  pharmacy: "pharmacy_staff",
  admin: "admin",
};


export function CreateTestUserDialog({ onCreated }: CreateTestUserDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<UserKind | null>(null);

  // Simple form state (patient/pharmacy)
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [autoGen, setAutoGen] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [manualPassword, setManualPassword] = useState("");

  // Vetting form state
  const [vetting, setVetting] = useState<ProviderVettingValues>(defaultProviderVettingValues());

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string; emailed: boolean; pending?: boolean; adminEmail?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setStep(1);
    setKind(null);
    setEmail(""); setFullName(""); setManualPassword("");
    setAutoGen(true); setSendEmail(true);
    setVetting(defaultProviderVettingValues());
    setResult(null); setCopied(false);
  };

  const continueToForm = () => {
    if (!kind) return;
    setStep(2);
  };

  const createSimple = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", variant: "destructive" }); return;
    }
    if (!autoGen && manualPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" }); return;
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

      // Assign role
      if (kind && data?.action === "created" && data?.user_id) {
        await supabase.from("user_roles").insert({ user_id: data.user_id, role: KIND_TO_ROLE[kind] as any });
      }

      setResult({ email: data.email, password: data.password, emailed: !!data.emailed });
      toast({
        title: data.action === "created" ? "User created" : "Password updated",
        description: data.emailed ? `Credentials emailed to ${data.email}` : "Password ready â€” copy it before closing.",
      });
      onCreated?.();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const createVetting = async () => {
    if (!kind || (kind !== "hospital" && kind !== "esp")) return;
    const providerKind: ProviderKind = kind === "hospital" ? "hospital" : "esp";

    // Validate
    const parsed = providerVettingSchema.safeParse(vetting);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || "Please fill in all required fields";
      toast({ title: "Form incomplete", description: first, variant: "destructive" }); return;
    }
    if (!vetting.license_file) {
      toast({ title: "License required", description: "Upload a certified copy of the license.", variant: "destructive" }); return;
    }
    if (!vetting.auto_gen_password && vetting.manual_password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" }); return;
    }

    setBusy(true);
    try {
      // 1. Create auth user
      const { data, error } = await supabase.functions.invoke("admin-set-user-password", {
        body: {
          email: vetting.admin_email.trim(),
          full_name: vetting.admin_full_name.trim(),
          auto_generate: vetting.auto_gen_password,
          password: vetting.auto_gen_password ? undefined : vetting.manual_password,
          send_email: vetting.send_email,
          create_if_missing: true,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newUserId: string | undefined = data?.user_id;
      if (!newUserId) throw new Error("User created but ID missing");

      // 2. Prepare license path and insert the pending provider record FIRST
      // (storage RLS verifies the upload path is referenced by a provider row owned by this user).
      const file = vetting.license_file;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `pending/${newUserId}/${Date.now()}-${safeName}`;

      const directors = vetting.directors
        .filter((d) => d.full_name.trim())
        .map((d) => ({ full_name: d.full_name.trim(), role: d.role?.trim() || null }));

      const common = {
        owner_id: newUserId,
        registration_number: vetting.license_number.trim(),
        contact_email: vetting.org_email.trim(),
        contact_phone: vetting.org_phone.trim(),
        admin_full_name: vetting.admin_full_name.trim(),
        admin_email: vetting.admin_email.trim(),
        admin_phone: vetting.admin_phone.trim(),
        directors,
        license_file_path: path,
        license_file_mime: file.type,
        license_file_size_bytes: file.size,
        status: "pending" as const,
      };

      if (providerKind === "hospital") {
        const { error: insErr } = await supabase.from("holarchelp_hospitals" as any).insert({
          ...common,
          name: vetting.org_name.trim(),
          address: vetting.address.trim(),
        } as any);
        if (insErr) throw new Error(`Hospital insert failed: ${insErr.message}`);
      } else {
        const { error: insErr } = await supabase.from("holarchelp_ambulance_providers" as any).insert({
          ...common,
          company_name: vetting.org_name.trim(),
          base_address: vetting.address.trim(),
        } as any);
        if (insErr) throw new Error(`Provider insert failed: ${insErr.message}`);
      }

      // 3. Upload license
      const { error: upErr } = await supabase.storage
        .from("provider-licenses")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(`License upload failed: ${upErr.message}`);


      // 4. Assign role
      if (data?.action === "created") {
        await supabase.from("user_roles").insert({ user_id: newUserId, role: KIND_TO_ROLE[kind] as any });
      }

      // (Acknowledgement email intentionally removed â€” notify.nigeria.holarchealth.com is abandoned.)


      setResult({
        email: data.email,
        password: data.password,
        emailed: !!data.emailed,
        pending: true,
        adminEmail: vetting.admin_email.trim(),
      });
      toast({
        title: "Submission received",
        description: "Pending approval â€” visible in User Admin. Approval is typically completed within 6 hours.",
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

  const isVettingKind = kind === "hospital" || kind === "esp";
  const kindLabel = KIND_OPTIONS.find((k) => k.kind === kind)?.label ?? "";

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          Create user
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "What kind of user are you creating?" : `Create ${kindLabel}`}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Pick the user type to load the right form."
              : isVettingKind
                ? "Fill in the vetting details. The submission will appear in User Admin as Pending Approval."
                : "Creates the account (or resets the password if it already exists)."}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            {result.pending && (
              <div className="rounded-lg border-2 border-emerald-500/60 bg-emerald-50/60 dark:border-emerald-400/40 dark:bg-emerald-950/30 p-3 text-sm text-emerald-900 dark:text-emerald-200">
                <p className="font-semibold">Application received â€” pending approval</p>
                <p className="mt-1 text-sm">
                  We aim to approve all applications within <strong>6 hours</strong>.
                  {result.adminEmail ? <> A confirmation email has been sent to <strong>{result.adminEmail}</strong>.</> : null}
                </p>
              </div>
            )}
            <div className="rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
              <p className="font-bold text-amber-900 dark:text-amber-200">This password is shown only once</p>
              <p className="text-amber-900/80 dark:text-amber-200/80">
                Copy it now if you need it. {result.emailed ? "We also emailed it to the user." : "Email was not sent."}
              </p>
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
        ) : step === 1 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {KIND_OPTIONS.map(({ kind: k, label, description, icon: Icon }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "text-left rounded-lg border-2 p-3 transition hover:bg-muted/40",
                    kind === k ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={continueToForm} disabled={!kind}>Continue</Button>
            </DialogFooter>
          </div>
        ) : isVettingKind ? (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} disabled={busy} className="gap-1.5 -ml-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <ProviderVettingForm
              kind={kind === "hospital" ? "hospital" : "esp"}
              values={vetting}
              onChange={setVetting}
              disabled={busy}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button onClick={createVetting} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Create ${kindLabel}`}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} disabled={busy} className="gap-1.5 -ml-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <div className="space-y-1.5">
              <Label htmlFor="ctu-email">Email</Label>
              <Input id="ctu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ctu-name">Full name (optional)</Label>
              <Input id="ctu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Auto-generate password</p>
                <p className="text-sm text-muted-foreground">14 chars, mixed case + digits + symbols</p>
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
                <p className="text-sm text-muted-foreground">Send the login + password by email</p>
              </div>
              <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button onClick={createSimple} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Create ${kindLabel}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

