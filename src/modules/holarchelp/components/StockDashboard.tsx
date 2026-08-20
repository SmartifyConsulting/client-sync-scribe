import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Package, Loader2, Upload, Plus, Pencil, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { StockImportDialog } from "./StockImportDialog";

interface LowStockItem {
  stock_item_id: string;
  item_name: string;
  category: string;
  quantity_on_hand: number;
  reorder_threshold: number;
  reorder_quantity: number;
}

interface StockItemRow {
  id: string;
  item_name: string;
  item_code: string | null;
  category: string;
  unit_of_measure: string;
  unit_cost: number | null;
  reorder_threshold: number;
  reorder_quantity: number;
  quantityOnHand: number;
}

interface StockDashboardProps {
  hospitalId: string | null;
  className?: string;
}

const CATEGORIES = ["medication", "consumable", "equipment", "ppe"];

const emptyForm = {
  item_name: "",
  item_code: "",
  category: "consumable",
  unit_of_measure: "unit",
  unit_cost: "",
  reorder_threshold: "10",
  reorder_quantity: "50",
  initial_quantity: "",
};

export function StockDashboard({ hospitalId, className }: StockDashboardProps) {
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [allItems, setAllItems] = useState<StockItemRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchStock = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const { data: lowStockData } = await supabase.rpc("get_low_stock_items", {
        p_hospital_id: hospitalId,
      });
      setLowStock(lowStockData || []);

      const { data: items } = await supabase
        .from("stock_items")
        .select("id, item_name, item_code, category, unit_of_measure, unit_cost, reorder_threshold, reorder_quantity")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .order("item_name");

      const itemIds = (items || []).map((i) => i.id);
      let levelsByItem = new Map<string, number>();
      if (itemIds.length > 0) {
        const { data: levels } = await supabase
          .from("stock_levels")
          .select("stock_item_id, quantity_on_hand")
          .in("stock_item_id", itemIds);
        for (const l of levels || []) {
          levelsByItem.set(l.stock_item_id, (levelsByItem.get(l.stock_item_id) || 0) + (l.quantity_on_hand || 0));
        }
      }

      setAllItems(
        (items || []).map((i) => ({
          ...i,
          quantityOnHand: levelsByItem.get(i.id) || 0,
        }))
      );
      setTotalItems(items?.length || 0);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: StockItemRow) => {
    setEditingId(item.id);
    setForm({
      item_name: item.item_name,
      item_code: item.item_code || "",
      category: item.category,
      unit_of_measure: item.unit_of_measure,
      unit_cost: item.unit_cost != null ? String(item.unit_cost) : "",
      reorder_threshold: String(item.reorder_threshold),
      reorder_quantity: String(item.reorder_quantity),
      initial_quantity: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!hospitalId || !form.item_name) return;
    setSaving(true);
    try {
      const payload = {
        item_name: form.item_name,
        item_code: form.item_code || null,
        category: form.category,
        unit_of_measure: form.unit_of_measure || "unit",
        unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : null,
        reorder_threshold: parseInt(form.reorder_threshold, 10) || 10,
        reorder_quantity: parseInt(form.reorder_quantity, 10) || 50,
      };

      if (editingId) {
        await supabase.from("stock_items").update(payload).eq("id", editingId);
      } else {
        const { data: created, error } = await supabase
          .from("stock_items")
          .insert({ ...payload, hospital_id: hospitalId })
          .select("id")
          .single();
        if (error) throw error;

        const initialQty = parseInt(form.initial_quantity, 10);
        if (created && initialQty > 0) {
          await supabase.from("stock_levels").insert({
            stock_item_id: created.id,
            hospital_id: hospitalId,
            location_name: "Central Store",
            quantity_on_hand: initialQty,
          });
        }
      }

      setDialogOpen(false);
      await fetchStock();
    } finally {
      setSaving(false);
    }
  };

  const deactivateItem = async (id: string) => {
    await supabase.from("stock_items").update({ is_active: false }).eq("id", id);
    await fetchStock();
  };

  if (!hospitalId) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No hospital selected
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" />
          Stock Overview
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{totalItems} active items</Badge>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs" onClick={openNew}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Stock Item" : "New Stock Item"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Item Name</Label>
                  <Input value={form.item_name} onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))} className="h-9" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Item Code</Label>
                    <Input value={form.item_code} onChange={(e) => setForm((f) => ({ ...f, item_code: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit of Measure</Label>
                    <Input value={form.unit_of_measure} onChange={(e) => setForm((f) => ({ ...f, unit_of_measure: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit Cost (R)</Label>
                    <Input type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm((f) => ({ ...f, unit_cost: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Reorder Threshold</Label>
                    <Input type="number" value={form.reorder_threshold} onChange={(e) => setForm((f) => ({ ...f, reorder_threshold: e.target.value }))} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Reorder Quantity</Label>
                    <Input type="number" value={form.reorder_quantity} onChange={(e) => setForm((f) => ({ ...f, reorder_quantity: e.target.value }))} className="h-9" />
                  </div>
                </div>
                {!editingId && (
                  <div className="space-y-1">
                    <Label className="text-xs">Initial Quantity on Hand (optional)</Label>
                    <Input type="number" value={form.initial_quantity} onChange={(e) => setForm((f) => ({ ...f, initial_quantity: e.target.value }))} className="h-9" />
                  </div>
                )}
                <Button onClick={handleSave} disabled={!form.item_name || saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Save Changes" : "Add Item"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <StockImportDialog
            hospitalId={hospitalId}
            onImportComplete={fetchStock}
            trigger={
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import
              </Button>
            }
          />
        </div>
      </div>

      {lowStock.length > 0 && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">
            {lowStock.length} item{lowStock.length !== 1 ? "s" : ""} below reorder threshold
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            {lowStock.map((item) => (
              <div
                key={item.stock_item_id}
                className="flex items-center justify-between text-xs p-2 bg-white dark:bg-slate-950 rounded border border-warning/30"
              >
                <div>
                  <p className="font-medium text-foreground">{item.item_name}</p>
                  <p className="text-muted-foreground capitalize">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-warning">
                    {item.quantity_on_hand} on hand
                  </p>
                  <p className="text-muted-foreground">
                    Reorder {item.reorder_quantity} (threshold {item.reorder_threshold})
                  </p>
                </div>
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {allItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No stock items yet — use Add Item or Import above
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {allItems.map((item) => {
            const isLow = item.quantityOnHand <= item.reorder_threshold;
            return (
              <Card
                key={item.id}
                className={cn(
                  "rounded-xl border p-4",
                  isLow ? "border-warning/50 bg-warning/5" : "border-primary bg-card"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {item.category} · {item.unit_of_measure}
                      {item.unit_cost != null ? ` · R${item.unit_cost.toFixed(2)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant={isLow ? "secondary" : "outline"}
                      className={cn(isLow && "bg-warning/20 text-warning-foreground")}
                    >
                      {item.quantityOnHand} on hand
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deactivateItem(item.id)}>
                      <Ban className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
