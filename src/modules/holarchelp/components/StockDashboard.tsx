import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Package, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LowStockItem {
  stock_item_id: string;
  item_name: string;
  category: string;
  quantity_on_hand: number;
  reorder_threshold: number;
  reorder_quantity: number;
}

interface StockDashboardProps {
  hospitalId: string | null;
  className?: string;
}

export function StockDashboard({ hospitalId, className }: StockDashboardProps) {
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;

    const fetchStock = async () => {
      setLoading(true);
      try {
        const { data: lowStockData } = await supabase.rpc("get_low_stock_items", {
          p_hospital_id: hospitalId,
        });
        setLowStock(lowStockData || []);

        const { count } = await supabase
          .from("stock_items")
          .select("id", { count: "exact", head: true })
          .eq("hospital_id", hospitalId)
          .eq("is_active", true);
        setTotalItems(count || 0);
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [hospitalId]);

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
        <Badge variant="outline">{totalItems} active items</Badge>
      </div>

      {lowStock.length > 0 ? (
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
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              All stock levels are healthy — no items below reorder threshold
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
