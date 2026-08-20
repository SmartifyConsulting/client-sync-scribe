import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Package2, Plus, Trash2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockItem {
  id: string;
  item_name: string;
  unit_of_measure: string;
}

interface KitItemDraft {
  stock_item_id: string;
  item_name: string;
  quantity: number;
}

interface Kit {
  id: string;
  kit_name: string;
  procedure_name: string | null;
  description: string | null;
  itemCount: number;
}

interface ProcedureKitsPanelProps {
  hospitalId: string | null;
  className?: string;
}

export function ProcedureKitsPanel({ hospitalId, className }: ProcedureKitsPanelProps) {
  const { user } = useAuth();
  const [kits, setKits] = useState<Kit[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [kitName, setKitName] = useState("");
  const [procedureName, setProcedureName] = useState("");
  const [draftItems, setDraftItems] = useState<KitItemDraft[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const fetchData = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const { data: kitData } = await supabase
        .from("procedure_kits")
        .select("id, kit_name, procedure_name, description, procedure_kit_items(id)")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .order("kit_name");

      setKits(
        (kitData || []).map((k: any) => ({
          id: k.id,
          kit_name: k.kit_name,
          procedure_name: k.procedure_name,
          description: k.description,
          itemCount: k.procedure_kit_items?.length || 0,
        }))
      );

      const { data: items } = await supabase
        .from("stock_items")
        .select("id, item_name, unit_of_measure")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .order("item_name");
      setStockItems(items || []);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addDraftItem = () => {
    if (!selectedItemId || !quantity) return;
    const item = stockItems.find((s) => s.id === selectedItemId);
    if (!item) return;

    setDraftItems((prev) => [
      ...prev,
      { stock_item_id: item.id, item_name: item.item_name, quantity: parseInt(quantity, 10) },
    ]);
    setSelectedItemId("");
    setQuantity("1");
  };

  const removeDraftItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setKitName("");
    setProcedureName("");
    setDraftItems([]);
    setSelectedItemId("");
    setQuantity("1");
  };

  const handleSaveKit = async () => {
    if (!hospitalId || !user?.id || !kitName || draftItems.length === 0) return;

    setSaving(true);
    try {
      const { data: kit, error } = await supabase
        .from("procedure_kits")
        .insert({
          hospital_id: hospitalId,
          kit_name: kitName,
          procedure_name: procedureName || null,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      await supabase.from("procedure_kit_items").insert(
        draftItems.map((item) => ({
          kit_id: kit.id,
          stock_item_id: item.stock_item_id,
          quantity: item.quantity,
        }))
      );

      resetForm();
      setDialogOpen(false);
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKit = async (kitId: string) => {
    await supabase.from("procedure_kits").update({ is_active: false }).eq("id", kitId);
    await fetchData();
  };

  if (!hospitalId) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No hospital selected
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Package2 className="h-4 w-4" />
          Procedure Kits
        </p>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Kit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Procedure Kit</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Kit Name</Label>
                  <Input
                    value={kitName}
                    onChange={(e) => setKitName(e.target.value)}
                    placeholder="e.g. Wound Dressing Kit"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Suggested Procedure (optional)</Label>
                  <Input
                    value={procedureName}
                    onChange={(e) => setProcedureName(e.target.value)}
                    placeholder="e.g. Wound Care & Dressing"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Stock Item</Label>
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {stockItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.item_name} ({item.unit_of_measure})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-9"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={addDraftItem} disabled={!selectedItemId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {draftItems.length > 0 && (
                <div className="space-y-2">
                  {draftItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                    >
                      <span>
                        {item.quantity}x {item.item_name}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => removeDraftItem(i)}
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleSaveKit}
                disabled={!kitName || draftItems.length === 0 || saving}
                className="w-full"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Kit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : kits.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No procedure kits yet — bundle frequently used items together for faster billing entry
        </p>
      ) : (
        <div className="space-y-2">
          {kits.map((kit) => (
            <Card key={kit.id} className="rounded-xl border border-primary bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{kit.kit_name}</p>
                  {kit.procedure_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Suggested for: {kit.procedure_name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {kit.itemCount} item{kit.itemCount !== 1 ? "s" : ""}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDeleteKit(kit.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
