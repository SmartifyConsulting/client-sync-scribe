import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage } from "@/pages/admin/_shared/AdminPage";
import { AdminPanel } from "@/pages/admin/_shared/AdminPanel";

const db = supabase as any;

type Category = "insurance" | "crm_planning" | "industry_portal";

interface CatalogEntry {
  id: string;
  name: string;
  category: Category;
  portal_url: string;
  required_fields: string[];
  is_active: boolean;
  display_order: number;
}

const CATEGORY_LABELS: Record<Category, string> = {
  insurance: "Insurance",
  crm_planning: "CRM & Planning",
  industry_portal: "Industry Portals",
};

const ALL_FIELDS = ["username", "password", "pin", "agency_code"] as const;

const emptyDraft = (): Omit<CatalogEntry, "display_order"> => ({
  id: "",
  name: "",
  category: "insurance",
  portal_url: "",
  required_fields: ["username", "password"],
  is_active: true,
});

export default function IntegrationsAdmin() {
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [deleteTarget, setDeleteTarget] = useState<CatalogEntry | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("app_integrations_catalog")
      .select("*")
      .order("category")
      .order("display_order");
    if (error) {
      toast({ title: "Error", description: "Failed to load integrations.", variant: "destructive" });
    } else {
      setEntries((data ?? []) as CatalogEntry[]);
    }
    setLoading(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setDialogOpen(true);
  };

  const openEdit = (entry: CatalogEntry) => {
    setEditingId(entry.id);
    setDraft({
      id: entry.id,
      name: entry.name,
      category: entry.category,
      portal_url: entry.portal_url,
      required_fields: entry.required_fields,
      is_active: entry.is_active,
    });
    setDialogOpen(true);
  };

  const toggleField = (field: string) => {
    setDraft((d) => ({
      ...d,
      required_fields: d.required_fields.includes(field)
        ? d.required_fields.filter((f) => f !== field)
        : [...d.required_fields, field],
    }));
  };

  const handleSave = async () => {
    if (!draft.id.trim() || !draft.name.trim() || !draft.portal_url.trim()) {
      toast({ title: "Missing fields", description: "ID, name, and portal URL are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (editingId) {
      const { error } = await db
        .from("app_integrations_catalog")
        .update({
          name: draft.name,
          category: draft.category,
          portal_url: draft.portal_url,
          required_fields: draft.required_fields,
          is_active: draft.is_active,
        })
        .eq("id", editingId);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    } else {
      const maxOrder = Math.max(0, ...entries.filter((e) => e.category === draft.category).map((e) => e.display_order));
      const { error } = await db.from("app_integrations_catalog").insert({
        id: draft.id.trim().toLowerCase().replace(/\s+/g, "_"),
        name: draft.name,
        category: draft.category,
        portal_url: draft.portal_url,
        required_fields: draft.required_fields,
        is_active: draft.is_active,
        display_order: maxOrder + 1,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setDialogOpen(false);
    fetchEntries();
  };

  const handleToggleActive = async (entry: CatalogEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, is_active: !e.is_active } : e)));
    const { error } = await db.from("app_integrations_catalog").update({ is_active: !entry.is_active }).eq("id", entry.id);
    if (error) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
      fetchEntries();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await db.from("app_integrations_catalog").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: `${deleteTarget.name} removed from the catalog.` });
      fetchEntries();
    }
    setDeleteTarget(null);
  };

  if (roleLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="page-title">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  const grouped = (["insurance", "crm_planning", "industry_portal"] as Category[]).map((cat) => ({
    category: cat,
    items: entries.filter((e) => e.category === cat).sort((a, b) => a.display_order - b.display_order),
  }));

  return (
    <AdminPage
      eyebrow="Admin"
      title="Integrations Directory"
      description="Manage external provider portals brokers can connect to."
      actions={
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add New
        </Button>
      }
    >
      <div className="space-y-3">
        {grouped.map(({ category, items }) => (
          <AdminPanel key={category} title={`${CATEGORY_LABELS[category]} (${items.length})`}>
            <div className="space-y-2">
              {items.length === 0 && (
                <p className="text-xs text-[hsl(var(--admin-text-tertiary))] py-2">No providers in this category yet.</p>
              )}
              {items.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-md border border-[hsl(var(--admin-border-subtle))] bg-[hsl(var(--admin-surface-muted))] p-3"
                >
                  <GripVertical className="h-4 w-4 text-[hsl(var(--admin-text-tertiary))] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{entry.name}</p>
                    <p className="text-xs text-[hsl(var(--admin-text-tertiary))] truncate">{entry.portal_url}</p>
                    <p className="text-2xs text-[hsl(var(--admin-text-tertiary))] mt-0.5">
                      Fields: {entry.required_fields.join(", ")}
                    </p>
                  </div>
                  <Switch checked={entry.is_active} onCheckedChange={() => handleToggleActive(entry)} />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(entry)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(entry)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </AdminPanel>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Provider" : "Add Provider"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editingId && (
              <div>
                <Label>ID (slug)</Label>
                <Input value={draft.id} onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))} placeholder="e.g. brightrock" />
              </div>
            )}
            <div>
              <Label>Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. BrightRock" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft((d) => ({ ...d, category: v as Category }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Portal URL</Label>
              <Input value={draft.portal_url} onChange={(e) => setDraft((d) => ({ ...d, portal_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>Required Fields</Label>
              <div className="flex flex-wrap gap-3 mt-1">
                {ALL_FIELDS.map((field) => (
                  <label key={field} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={draft.required_fields.includes(field)} onCheckedChange={() => toggleField(field)} />
                    {field}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft((d) => ({ ...d, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the provider from the catalog. Any brokers with saved credentials for this provider will lose them too — this cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPage>
  );
}
