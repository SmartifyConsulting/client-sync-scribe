import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Package, Package2, Plus, Trash2, Loader2 } from "lucide-react";

interface StockItem {
  id: string;
  item_name: string;
  category: string;
  unit_of_measure: string;
  unit_cost: number | null;
}

interface Kit {
  id: string;
  kit_name: string;
  procedure_kit_items: { stock_item_id: string; quantity: number }[];
}

interface UsageLine {
  stock_item_id: string;
  item_name: string;
  quantity: number;
  unit_cost: number | null;
}

interface RecordStockUsagePanelProps {
  admissionId: string | null;
  hospitalId: string | null;
  procedureName: string;
  className?: string;
}

export function RecordStockUsagePanel({
  admissionId,
  hospitalId,
  procedureName,
  className,
}: RecordStockUsagePanelProps) {
  const { user } = useAuth();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [lines, setLines] = useState<UsageLine[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedKitId, setSelectedKitId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("stock_items")
          .select("id, item_name, category, unit_of_measure, unit_cost")
          .eq("hospital_id", hospitalId)
          .eq("is_active", true)
          .order("item_name");
        setStockItems(data || []);

        const { data: kitData } = await supabase
          .from("procedure_kits")
          .select("id, kit_name, procedure_kit_items(stock_item_id, quantity)")
          .eq("hospital_id", hospitalId)
          .eq("is_active", true)
          .order("kit_name");
        setKits((kitData as any) || []);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hospitalId]);

  const applyKit = (kitId: string) => {
    const kit = kits.find((k) => k.id === kitId);
    if (!kit) return;

    const newLines: UsageLine[] = kit.procedure_kit_items.map((ki) => {
      const item = stockItems.find((s) => s.id === ki.stock_item_id);
      return {
        stock_item_id: ki.stock_item_id,
        item_name: item?.item_name || "Unknown item",
        quantity: ki.quantity,
        unit_cost: item?.unit_cost ?? null,
      };
    });

    setLines((prev) => [...prev, ...newLines]);
    setSelectedKitId("");
  };

  const addLine = () => {
    if (!selectedItemId || !quantity) return;
    const item = stockItems.find((s) => s.id === selectedItemId);
    if (!item) return;

    setLines((prev) => [
      ...prev,
      {
        stock_item_id: item.id,
        item_name: item.item_name,
        quantity: parseInt(quantity, 10),
        unit_cost: item.unit_cost,
      },
    ]);
    setSelectedItemId("");
    setQuantity("1");
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!admissionId || !user?.id || lines.length === 0) return;

    setSaving(true);
    try {
      for (const line of lines) {
        await supabase.rpc("record_procedure_stock_usage", {
          p_admission_id: admissionId,
          p_procedure_name: procedureName,
          p_stock_item_id: line.stock_item_id,
          p_quantity: line.quantity,
          p_recorded_by: user.id,
          p_recorded_by_name: user.user_metadata?.full_name || user.email || "Unknown",
        });
      }
      setLines([]);
      alert("Stock usage recorded successfully!");
    } finally {
      setSaving(false);
    }
  };

  const estimatedTotal = lines.reduce(
    (sum, l) => sum + l.quantity * (l.unit_cost || 0),
    0
  );

  if (!admissionId) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No admission selected
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            Record Stock Used — {procedureName}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Apply Kit */}
          {kits.length > 0 && (
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs flex items-center gap-1.5">
                  <Package2 className="h-3.5 w-3.5" />
                  Apply Kit
                </Label>
                <Select value={selectedKitId} onValueChange={(v) => { setSelectedKitId(v); applyKit(v); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Add all items from a kit" />
                  </SelectTrigger>
                  <SelectContent>
                    {kits.map((kit) => (
                      <SelectItem key={kit.id} value={kit.id}>
                        {kit.kit_name} ({kit.procedure_kit_items.length} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Add item row */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Stock Item</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={loading ? "Loading..." : "Select item"} />
                </SelectTrigger>
                <SelectContent>
                  {stockItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.item_name} ({item.unit_of_measure})
                      {item.unit_cost ? ` — R${item.unit_cost.toFixed(2)}` : ""}
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
            <Button
              size="sm"
              variant="outline"
              onClick={addLine}
              disabled={!selectedItemId}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Lines added */}
          {lines.length > 0 && (
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                >
                  <span>
                    {line.quantity}x {line.item_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      R{((line.unit_cost || 0) * line.quantity).toFixed(2)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => removeLine(i)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 border-t text-sm font-semibold">
                <span>Estimated Total</span>
                <span>R{estimatedTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={lines.length === 0 || saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Record {lines.length} Item{lines.length !== 1 ? "s" : ""} Used
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Recording usage automatically deducts from stock levels and queues items for the patient invoice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
