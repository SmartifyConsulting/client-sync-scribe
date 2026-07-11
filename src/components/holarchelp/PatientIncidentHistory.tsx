import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Siren, Loader2, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId: string | null | undefined;
  title?: string;
}

const SEVERITY_CHIP: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function PatientIncidentHistory({ userId, title = "Emergency incidents" }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [whenDate, setWhenDate] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const load = async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const { data: incidents } = await supabase
      .from("holarchelp_incidents" as any)
      .select("id, status, severity, created_at, accepted_at, arrived_at, resolved_at, eta_minutes, assigned_provider_id, manually_logged, notes")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const list = (incidents as any[]) ?? [];
    const providerIds = Array.from(new Set(list.map((i) => i.assigned_provider_id).filter(Boolean)));
    const incidentIds = list.map((i) => i.id);
    let providerNames: Record<string, string> = {};
    const autoSet = new Set<string>();
    if (providerIds.length) {
      const [{ data: hs }, { data: as_ }] = await Promise.all([
        supabase.from("holarchelp_hospitals_public" as any).select("id, name").in("id", providerIds),
        supabase.from("holarchelp_ambulance_providers_public" as any).select("id, company_name").in("id", providerIds),
      ]);
      for (const h of (hs as any[]) ?? []) providerNames[h.id] = h.name;
      for (const a of (as_ as any[]) ?? []) providerNames[a.id] = a.company_name;
    }
    if (incidentIds.length) {
      const { data: ev } = await supabase
        .from("holarchelp_incident_events" as any)
        .select("incident_id, event_type")
        .in("incident_id", incidentIds)
        .eq("event_type", "auto_assigned");
      for (const e of (ev as any[]) ?? []) autoSet.add(e.incident_id);
    }
    setRows(list.map((i) => ({
      ...i,
      provider_name: providerNames[i.assigned_provider_id] ?? (i.manually_logged ? "Manually logged" : "Unassigned"),
      auto_assigned: autoSet.has(i.id),
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const submitManual = async () => {
    if (!userId) return;
    setSaving(true);
    const token = crypto.randomUUID().replace(/-/g, "");
    const createdAt = new Date(whenDate).toISOString();
    const { error } = await supabase.from("holarchelp_incidents" as any).insert({
      user_id: userId,
      status: "completed",
      tracking_token: token,
      severity,
      manually_logged: true,
      notes: notes || null,
      created_at: createdAt,
      resolved_at: createdAt,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't log incident", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Incident logged" });
    setNotes(""); setSeverity("medium");
    setOpen(false);
    load();
  };

  const canLog = !!userId && !!me && me === userId;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Siren className="h-4 w-4 text-red-500" /> {title}
        </CardTitle>
        {canLog && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1 h-7">
            <Plus className="h-4 w-4" /> Log Incident
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No SOS calls on record.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((i) => (
              <div key={i.id} className="rounded-lg border p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{format(parseISO(i.created_at), "MMM d, yyyy h:mm a")}</span>
                  <div className="flex items-center gap-1.5">
                    {i.severity && (
                      <Badge className={`border-0 capitalize ${SEVERITY_CHIP[i.severity] ?? "bg-muted text-foreground"}`}>{i.severity}</Badge>
                    )}
                    <Badge variant="outline" className="capitalize">{i.status}</Badge>
                    {i.manually_logged && <Badge variant="outline" className="text-xs">Manual</Badge>}
                  </div>
                </div>
                <div className="text-muted-foreground">
                  Provider: <span className="text-foreground font-medium">{i.provider_name}</span>
                  {i.auto_assigned && <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">AUTO</span>}
                </div>
                {i.notes && <div className="text-sm">{i.notes}</div>}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                  {i.accepted_at && <span>Accepted {format(parseISO(i.accepted_at), "HH:mm")}</span>}
                  {i.arrived_at && <span>Arrived {format(parseISO(i.arrived_at), "HH:mm")}</span>}
                  {i.resolved_at && <span>Resolved {format(parseISO(i.resolved_at), "HH:mm")}</span>}
                  {i.eta_minutes != null && !i.arrived_at && <span>ETA {i.eta_minutes}min</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log an emergency incident</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">When did it happen?</Label>
              <Input type="datetime-local" value={whenDate} onChange={(e) => setWhenDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">What happened?</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Brief description, location, outcome..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submitManual} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
