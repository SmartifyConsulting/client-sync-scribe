import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/userMessage";

const PRIORITIES = [
  { v: "esi-1", label: "ESI 1 â€” Resuscitation" },
  { v: "esi-2", label: "ESI 2 â€” Emergent" },
  { v: "esi-3", label: "ESI 3 â€” Urgent" },
  { v: "esi-4", label: "ESI 4 â€” Less urgent" },
  { v: "esi-5", label: "ESI 5 â€” Non-urgent" },
];

export function TriageControls({
  incidentId, current,
}: {
  incidentId: string;
  current: { triage_priority?: string | null; triage_bay?: string | null; triage_nurse?: string | null };
}) {
  const { t } = useTranslation();
  const [priority, setPriority] = useState(current.triage_priority ?? "");
  const [bay, setBay] = useState(current.triage_bay ?? "");
  const [nurse, setNurse] = useState(current.triage_nurse ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("holarchelp_incidents" as any).update({
      triage_priority: priority || null,
      triage_bay: bay || null,
      triage_nurse: nurse || null,
      triage_assigned_at: new Date().toISOString(),
    } as any).eq("id", incidentId);
    setSaving(false);
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    await supabase.from("holarchelp_incident_events" as any).insert({
      incident_id: incidentId, event_type: "triage_assigned",
      payload: { priority, bay, nurse },
    } as any);
    toast.success(t("triageControls.assigned"));
  };

  return (
    <div className="rounded-2xl border bg-card p-3 space-y-3">
      <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("triageControls.assignment")}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label className="text-sm">{t("triageControls.priority")}</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("triageControls.selectPriority")} /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-sm">{t("triageControls.bay")}</Label>
          <Input value={bay} onChange={(e) => setBay(e.target.value)} placeholder="e.g. Resus-2" className="rounded-xl" />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-sm">{t("triageControls.intakeNurse")}</Label>
          <Input value={nurse} onChange={(e) => setNurse(e.target.value)} placeholder={t("common.name")} className="rounded-xl" />
        </div>
      </div>
      <Button size="sm" onClick={save} disabled={saving || !priority}>{t("triageControls.saveTriage")}</Button>
    </div>
  );
}

