import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Building2, CheckCircle2, Copy, Check, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ProviderVettingForm,
  defaultProviderVettingValues,
  providerVettingSchema,
  type ProviderVettingValues,
  type ProviderKind,
} from "@/features/admin/components/ProviderVettingForm";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = upper + lower + digits + symbols;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const base = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = 0; i < 10; i++) base.push(pick(all));
  return base.sort(() => Math.random() - 0.5).join("");
}

export default function ProviderSignup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const initialKind: ProviderKind = (() => {
    const k = searchParams.get("kind");
    return k === "hospital" || k === "emergency" || k === "insurance" || k === "pharmacy"
      ? (k as ProviderKind)
      : "hospital";
  })();
  const [kind, setKind] = useState<ProviderKind>(initialKind);
  const [vetting, setVetting] = useState<ProviderVettingValues>(defaultProviderVettingValues());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const kindLabel =
    kind === "hospital" ? t("auth.provider.hospital")
    : kind === "insurance" ? t("auth.provider.insurance")
    : kind === "pharmacy" ? t("auth.provider.pharmacy")
    : t("auth.provider.emergency");

  const dupType =
    kind === "hospital" ? "hospital"
    : kind === "insurance" ? "insurance"
    : kind === "pharmacy" ? "pharmacy"
    : "ambulance";

  const submit = async () => {
    const parsed = providerVettingSchema.safeParse(vetting);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || t("auth.common.error");
      toast({ title: t("auth.provider.formIncomplete"), description: first, variant: "destructive" });
      return;
    }
    if (!vetting.license_file) {
      toast({
        title: t("auth.provider.licenseRequired"),
        description: t("auth.provider.licenseMessage"),
        variant: "destructive",
      });
      return;
    }
    if (!vetting.auto_gen_password && vetting.manual_password.length < 8) {
      toast({ title: t("auth.provider.passwordRequired"), variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      // 1. Duplicate guard
      const { data: dup } = await supabase.rpc("check_provider_duplicate", {
        _type: dupType,
        _reg_no: vetting.license_number.trim(),
        _name: vetting.org_name.trim(),
        _city: "",
      });
      if (dup && typeof dup === "object" && (dup as any).exists) {
        toast({
          title: t("auth.provider.applicationExists"),
          description: `A matching application is already on file (${(dup as any).name}). Please contact onboarding@holarchealth.com.`,
          variant: "destructive",
        });
        setBusy(false);
        return;
      }

      // 2. Sign the administrator up (auto-confirm is on)
      const password = vetting.auto_gen_password ? generatePassword() : vetting.manual_password;
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: vetting.admin_email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: { full_name: vetting.admin_full_name.trim() },
        },
      });
      if (authErr) {
        if (/already|registered|exists/i.test(authErr.message)) {
          toast({
            title: t("auth.provider.emailAlreadyRegistered"),
            description: "An account with this administrator email exists. Sign in first, then submit the application from your dashboard.",
            variant: "destructive",
          });
        } else {
          toast({ title: t("auth.provider.signupFailed"), description: authErr.message, variant: "destructive" });
        }
        setBusy(false);
        return;
      }
      const newUserId = authData?.user?.id;
      if (!newUserId) throw new Error("Sign-up succeeded but no user id was returned");

      // 3. Prepare license path and insert the pending provider row FIRST
      // (so storage RLS can verify the upload path belongs to a provider row owned by this user).
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

      let newProviderId: string | null = null;
      if (kind === "hospital") {
        const { data: ins, error: insErr } = await supabase.from("holarchelp_hospitals" as any).insert({
          ...common,
          name: vetting.org_name.trim(),
          address: vetting.address.trim(),
        } as any).select("id").single();
        if (insErr) throw new Error(`Hospital insert failed: ${insErr.message}`);
        newProviderId = (ins as any)?.id ?? null;
      } else if (kind === "insurance") {
        const { data: ins, error: insErr } = await supabase.from("holarchelp_insurance_providers" as any).insert({
          ...common,
          company_name: vetting.org_name.trim(),
          base_address: vetting.address.trim(),
          insurance_type: vetting.insurance_type,
        } as any).select("id").single();
        if (insErr) throw new Error(`Insurer insert failed: ${insErr.message}`);
        newProviderId = (ins as any)?.id ?? null;
      } else if (kind === "pharmacy") {
        const { data: ins, error: insErr } = await supabase.from("holarchelp_pharmacies" as any).insert({
          ...common,
          name: vetting.org_name.trim(),
          address: vetting.address.trim(),
        } as any).select("id").single();
        if (insErr) throw new Error(`Pharmacy insert failed: ${insErr.message}`);
        newProviderId = (ins as any)?.id ?? null;
      } else {
        const { data: ins, error: insErr } = await supabase.from("holarchelp_ambulance_providers" as any).insert({
          ...common,
          company_name: vetting.org_name.trim(),
          base_address: vetting.address.trim(),
        } as any).select("id").single();
        if (insErr) throw new Error(`Provider insert failed: ${insErr.message}`);
        newProviderId = (ins as any)?.id ?? null;
      }

      // 4. Upload license (RLS now verifies a provider row owned by this user references this path)
      const { error: upErr } = await supabase.storage
        .from("provider-licenses")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(`License upload failed: ${upErr.message}`);


      // 4b. Notify admin (best-effort, fire-and-forget before sign-out)
      if (newProviderId) {
        try {
          await supabase.functions.invoke("notify-provider-application", {
            body: { kind, providerId: newProviderId },
          });

        } catch (notifyErr) {
          console.warn("Admin notification failed (non-fatal)", notifyErr);
        }
      }

      // 5. Sign out — no role granted until admin approval
      await supabase.auth.signOut();

      setResult({ email: vetting.admin_email.trim(), password });
      toast({
        title: t("auth.provider.applicationReceived"),
        description: t("auth.provider.pendingApproval"),
      });
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("auth.common.home")}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-center text-3xl font-extrabold">{t("auth.provider.title")}</h1>
        <p className="mt-3 text-center text-muted-foreground">
          {t("auth.provider.subtitle")}
        </p>

        {result ? (
          <Card className="mt-8 border-2 border-primary/40">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <h2 className="text-xl font-semibold">{t("auth.provider.applicationReceived")}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    We aim to approve all applications within <strong>6 hours</strong>. You'll be able to sign in once
                    your administrator account is approved.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs">
                <p className="font-bold text-amber-900 dark:text-amber-200">{t("auth.provider.savePassword")}</p>
                <p className="text-amber-900/80 dark:text-amber-200/80">
                  This password is shown only once. Your administrator will need it to sign in after approval.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-3 font-mono text-sm space-y-1.5">
                <div>
                  <span className="text-muted-foreground">Email:</span> {result.email}
                </div>
                <div>
                  <span className="text-muted-foreground">Password:</span>{" "}
                  <span className="font-bold">{result.password}</span>
                </div>
              </div>

              <Button onClick={copyCreds} variant="outline" className="w-full gap-2">
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                {copied ? t("auth.provider.copied") : t("auth.provider.copyCredentials")}
              </Button>

              <Button className="w-full" onClick={() => navigate("/")}>
                {t("auth.common.returnHome")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-8">
            <CardContent className="space-y-5 p-6">
              <div className="space-y-1.5">
                <Label htmlFor="org_kind">{t("auth.provider.organizationType")}</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as ProviderKind)} disabled={busy}>
                  <SelectTrigger id="org_kind"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hospital">{t("auth.provider.hospital")}</SelectItem>
                    <SelectItem value="emergency">{t("auth.provider.emergency")}</SelectItem>
                    <SelectItem value="insurance">{t("auth.provider.insurance")}</SelectItem>
                    <SelectItem value="pharmacy">{t("auth.provider.pharmacy")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ProviderVettingForm
                kind={kind}
                values={vetting}
                onChange={setVetting}
                disabled={busy}
                mode="public"
              />

              <div className="rounded-md border border-primary/40 bg-sky-50/60 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary text-sm p-3 flex gap-2 items-start">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <span>The administrator email you supply becomes the account used to sign in once approved.</span>
              </div>

              <Button onClick={submit} disabled={busy} size="lg" className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("auth.common.continue")} {kindLabel} {t("auth.provider.applicationLabel")}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate("/auth")}>
            {t("auth.provider.alreadyHaveAccount")}
          </Button>
        </div>
      </main>
    </div>
  );
}
