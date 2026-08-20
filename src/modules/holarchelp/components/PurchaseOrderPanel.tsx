import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, FileWarning, Plus, Trash2, PackageCheck, DollarSign, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SuppliersPanel, type Supplier } from "./SuppliersPanel";

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: string;
  order_date: string;
  expected_delivery_date: string | null;
  total_amount: number;
  supplier_id: string;
  suppliers?: { supplier_name: string };
}

interface VendorInvoice {
  id: string;
  invoice_number: string;
  status: string;
  amount: number;
  due_date: string | null;
  supplier_id: string;
  purchase_order_id: string | null;
  suppliers?: { supplier_name: string };
}

interface StockItem {
  id: string;
  item_name: string;
  unit_of_measure: string;
  unit_cost: number | null;
}

interface POLineDraft {
  stock_item_id: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
}

const STATUS_FLOW = ["draft", "sent", "confirmed", "received"];
const NEXT_STATUS_LABEL: Record<string, string> = {
  draft: "Mark Sent",
  sent: "Mark Confirmed",
  confirmed: "Receive Goods",
};

interface PurchaseOrderPanelProps {
  hospitalId: string | null;
  className?: string;
}

export function PurchaseOrderPanel({ hospitalId, className }: PurchaseOrderPanelProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState("");
  const [poDeliveryDate, setPoDeliveryDate] = useState("");
  const [poLines, setPoLines] = useState<POLineDraft[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [lineQty, setLineQty] = useState("1");
  const [savingPO, setSavingPO] = useState(false);

  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const [invSupplierId, setInvSupplierId] = useState("");
  const [invPOId, setInvPOId] = useState("");
  const [invNumber, setInvNumber] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [invDueDate, setInvDueDate] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [savingInvoice, setSavingInvoice] = useState(false);

  const fetchData = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const { data: poData } = await supabase
        .from("purchase_orders")
        .select("*, suppliers(supplier_name)")
        .eq("hospital_id", hospitalId)
        .order("order_date", { ascending: false })
        .limit(30);
      setOrders(poData || []);

      const supplierIds = (poData || []).map((po: any) => po.supplier_id).filter(Boolean);
      const { data: supplierRows } = await supabase.from("suppliers").select("*").eq("is_active", true).order("supplier_name");
      setSuppliers(supplierRows || []);

      const allSupplierIds = Array.from(new Set([...supplierIds, ...(supplierRows || []).map((s) => s.id)]));
      if (allSupplierIds.length > 0) {
        const { data: invData } = await supabase
          .from("vendor_invoices")
          .select("*, suppliers(supplier_name)")
          .in("supplier_id", allSupplierIds)
          .order("invoice_date", { ascending: false })
          .limit(30);
        setInvoices(invData || []);
      } else {
        setInvoices([]);
      }

      const { data: items } = await supabase
        .from("stock_items")
        .select("id, item_name, unit_of_measure, unit_cost")
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

  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  // ---------------- New Purchase Order ----------------

  const addPoLine = () => {
    if (!selectedItemId || !lineQty) return;
    const item = stockItems.find((s) => s.id === selectedItemId);
    if (!item) return;
    setPoLines((prev) => [
      ...prev,
      { stock_item_id: item.id, item_name: item.item_name, quantity: parseInt(lineQty, 10), unit_cost: item.unit_cost || 0 },
    ]);
    setSelectedItemId("");
    setLineQty("1");
  };

  const removePoLine = (i: number) => setPoLines((prev) => prev.filter((_, idx) => idx !== i));

  const poTotal = poLines.reduce((sum, l) => sum + l.quantity * l.unit_cost, 0);

  const resetPoForm = () => {
    setPoSupplierId("");
    setPoDeliveryDate("");
    setPoLines([]);
    setSelectedItemId("");
    setLineQty("1");
  };

  const handleCreatePO = async () => {
    if (!hospitalId || !user?.id || !poSupplierId || poLines.length === 0) return;
    setSavingPO(true);
    try {
      const poNumber = `PO-${Date.now().toString().slice(-8)}`;
      const { data: po, error } = await supabase
        .from("purchase_orders")
        .insert({
          hospital_id: hospitalId,
          supplier_id: poSupplierId,
          po_number: poNumber,
          status: "draft",
          ordered_by: user.id,
          expected_delivery_date: poDeliveryDate || null,
          total_amount: poTotal,
        })
        .select("id")
        .single();

      if (error) throw error;

      await supabase.from("purchase_order_lines").insert(
        poLines.map((l) => ({
          purchase_order_id: po.id,
          stock_item_id: l.stock_item_id,
          quantity_ordered: l.quantity,
          unit_cost: l.unit_cost,
          line_total: l.quantity * l.unit_cost,
        }))
      );

      resetPoForm();
      setPoDialogOpen(false);
      await fetchData();
    } finally {
      setSavingPO(false);
    }
  };

  // ---------------- Status advance / receive goods ----------------

  const advanceStatus = async (po: PurchaseOrder) => {
    const idx = STATUS_FLOW.indexOf(po.status);
    const next = STATUS_FLOW[idx + 1];
    if (!next) return;

    if (next === "received") {
      await receiveGoods(po);
      return;
    }
    await supabase.from("purchase_orders").update({ status: next }).eq("id", po.id);
    await fetchData();
  };

  const receiveGoods = async (po: PurchaseOrder) => {
    if (!user?.id) return;
    const { data: lines } = await supabase
      .from("purchase_order_lines")
      .select("id, stock_item_id, quantity_ordered")
      .eq("purchase_order_id", po.id);

    for (const line of lines || []) {
      await supabase.from("purchase_order_lines").update({ quantity_received: line.quantity_ordered }).eq("id", line.id);

      const { data: existingLevel } = await supabase
        .from("stock_levels")
        .select("id, quantity_on_hand")
        .eq("stock_item_id", line.stock_item_id)
        .eq("hospital_id", hospitalId)
        .eq("location_name", "Central Store")
        .maybeSingle();

      if (existingLevel) {
        await supabase
          .from("stock_levels")
          .update({ quantity_on_hand: existingLevel.quantity_on_hand + line.quantity_ordered })
          .eq("id", existingLevel.id);
      } else {
        await supabase.from("stock_levels").insert({
          stock_item_id: line.stock_item_id,
          hospital_id: hospitalId,
          location_name: "Central Store",
          quantity_on_hand: line.quantity_ordered,
        });
      }
    }

    await supabase.from("goods_received").insert({ purchase_order_id: po.id, received_by: user.id });
    await supabase.from("purchase_orders").update({ status: "received" }).eq("id", po.id);
    await fetchData();
  };

  // ---------------- New Vendor Invoice ----------------

  const openInvoiceDialog = (po?: PurchaseOrder) => {
    setInvSupplierId(po?.supplier_id || "");
    setInvPOId(po?.id || "");
    setInvNumber(`INV-${Date.now().toString().slice(-8)}`);
    setInvDate(new Date().toISOString().slice(0, 10));
    setInvDueDate("");
    setInvAmount(po ? String(po.total_amount) : "");
    setInvDialogOpen(true);
  };

  const handleCreateInvoice = async () => {
    if (!invSupplierId || !invNumber || !invAmount) return;
    setSavingInvoice(true);
    try {
      await supabase.from("vendor_invoices").insert({
        supplier_id: invSupplierId,
        purchase_order_id: invPOId || null,
        invoice_number: invNumber,
        invoice_date: invDate,
        due_date: invDueDate || null,
        amount: parseFloat(invAmount),
        status: "pending",
      });
      setInvDialogOpen(false);
      await fetchData();
    } finally {
      setSavingInvoice(false);
    }
  };

  const markInvoicePaid = async (inv: VendorInvoice) => {
    await supabase
      .from("vendor_invoices")
      .update({ status: "paid", paid_date: new Date().toISOString().slice(0, 10), paid_amount: inv.amount })
      .eq("id", inv.id);
    await fetchData();
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
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders" className="text-xs">Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs">Suppliers</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs">
            Vendor Invoices
            {overdueCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5">{overdueCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Purchase Orders ---------------- */}
        <TabsContent value="orders" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Dialog open={poDialogOpen} onOpenChange={(open) => { setPoDialogOpen(open); if (!open) resetPoForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New Purchase Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>New Purchase Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Supplier</Label>
                      <Select value={poSupplierId} onValueChange={setPoSupplierId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {suppliers.length === 0 && (
                        <p className="text-[11px] text-muted-foreground">Add a supplier first in the Suppliers tab.</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Expected Delivery</Label>
                      <Input type="date" value={poDeliveryDate} onChange={(e) => setPoDeliveryDate(e.target.value)} className="h-9" />
                    </div>
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Stock Item</Label>
                      <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>
                          {stockItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>{item.item_name} ({item.unit_of_measure})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min="1" value={lineQty} onChange={(e) => setLineQty(e.target.value)} className="h-9" />
                    </div>
                    <Button size="sm" variant="outline" onClick={addPoLine} disabled={!selectedItemId}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {poLines.length > 0 && (
                    <div className="space-y-2">
                      {poLines.map((l, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                          <span>{l.quantity}x {l.item_name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">R{(l.quantity * l.unit_cost).toFixed(2)}</Badge>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removePoLine(i)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                        <span>Total</span>
                        <span>R{poTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleCreatePO}
                    disabled={!poSupplierId || poLines.length === 0 || savingPO}
                    className="w-full"
                  >
                    {savingPO ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Purchase Order"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No purchase orders yet</p>
          ) : (
            orders.map((po) => {
              const nextLabel = NEXT_STATUS_LABEL[po.status];
              return (
                <Card key={po.id} className="rounded-xl border border-primary bg-card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {po.po_number}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{po.suppliers?.supplier_name || "Unknown supplier"}</p>
                      {po.expected_delivery_date && (
                        <p className="text-xs text-muted-foreground">Expected: {new Date(po.expected_delivery_date).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={po.status === "received" ? "default" : "secondary"} className="capitalize">{po.status}</Badge>
                      <p className="text-sm font-bold mt-1">R{po.total_amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {nextLabel && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => advanceStatus(po)}>
                        <PackageCheck className="h-3.5 w-3.5 mr-1.5" />
                        {nextLabel}
                      </Button>
                    )}
                    {po.status === "received" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openInvoiceDialog(po)}>
                        <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                        Record Invoice
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ---------------- Suppliers ---------------- */}
        <TabsContent value="suppliers" className="mt-4">
          <SuppliersPanel onChanged={fetchData} />
        </TabsContent>

        {/* ---------------- Vendor Invoices ---------------- */}
        <TabsContent value="invoices" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Dialog open={invDialogOpen} onOpenChange={setInvDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 text-xs" onClick={() => openInvoiceDialog()}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Record Vendor Invoice</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Supplier</Label>
                    <Select value={invSupplierId} onValueChange={setInvSupplierId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Invoice Number</Label>
                      <Input value={invNumber} onChange={(e) => setInvNumber(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input type="number" step="0.01" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Invoice Date</Label>
                      <Input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Due Date</Label>
                      <Input type="date" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} className="h-9" />
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateInvoice}
                    disabled={!invSupplierId || !invNumber || !invAmount || savingInvoice}
                    className="w-full"
                  >
                    {savingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record Invoice"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No vendor invoices yet</p>
          ) : (
            invoices.map((inv) => (
              <Card key={inv.id} className={cn("rounded-xl border p-5", inv.status === "overdue" ? "border-destructive/50 bg-destructive/5" : "border-primary bg-card")}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      {inv.status === "overdue" && <FileWarning className="h-4 w-4 text-destructive" />}
                      {inv.invoice_number}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{inv.suppliers?.supplier_name || "Unknown supplier"}</p>
                    {inv.due_date && (
                      <p className="text-xs text-muted-foreground">Due: {new Date(inv.due_date).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"} className="capitalize">
                      {inv.status}
                    </Badge>
                    <p className="text-sm font-bold mt-1">R{inv.amount.toFixed(2)}</p>
                  </div>
                </div>
                {inv.status !== "paid" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs mt-3" onClick={() => markInvoicePaid(inv)}>
                    <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                    Mark Paid
                  </Button>
                )}
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
