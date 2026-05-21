import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Ambulance = { id: string; vehicle_code: string; registration_number: string | null; status: string };

interface Props {
  incidentId: string | null;
  providerId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * Paramedic accept flow: lists the org's available ambulances, forces a pick,
 * then calls holarchelp_paramedic_accept. First to accept wins.
 */
export function ParamedicAcceptDialog({ incidentId, providerId, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [accepting, setAccepting] = useState(false);

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
        const list = ((data as any) ?? []) as Ambulance[];
        setAmbulances(list);
        if (list.length === 1) setSelected(list[0].id);
        setLoading(false);
      });
  }, [open, providerId]);

  const accept = async () => {
    if (!incidentId || !selected) return;
    setAccepting(true);
    const { error } = await supabase.rpc("holarchelp_paramedic_accept" as any, {
      _incident_id: incidentId,
      _ambulance_id: selected,
    });
    setAccepting(false);
    if (error) {
      toast.error(error.message === "Incident already taken" ? "Another paramedic accepted first" : error.message);
      onOpenChange(false);
      return;
    }
    toast.success("Incident locked — head out!");
    onOpenChange(false);
    navigate(`/provider/ambulance/incident/${incidentId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Accept SOS — pick your ambulance
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : ambulances.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            No available ambulances in your organisation. Ask your ER admin to add one or mark a vehicle as
            available before accepting an incident.
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Ambulance</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {ambulances.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.vehicle_code}
                    {a.registration_number ? ` · ${a.registration_number}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The ambulance is marked <strong>assigned</strong> until the incident is completed or released.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={accept} disabled={!selected || accepting || ambulances.length === 0}>
            {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
