import { QUOTE_EMAIL_PRESETS, parseEmails } from "@/features/wealth-workflow/map/quoteEmails";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, ExternalLink, Settings2, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const db = supabase as any;

function PasswordInput(props: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={`pr-9 ${props.className ?? ""}`} />
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

type Category = "insurance" | "crm_planning" | "industry_portal" | "financial_service_provider";

interface CatalogEntry {
  id: string;
  name: string;
  category: Category;
  portal_url: string;
  required_fields: string[];
  is_active: boolean;
}

interface CredentialStatus {
  integration_id: string;
  is_enabled: boolean;
  status: "configured" | "pending" | "inactive";
  updated_at: string | null;
  has_credentials: boolean;
  quote_email?: string | null;
  portal_url?: string | null;
}

const CATEGORY_LABELS: Record<Category, string> = {
  insurance: "Insurance Providers",
  crm_planning: "CRM & Financial Planning",
  industry_portal: "Industry Portals",
  financial_service_provider: "Financial Service Providers",
};

const invoke = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("manage-broker-credentials", { body });
  if (error) {
    let msg = (data as any)?.error as string | undefined;
    try { msg = msg ?? (await (error as any).context?.json())?.error; } catch { /* ignore */ }
    throw new Error(msg ?? "Could not save. Please try again.");
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
};

export default function AppIntegrations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // The screen is locked every time it's opened — this is in-memory only,
  // never persisted, so navigating away and back always re-locks it.
  const [passcode, setPasscode] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [reauthToken, setReauthToken] = useState<string | null>(null);

  // Re-lock automatically the moment this page unmounts.
  useEffect(() => () => setReauthToken(null), []);

  // Set-up / change Password Protector
  const [changeProtectorOpen, setChangeProtectorOpen] = useState(false);
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [savingProtector, setSavingProtector] = useState(false);

  // Forgot Password Protector — reset via account password
  const [forgotOpen, setForgotOpen] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [resettingProtector, setResettingProtector] = useState(false);

  const protectorStatus = useQuery({
    queryKey: ["password-protector-status", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<boolean> => (await invoke({ action: "protector_status" })).isSet ?? false,
  });

  const [manageEntry, setManageEntry] = useState<CatalogEntry | null>(null);
  const [manageUsername, setManageUsername] = useState("");
  const [manageFields, setManageFields] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState(false);
  const [loadingReveal, setLoadingReveal] = useState(false);
  const [saving, setSaving] = useState(false);

  const catalog = useQuery({
    queryKey: ["integrations-catalog"],
    queryFn: async (): Promise<CatalogEntry[]> =>
      (await db.from("app_integrations_catalog").select("*").eq("is_active", true).order("category").order("display_order")).data ?? [],
  });

  const credentials = useQuery({
    queryKey: ["broker-integration-credentials", user?.id],
    enabled: !!user && !!reauthToken,
    queryFn: async (): Promise<CredentialStatus[]> => (await invoke({ action: "list" })).credentials ?? [],
  });

  const statusFor = (integrationId: string) => (credentials.data ?? []).find((c) => c.integration_id === integrationId);

  const grouped = useMemo(() => {
    const cats: Category[] = ["insurance", "crm_planning", "industry_portal", "financial_service_provider"];
    return cats.map((category) => ({
      category,
      items: (catalog.data ?? []).filter((e) => e.category === category),
    }));
  }, [catalog.data]);

  const handleUnlock = async () => {
    if (!passcode) return;
    setUnlocking(true);
    try {
      const data = await invoke({ action: "reauth", passcode });
      setReauthToken(data.token);
      setPasscode("");
    } catch (e: any) {
      toast.error(e.message ?? "Incorrect Password Protector.");
    } finally {
      setUnlocking(false);
    }
  };

  const handleSetProtector = async () => {
    if (newPasscode.length < 4) {
      toast.error("Password Protector must be at least 4 characters.");
      return;
    }
    if (newPasscode !== confirmPasscode) {
      toast.error("Passcodes don't match.");
      return;
    }
    setSavingProtector(true);
    try {
      await invoke({
        action: "set_protector",
        passcode: newPasscode,
        ...(protectorStatus.data ? { currentPasscode } : {}),
      });
      if (protectorStatus.data) {
        toast.success("Password Protector changed.");
        setChangeProtectorOpen(false);
      } else {
        // First-time setup also unlocks the screen immediately.
        const data = await invoke({ action: "reauth", passcode: newPasscode });
        setReauthToken(data.token);
        toast.success("Password Protector set up.");
      }
      setCurrentPasscode("");
      setNewPasscode("");
      setConfirmPasscode("");
      protectorStatus.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Could not save Password Protector.");
    } finally {
      setSavingProtector(false);
    }
  };

  const handleForgotReset = async () => {
    if (newPasscode.length < 4) {
      toast.error("Password Protector must be at least 4 characters.");
      return;
    }
    if (newPasscode !== confirmPasscode) {
      toast.error("Passcodes don't match.");
      return;
    }
    setResettingProtector(true);
    try {
      await invoke({ action: "reset_protector", accountPassword, newPasscode });
      const data = await invoke({ action: "reauth", passcode: newPasscode });
      setReauthToken(data.token);
      toast.success("Password Protector reset.");
      setForgotOpen(false);
      setAccountPassword("");
      setNewPasscode("");
      setConfirmPasscode("");
      protectorStatus.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Incorrect account password.");
    } finally {
      setResettingProtector(false);
    }
  };

  const openManage = async (entry: CatalogEntry) => {
    if (!reauthToken) return;
    setManageEntry(entry);
    setManageUsername("");
    setManageFields({});
    setShowSecrets(false);
    setLoadingReveal(true);
    try {
      const data = await invoke({ action: "reveal", integrationId: entry.id, token: reauthToken });
      setManageUsername(data.username ?? "");
      setManageFields(data.fields ?? {});
    } catch (e: any) {
      toast.error(e.message ?? "Session expired — please unlock again.");
      setReauthToken(null);
      setManageEntry(null);
    } finally {
      setLoadingReveal(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!manageEntry || !reauthToken) return;
    const missingUsername = manageEntry.required_fields.includes("username") && !manageUsername.trim();
    const missingField = manageEntry.required_fields.some((f) => f !== "username" && !manageFields[f]?.trim());
    if (missingUsername || missingField) {
      toast.error("Enter all required fields before saving.");
      return;
    }
    if (manageFields.portal_url) {
      try {
        const url = new URL(manageFields.portal_url);
        if (url.protocol !== "https:" || url.username || url.password) throw new Error();
      } catch { toast.error("Enter a valid HTTPS portal URL without login details."); return; }
    }
    setSaving(true);
    try {
      await invoke({
        action: "save",
        integrationId: manageEntry.id,
        username: manageUsername || null,
        fields: manageFields,
        token: reauthToken,
      });
      toast.success(`${manageEntry.name} credentials saved.`);
      setManageEntry(null);
      credentials.refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Could not save credentials.");
    } finally {
      setSaving(false);
    }
  };

  // ---- Locked states: nothing about the integrations is shown until unlocked ----

  if (protectorStatus.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!reauthToken) {
    const firstTime = !protectorStatus.data;
    return (
      <div className="max-w-sm mx-auto mt-16 space-y-4 text-center">
        <Lock className="h-10 w-10 mx-auto text-[hsl(var(--navy))]" />
        <h1 className="text-xl font-semibold text-[hsl(var(--navy))]">
          {firstTime ? "Set Up Password Protector" : "App Integrations Locked"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {firstTime
            ? "Create a Password Protector to guard your saved portal credentials. This is separate from your account login password."
            : "Enter your Password Protector to view and manage your connected portals."}
        </p>
        {firstTime ? (
          <div className="space-y-3 text-left">
            <div>
              <Label>New Password Protector</Label>
              <PasswordInput value={newPasscode} onChange={(e) => setNewPasscode(e.target.value)} />
            </div>
            <div>
              <Label>Confirm Password Protector</Label>
              <PasswordInput value={confirmPasscode} onChange={(e) => setConfirmPasscode(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSetProtector} disabled={savingProtector}>
              {savingProtector ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Up & Continue"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-left">
            <div>
              <Label>Password Protector</Label>
              <PasswordInput
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                autoFocus
              />
            </div>
            <Button className="w-full" onClick={handleUnlock} disabled={unlocking || !passcode}>
              {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock"}
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-primary underline w-full text-center"
              onClick={() => {
                setAccountPassword("");
                setNewPasscode("");
                setConfirmPasscode("");
                setForgotOpen(true);
              }}
            >
              Forgot your Password Protector?
            </button>
          </div>
        )}

        {/* Forgot Password Protector — reset via account password */}
        <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password Protector</DialogTitle>
              <DialogDescription>Confirm your account login password to set a new Password Protector.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-left">
              <div>
                <Label>Account Password</Label>
                <PasswordInput value={accountPassword} onChange={(e) => setAccountPassword(e.target.value)} />
              </div>
              <div>
                <Label>New Password Protector</Label>
                <PasswordInput value={newPasscode} onChange={(e) => setNewPasscode(e.target.value)} />
              </div>
              <div>
                <Label>Confirm Password Protector</Label>
                <PasswordInput value={confirmPasscode} onChange={(e) => setConfirmPasscode(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setForgotOpen(false)}>Cancel</Button>
              <Button onClick={handleForgotReset} disabled={resettingProtector}>
                {resettingProtector ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ---- Unlocked: show the cards ----

  const loading = catalog.isLoading || credentials.isLoading;

  return (
    <div className="space-y-4">
      <PageHeader
        title={<span className="text-[hsl(var(--navy))]">App Integrations</span>}
        subtitle="Connect your insurance, CRM, and industry portal logins."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentPasscode("");
              setNewPasscode("");
              setConfirmPasscode("");
              setChangeProtectorOpen(true);
            }}
          >
            <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Change Password Protector
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ category, items }) =>
            items.length === 0 ? null : (
              <div key={category}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--navy))] mb-1.5">{CATEGORY_LABELS[category]}</h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((entry) => {
                    const status = statusFor(entry.id);
                    const configured = status?.status === "configured";
                    return (
                      <div key={entry.id} className="rounded-md border bg-card px-3 py-2.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <a
            href={status?.portal_url || entry.portal_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium truncate min-w-0 hover:underline hover:text-primary inline-flex items-center gap-1"
                          >
                            {entry.name} <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                          <Badge variant={configured ? "default" : "secondary"} className="shrink-0 text-2xs px-1.5 py-0 font-normal">
                            {configured
                              ? `Configured${status?.updated_at ? ` · ${new Date(status.updated_at).toLocaleDateString()}` : ""}`
                              : "Not Set Up"}
                          </Badge>
                        </div>
                        {entry.category === "insurance" && (
                          <p className="truncate text-xs text-muted-foreground">
                            Quote requests: {status?.quote_email ? <span className="text-foreground">{status.quote_email}</span> : <span className="italic">no email set</span>}
                          </p>
                        )}
                        <p className="truncate text-xs text-muted-foreground" title={status?.portal_url || entry.portal_url}>{status?.portal_url || entry.portal_url}</p>
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs px-2" onClick={() => openManage(entry)}>
                            <Settings2 className="h-3 w-3 mr-1" /> Credentials
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* Change Password Protector */}
      <Dialog open={changeProtectorOpen} onOpenChange={setChangeProtectorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password Protector</DialogTitle>
            <DialogDescription>This is separate from your account login password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Current Password Protector</Label>
              <PasswordInput value={currentPasscode} onChange={(e) => setCurrentPasscode(e.target.value)} />
            </div>
            <div>
              <Label>New Password Protector</Label>
              <PasswordInput value={newPasscode} onChange={(e) => setNewPasscode(e.target.value)} />
            </div>
            <div>
              <Label>Confirm Password Protector</Label>
              <PasswordInput value={confirmPasscode} onChange={(e) => setConfirmPasscode(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeProtectorOpen(false)}>Cancel</Button>
            <Button onClick={handleSetProtector} disabled={savingProtector}>
              {savingProtector ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage credentials dialog */}
      <Dialog open={!!manageEntry} onOpenChange={(open) => !open && setManageEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {manageEntry?.name}</DialogTitle>
            <DialogDescription>{manageEntry?.portal_url}</DialogDescription>
          </DialogHeader>
          {loadingReveal ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="insurer-portal-url">Portal URL</Label>
                <Input id="insurer-portal-url" type="url" placeholder="https://" value={manageFields.portal_url ?? manageEntry?.portal_url ?? ""}
                  onChange={(e) => setManageFields((f) => ({ ...f, portal_url: e.target.value }))} />
              </div>
              {manageEntry?.required_fields.includes("username") && (
                <div>
                  <Label>Username</Label>
                  <Input value={manageUsername} onChange={(e) => setManageUsername(e.target.value)} />
                </div>
              )}
              {manageEntry?.category === "insurance" && (() => {
                const current = parseEmails(manageFields.quote_email);
                const options = Array.from(new Set([...(QUOTE_EMAIL_PRESETS[manageEntry.id] ?? []), ...current]));
                const setList = (l: string[]) => setManageFields((f) => ({ ...f, quote_email: l.join(", ") }));
                return (
                  <div>
                    <Label>Quote requests emails</Label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {options.map((e) => {
                        const on = current.includes(e);
                        return (
                          <button key={e} type="button" aria-pressed={on}
                            onClick={() => setList(on ? current.filter((x) => x !== e) : [...current, e])}
                            className={`rounded-full border px-2 py-0.5 text-[11px] ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                            {e}
                          </button>
                        );
                      })}
                    </div>
                    <Input className="mt-1.5" type="email" placeholder="Add another address and press Enter"
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        const v = (e.target as HTMLInputElement).value.trim().toLowerCase();
                        if (v) { setList(parseEmails([...current, v].join(","))); (e.target as HTMLInputElement).value = ""; }
                      }} />
                    <p className="mt-1 text-xs text-muted-foreground">Tick every inbox that can receive quote requests. You pick which ones to use in Step 4.</p>
                  </div>
                );
              })()}
              {manageEntry?.required_fields.filter((f) => f !== "username" && f !== "quote_email" && f !== "portal_url").map((field) => (
                <div key={field}>
                  <Label className="capitalize">{field.replace(/_/g, " ")}</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets ? "text" : "password"}
                      value={manageFields[field] ?? ""}
                      onChange={(e) => setManageFields((f) => ({ ...f, [field]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowSecrets((s) => !s)}
                    >
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageEntry(null)}>Cancel</Button>
            <Button onClick={handleSaveCredentials} disabled={saving || loadingReveal}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
