import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { useParamedicShift } from "../hooks/useParamedicShift";

type Ambulance = { id: string; vehicle_code: string; registration_number: string | null; status: string };

export function StartShiftDialog({
  providerId,
  open,
  onOpenChange,
}: {
  providerId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { startShift } = useParamedicShift();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Ambulance[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !providerId) return;
    setLoading(true);
    setSelected("");
    supabase
      .from("ambulances" as any)
      .select("id, vehicle_code, registration_number, status")
      .eq("provider_id", providerId)
      .eq("status", "available")
      .order("vehicle_code")
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        const rows = ((data as any) ?? []) as Ambulance[];
        setList(rows);
        if (rows.length === 1) setSelected(rows[0].id);
        setLoading(false);
      });
  }, [open, providerId]);

  const start = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await startShift(selected);
      toast.success("Shift started — you are now available");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Could not start shift");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" /> Start shift
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : list.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            No available ambulances. Ask your ER admin to add one or free up a vehicle.
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Pick your ambulance for this shift</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="Select a vehicle" /></SelectTrigger>
              <SelectContent>
                {list.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.vehicle_code}{a.registration_number ? ` · ${a.registration_number}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              You'll be marked <strong>Available</strong> and start receiving SOS notifications.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={start} disabled={!selected || busy || list.length === 0}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
