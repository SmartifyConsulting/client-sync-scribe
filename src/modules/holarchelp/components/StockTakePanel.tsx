import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockItem {
  id: string;
  item_name: string;
  unit_of_measure: string;
}

interface ReconciliationRow {
  id: string;
  stock_item_id: string;
  system_quantity: number;
  physical_count: number;
  variance: number;
  variance_reason: string | null;
  applied: boolean;
  count_date: string;
  stock_items?: { item_name: string };
}

interface StockTakePanelProps {
  hospitalId: string | null;
  className?: string;
}

export function StockTakePanel({ hospitalId, className }: StockTakePanelProps) {
  const { user } = useAuth();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState("");
  const [systemQty, setSystemQty] = useState<number | null>(null);
  const [physicalCount, setPhysicalCount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const { data: items } = await supabase
        .from("stock_items")
        .select("id, item_name, unit_of_measure")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .order("item_name");
      setStockItems(items || []);

      const { data: history } = await supabase
        .from("stock_count_reconciliation")
        .select("*, stock_items(item_name)")
        .eq("hospital_id", hospitalId)
        .order("count_date", { ascending: false })
        .limit(30);
      setRows(history || []);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectItem = async (itemId: string) => {
    setSelectedItemId(itemId);
    setPhysicalCount("");
    setReason("");

    const { data: levels } = await supabase
      .from("stock_levels")
      .select("quantity_on_hand")
      .eq("stock_item_id", itemId)
      .eq("hospital_id", hospitalId);

    const total = (levels || []).reduce((sum, l) => sum + (l.quantity_on_hand || 0), 0);
    setSystemQty(total);
  };

  const variancePreview = physicalCount !== "" && systemQty !== null ? parseInt(physicalCount, 10) - systemQty : null;

  const handleRecordCount = async () => {
    if (!hospitalId || !user?.id || !selectedItemId || physicalCount === "" || systemQty === null) return;
    setSaving(true);
    try {
      await supabase.from("stock_count_reconciliation").insert({
        stock_item_id: selectedItemId,
        hospital_id: hospitalId,
        counted_by: user.id,
        system_quantity: systemQty,
        physical_count: parseInt(physicalCount, 10),
        variance_reason: reason || null,
      });

      setSelectedItemId("");
      setSystemQty(null);
      setPhysicalCount("");
      setReason("");
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const applyCorrection = async (row: ReconciliationRow) => {
    if (!user?.id || !hospitalId) return;

    const { data: level } = await supabase
      .from("stock_levels")
      .select("id")
      .eq("stock_item_id", row.stock_item_id)
      .eq("hospital_id", hospitalId)
      .eq("location_name", "Central Store")
      .maybeSingle();

    if (level) {
      await supabase.from("stock_levels").update({ quantity_on_hand: row.physical_count }).eq("id", level.id);
    } else {
      await supabase.from("stock_levels").insert({
        stock_item_id: row.stock_item_id,
        hospital_id: hospitalId,
        location_name: "Central Store",
        quantity_on_hand: row.physical_count,
      });
    }

    await supabase
      .from("stock_count_reconciliation")
      .update({ applied: true, applied_at: new Date().toISOString(), applied_by: user.id })
      .eq("id", row.id);

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
      <Card>
        <CardContent className="pt-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Record Physical Count
          </p>

          <div className="space-y-1">
            <Label className="text-xs">Stock Item</Label>
            <Select value={selectedItemId} onValueChange={handleSelectItem}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select item to count" /></SelectTrigger>
              <SelectContent>
                {stockItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.item_name} ({item.unit_of_measure})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedItemId && systemQty !== null && (
            <>
              <div className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">System quantity</span>
                <span className="font-semibold">{systemQty}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Physical Count</Label>
                  <Input type="number" min="0" value={physicalCount} onChange={(e) => setPhysicalCount(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Variance</Label>
                  <div
                    className={cn(
                      "h-9 flex items-center px-3 rounded-md border text-sm font-semibold",
                      variancePreview === null
                        ? "text-muted-foreground"
                        : variancePreview === 0
                          ? "text-green-600 border-green-500/30"
                          : "text-destructive border-destructive/30"
                    )}
                  >
                    {variancePreview === null ? "—" : variancePreview > 0 ? `+${variancePreview}` : variancePreview}
                  </div>
                </div>
              </div>

              {variancePreview !== null && variancePreview !== 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Reason for Variance (optional)</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Damaged stock disposed, miscount on last delivery…" />
                </div>
              )}

              <Button onClick={handleRecordCount} disabled={physicalCount === "" || saving} className="w-full" size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record Count"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div>
        <p className="text-sm font-semibold mb-2">Recent Counts</p>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No stock counts recorded yet</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <Card
                key={row.id}
                className={cn(
                  "rounded-xl border p-4",
                  row.variance !== 0 && !row.applied ? "border-warning/50 bg-warning/5" : "border-primary bg-card"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{row.stock_items?.item_name || "Unknown item"}</p>
                    <p className="text-xs text-muted-foreground">
                      System {row.system_quantity} → Counted {row.physical_count}
                    </p>
                    {row.variance_reason && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">"{row.variance_reason}"</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <Badge
                      variant={row.variance === 0 ? "outline" : "secondary"}
                      className={cn(row.variance !== 0 && "bg-warning/20 text-warning-foreground")}
                    >
                      {row.variance > 0 ? `+${row.variance}` : row.variance}
                    </Badge>
                    {row.applied ? (
                      <Badge variant="default" className="text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Applied
                      </Badge>
                    ) : row.variance !== 0 ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyCorrection(row)}>
                        Apply Correction
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
