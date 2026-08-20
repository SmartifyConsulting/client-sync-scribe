import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
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
import { ClipboardList, Send, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockItem {
  id: string;
  item_name: string;
  unit_of_measure: string;
}

interface Requisition {
  id: string;
  requesting_location: string;
  stock_item_id: string;
  quantity_requested: number;
  quantity_fulfilled: number;
  status: string;
  urgency: string;
  requested_at: string;
  stock_items?: { item_name: string };
}

interface RequisitionPanelProps {
  hospitalId: string | null;
  canApprove?: boolean;
  className?: string;
}

export function RequisitionPanel({
  hospitalId,
  canApprove = false,
  className,
}: RequisitionPanelProps) {
  const { user } = useAuth();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [location, setLocation] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [urgency, setUrgency] = useState("routine");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
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

      const { data: reqs } = await supabase
        .from("stock_requisitions")
        .select("*, stock_items(item_name)")
        .eq("hospital_id", hospitalId)
        .order("requested_at", { ascending: false })
        .limit(20);
      setRequisitions(reqs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId]);

  const handleSubmitRequisition = async () => {
    if (!hospitalId || !itemId || !location || !user?.id) return;
    setSubmitting(true);
    try {
      await supabase.from("stock_requisitions").insert({
        hospital_id: hospitalId,
        requesting_location: location,
        stock_item_id: itemId,
        quantity_requested: parseInt(quantity, 10),
        urgency,
        requested_by: user.id,
        requested_by_name: user.user_metadata?.full_name || user.email || "Unknown",
      });
      setLocation("");
      setItemId("");
      setQuantity("1");
      setUrgency("routine");
      await fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleFulfill = async (req: Requisition) => {
    if (!user?.id) return;
    await supabase
      .from("stock_requisitions")
      .update({
        status: "fulfilled",
        quantity_fulfilled: req.quantity_requested,
        fulfilled_at: new Date().toISOString(),
        fulfilled_by: user.id,
      })
      .eq("id", req.id);
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
      {/* New requisition form */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            New Requisition
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Requesting Ward/Dept</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. ICU Ward 3"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Urgency</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">Stat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Stock Item</Label>
              <Select value={itemId} onValueChange={setItemId}>
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
          </div>

          <Button
            onClick={handleSubmitRequisition}
            disabled={!location || !itemId || submitting}
            className="w-full"
            size="sm"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Requisition
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Requisitions list */}
      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {requisitions.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg text-sm"
            >
              <div>
                <p className="font-medium">
                  {req.quantity_requested}x {req.stock_items?.item_name || "Unknown item"}
                </p>
                <p className="text-xs text-muted-foreground">{req.requesting_location}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    req.urgency === "stat"
                      ? "destructive"
                      : req.urgency === "urgent"
                        ? "secondary"
                        : "outline"
                  }
                  className="text-[10px]"
                >
                  {req.urgency}
                </Badge>
                <Badge
                  variant={req.status === "fulfilled" ? "default" : "outline"}
                  className="text-[10px] capitalize"
                >
                  {req.status}
                </Badge>
                {canApprove && req.status === "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => handleFulfill(req)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
