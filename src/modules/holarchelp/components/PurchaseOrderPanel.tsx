import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, FileWarning, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: string;
  order_date: string;
  expected_delivery_date: string | null;
  total_amount: number;
  suppliers?: { supplier_name: string };
}

interface VendorInvoice {
  id: string;
  invoice_number: string;
  status: string;
  amount: number;
  due_date: string | null;
  suppliers?: { supplier_name: string };
}

interface PurchaseOrderPanelProps {
  hospitalId: string | null;
  className?: string;
}

export function PurchaseOrderPanel({ hospitalId, className }: PurchaseOrderPanelProps) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: poData } = await supabase
          .from("purchase_orders")
          .select("*, suppliers(supplier_name)")
          .eq("hospital_id", hospitalId)
          .order("order_date", { ascending: false })
          .limit(20);
        setOrders(poData || []);

        const supplierIds = (poData || [])
          .map((po: any) => po.supplier_id)
          .filter(Boolean);

        if (supplierIds.length > 0) {
          const { data: invData } = await supabase
            .from("vendor_invoices")
            .select("*, suppliers(supplier_name)")
            .in("supplier_id", supplierIds)
            .order("invoice_date", { ascending: false })
            .limit(20);
          setInvoices(invData || []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hospitalId]);

  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

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
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders" className="text-xs">
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs">
            Vendor Invoices
            {overdueCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5">
                {overdueCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-2 mt-4">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No purchase orders yet
            </p>
          ) : (
            orders.map((po) => (
              <Card key={po.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {po.po_number}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {po.suppliers?.supplier_name || "Unknown supplier"}
                      </p>
                      {po.expected_delivery_date && (
                        <p className="text-xs text-muted-foreground">
                          Expected: {new Date(po.expected_delivery_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={po.status === "received" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {po.status}
                      </Badge>
                      <p className="text-sm font-bold mt-1">
                        R{po.total_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-2 mt-4">
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No vendor invoices yet
            </p>
          ) : (
            invoices.map((inv) => (
              <Card
                key={inv.id}
                className={cn(inv.status === "overdue" && "border-destructive/50")}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2">
                        {inv.status === "overdue" && (
                          <FileWarning className="h-4 w-4 text-destructive" />
                        )}
                        {inv.invoice_number}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inv.suppliers?.supplier_name || "Unknown supplier"}
                      </p>
                      {inv.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(inv.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          inv.status === "paid"
                            ? "default"
                            : inv.status === "overdue"
                              ? "destructive"
                              : "secondary"
                        }
                        className="capitalize"
                      >
                        {inv.status}
                      </Badge>
                      <p className="text-sm font-bold mt-1">R{inv.amount.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
