import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, Unlock, ExternalLink, Settings2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const db = supabase as any;

type Category = "insurance" | "crm_planning" | "industry_portal";

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
}

const CATEGORY_LABELS: Record<Category, string> = {
  insurance: "Insurance Providers",
  crm_planning: "CRM & Financial Planning",
  industry_portal: "Industry Portals",
};

const invoke = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("manage-broker-credentials", { body });
  if (error) throw new Error((data as any)?.error ?? error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
};

export default function AppIntegrations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [reauthToken, setReauthToken] = useState<string | null>(null);

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
    enabled: !!user,
    queryFn: async (): Promise<CredentialStatus[]> => (await invoke({ action: "list" })).credentials ?? [],
  });

  const statusFor = (integrationId: string) => (credentials.data ?? []).find((c) => c.integration_id === integrationId);

  const grouped = useMemo(() => {
    const cats: Category[] = ["insurance", "crm_planning", "industry_portal"];
    return cats.map((category) => ({
      category,
      items: (catalog.data ?? []).filter((e) => e.category === category),
    }));
  }, [catalog.data]);

  const handleToggle = async (entry: CatalogEntry, enabled: boolean) => {
    qc.setQueryData(["broker-integration-credentials", user?.id], (prev: CredentialStatus[] | undefined) => {
      const list = prev ?? [];
      const existing = list.find((c) => c.integration_id === entry.id);
      if (existing) return list.map((c) => (c.integration_id === entry.id ? { ...c, is_enabled: enabled } : c));
      return [...list, { integration_id: entry.id, is_enabled: enabled, status: "pending", updated_at: null, has_credentials: false }];
    });
    try {
      await invoke({ action: "toggle", integrationId: entry.id, isEnabled: enabled });
    } catch (e: any) {
      toast.error(e.message ?? "Could not update integration.");
      credentials.refetch();
    }
  };

  const handleUnlock = async () => {
    if (!unlockPassword) return;
    setUnlocking(true);
    try {
      const data = await invoke({ action: "reauth", password: unlockPassword });
      setReauthToken(data.token);
      setUnlockOpen(false);
      setUnlockPassword("");
      toast.success("Unlocked for 10 minutes.");
    } catch (e: any) {
      toast.error(e.message ?? "Incorrect password.");
    } finally {
      setUnlocking(false);
    }
  };

  const openManage = async (entry: CatalogEntry) => {
    if (!reauthToken) {
      setUnlockOpen(true);
      return;
    }
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
      setUnlockOpen(true);
    } finally {
      setLoadingReveal(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!manageEntry || !reauthToken) return;
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

  const loading = catalog.isLoading || credentials.isLoading;

  return (
    <div className="space-y-4">
      <PageHeader
        title={<span className="text-[hsl(var(--navy))]">App Integrations</span>}
        subtitle="Connect your insurance, CRM, and industry portal logins."
        actions={
          reauthToken ? (
            <Badge variant="outline" className="gap-1.5">
              <Unlock className="h-3.5 w-3.5" /> Unlocked
            </Badge>
          ) : (
            <Button size="sm" onClick={() => setUnlockOpen(true)}>
              <Lock className="h-4 w-4 mr-1.5" /> Unlock Credentials
            </Button>
          )
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
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{entry.name}</p>
                            <Badge variant={configured ? "default" : "secondary"} className="mt-0.5 text-2xs px-1.5 py-0 font-normal">
                              {configured
                                ? `Configured${status?.updated_at ? ` · ${new Date(status.updated_at).toLocaleDateString()}` : ""}`
                                : "Not Set Up"}
                            </Badge>
                          </div>
                          <Switch checked={status?.is_enabled ?? false} onCheckedChange={(v) => handleToggle(entry, v)} className="shrink-0" />
                        </div>
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs px-2" asChild>
                            <a href={entry.portal_url} target="_blank" rel="noopener noreferrer">
                              Launch <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
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

      {/* Unlock dialog */}
      <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Credentials</DialogTitle>
            <DialogDescription>Confirm your password to manage saved portal credentials for the next 10 minutes.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockOpen(false)}>Cancel</Button>
            <Button onClick={handleUnlock} disabled={unlocking || !unlockPassword}>
              {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock"}
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
              {manageEntry?.required_fields.includes("username") && (
                <div>
                  <Label>Username</Label>
                  <Input value={manageUsername} onChange={(e) => setManageUsername(e.target.value)} />
                </div>
              )}
              {manageEntry?.required_fields.filter((f) => f !== "username").map((field) => (
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
