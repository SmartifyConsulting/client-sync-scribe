import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Truck, Plus, Pencil, Ban, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Supplier {
  id: string;
  supplier_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  payment_terms: string | null;
  is_active: boolean;
}

interface SuppliersPanelProps {
  className?: string;
  onChanged?: () => void;
}

const emptyForm = {
  supplier_name: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  payment_terms: "Net 30",
};

export function SuppliersPanel({ className, onChanged }: SuppliersPanelProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("suppliers")
        .select("*")
        .order("supplier_name");
      setSuppliers(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({
      supplier_name: s.supplier_name,
      contact_email: s.contact_email || "",
      contact_phone: s.contact_phone || "",
      address: s.address || "",
      payment_terms: s.payment_terms || "Net 30",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.supplier_name) return;
    setSaving(true);
    try {
      if (editingId) {
        await supabase
          .from("suppliers")
          .update({
            supplier_name: form.supplier_name,
            contact_email: form.contact_email || null,
            contact_phone: form.contact_phone || null,
            address: form.address || null,
            payment_terms: form.payment_terms || null,
          })
          .eq("id", editingId);
      } else {
        await supabase.from("suppliers").insert({
          supplier_name: form.supplier_name,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
          address: form.address || null,
          payment_terms: form.payment_terms || null,
        });
      }
      setDialogOpen(false);
      await fetchSuppliers();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Supplier) => {
    await supabase.from("suppliers").update({ is_active: !s.is_active }).eq("id", s.id);
    await fetchSuppliers();
    onChanged?.();
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Suppliers
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-xs" onClick={openNew}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Supplier" : "New Supplier"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Supplier Name</Label>
                <Input
                  value={form.supplier_name}
                  onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Contact Email</Label>
                  <Input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contact Phone</Label>
                  <Input
                    value={form.contact_phone}
                    onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Address</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment Terms</Label>
                <Input
                  value={form.payment_terms}
                  onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))}
                  className="h-9"
                  placeholder="e.g. Net 30"
                />
              </div>
              <Button onClick={handleSave} disabled={!form.supplier_name || saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Save Changes" : "Add Supplier"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : suppliers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No suppliers yet</p>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <Card
              key={s.id}
              className={cn(
                "rounded-xl border p-4",
                s.is_active ? "border-primary bg-card" : "border-muted bg-muted/20 opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{s.supplier_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[s.contact_email, s.contact_phone].filter(Boolean).join(" · ") || "No contact info"}
                  </p>
                  {s.payment_terms && (
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {s.payment_terms}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleActive(s)}>
                    {s.is_active ? (
                      <Ban className="h-3.5 w-3.5 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
