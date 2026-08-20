import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Package, Loader2, Upload } from "lucide-react";
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
  category: string;
  unit_of_measure: string;
  unit_cost: number | null;
  reorder_threshold: number;
  quantityOnHand: number;
}

interface StockDashboardProps {
  hospitalId: string | null;
  className?: string;
}

export function StockDashboard({ hospitalId, className }: StockDashboardProps) {
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [allItems, setAllItems] = useState<StockItemRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

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
        .select("id, item_name, category, unit_of_measure, unit_cost, reorder_threshold")
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
              No stock items yet — use Import above to add your catalog
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
                  <Badge
                    variant={isLow ? "secondary" : "outline"}
                    className={cn("shrink-0", isLow && "bg-warning/20 text-warning-foreground")}
                  >
                    {item.quantityOnHand} on hand
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
