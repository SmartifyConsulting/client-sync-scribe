import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wallet as Pill, Sparkles, Bell, BellOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ApprovedMed {
  id: string;
  name: string;
  category: string; // 'vitamin' | 'supplement' | 'otc'
  default_with_food: string | null;
}

interface SelfMed {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  reminder_times: string[] | null;
  with_food: string | null;
  status: string;
  approved_medication_id: string | null;
  reminders_enabled?: boolean;
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "weekdays", label: "Weekdays only" },
  { value: "weekly", label: "Weekly" },
  { value: "as_needed", label: "As needed" },
];

interface Props {
  patientId: string;
  patientUserId?: string;
}

export function DailyMedsInline({ patientId, patientUserId }: Props) {
  const { toast } = useToast();
  const [approved, setApproved] = useState<ApprovedMed[]>([]);
  const [meds, setMeds] = useState<SelfMed[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickedId, setPickedId] = useState("");
  const [time, setTime] = useState("08:00");
  const [frequency, setFrequency] = useState("daily");
  const [withFood, setWithFood] = useState<"with_food" | "without_food" | "either">("either");
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<"vitamin" | "supplement" | "otc">("vitamin");
  const [remindMe, setRemindMe] = useState(true);
  const [isChronic, setIsChronic] = useState(false);
  const [missedAfter, setMissedAfter] = useState(30); // minutes
  const [alertContactsTaken, setAlertContactsTaken] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: appr }, { data: rxs }] = await Promise.all([
      supabase.from("approved_daily_medications").select("id, name, category, default_with_food").eq("active", true).order("name"),
      supabase
        .from("prescriptions")
        .select("id, medication, dosage, frequency, reminder_times, with_food, status, approved_medication_id, reminders_enabled")
        .eq("patient_id", patientId)
        .eq("source", "self")
        .order("created_at", { ascending: false }),
    ]);
    setApproved((appr ?? []) as any);
    setMeds((rxs ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [patientId]);

  const add = async () => {
    let approvedId: string | null = pickedId || null;
    let medName = "";
    if (showCustom) {
      if (!customName.trim() || !patientUserId) return;
      medName = `${customName.trim()} (${customCategory})`;
      approvedId = null;
    } else {
      const med = approved.find((a) => a.id === pickedId);
      if (!med || !patientUserId) return;
      medName = med.name;
    }
    const { error } = await supabase.from("prescriptions").insert({
      patient_id: patientId,
      doctor_id: patientUserId,
      medication: medName,
      dosage: "1",
      frequency,
      reminder_times: [time],
      with_food: withFood,
      status: "active",
      source: "self",
      approved_medication_id: approvedId,
      reminders_enabled: remindMe,
      is_chronic: isChronic,
      missed_alert_after_minutes: missedAfter,
      alert_contacts_on_taken: alertContactsTaken,
    } as any);
    if (error) {
      toast({ title: "Couldn't add", description: error.message, variant: "destructive" });
      return;
    }
    if (isChronic) {
      await supabase.from("patients").update({ is_chronic: true } as any).eq("id", patientId);
    }
    setPickedId(""); setShowCustom(false); setCustomName("");
    toast({ title: "Added — you'll be reminded" });
    load();

  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("prescriptions").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setMeds((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleReminder = async (id: string, enabled: boolean) => {
    setMeds((prev) => prev.map((m) => (m.id === id ? { ...m, reminders_enabled: enabled } : m)));
    const { error } = await supabase.from("prescriptions").update({ reminders_enabled: enabled } as any).eq("id", id);
    if (error) toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
  };

  return (
    <div className="rounded-xl border border-border/50 p-2.5 space-y-2">
      <div className="rounded-md border border-dashed border-border p-2 space-y-2">
        {!showCustom ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-2">
              <Label className="text-xs">Pick item</Label>
              <Select value={pickedId} onValueChange={(v) => {
                setPickedId(v);
                const med = approved.find((a) => a.id === v);
                if (med?.default_with_food) setWithFood(med.default_with_food as any);
              }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Choose vitamin / supplement / OTC" /></SelectTrigger>
                <SelectContent>
                  {approved.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} <span className="text-xs text-muted-foreground ml-1">({a.category})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reminder time</Label>
              <Input className="h-9" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Item name</Label>
              <Input className="h-9" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Magnesium 400mg" />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={customCategory} onValueChange={(v) => setCustomCategory(v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vitamin">Vitamin</SelectItem>
                  <SelectItem value="supplement">Supplement</SelectItem>
                  <SelectItem value="otc">Over-the-counter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reminder time</Label>
              <Input className="h-9" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Label className="text-xs">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-xs">Food</Label>
            <Select value={withFood} onValueChange={(v) => setWithFood(v as any)}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="with_food">With food</SelectItem>
                <SelectItem value="without_food">Empty stomach</SelectItem>
                <SelectItem value="either">Either way</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-1 text-sm text-muted-foreground">
            <Switch checked={remindMe} onCheckedChange={setRemindMe} className="scale-75" />
            Remind me
          </label>
          <label className="flex items-center gap-1 text-sm text-muted-foreground">
            <Switch checked={isChronic} onCheckedChange={setIsChronic} className="scale-75" />
            Chronic
          </label>
          <div className="flex items-center gap-1">
            <Label className="text-xs">Alert if missed after</Label>
            <Input
              type="number"
              min={5}
              max={1440}
              step={5}
              value={missedAfter}
              onChange={(e) => setMissedAfter(Math.max(5, parseInt(e.target.value || "30", 10)))}
              className="h-8 w-20 text-xs"
            />
            <span className="text-xs text-muted-foreground">min</span>
          </div>
          <label className="flex items-center gap-1 text-sm text-muted-foreground">
            <Switch checked={alertContactsTaken} onCheckedChange={setAlertContactsTaken} className="scale-75" />
            Alert contacts when taken
          </label>
          <Button variant="ghost" size="sm" className="h-7 text-sm" onClick={() => setShowCustom((s) => !s)}>
            {showCustom ? "Pick from list" : "+ Add custom"}
          </Button>
          <Button size="sm" onClick={add} disabled={(!showCustom && !pickedId) || (showCustom && !customName.trim())} className="ml-auto h-7">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && meds.length === 0 && (
        <p className="text-xs text-muted-foreground">No daily vitamins or supplements added yet.</p>
      )}
      {meds.map((m) => (
        <div key={m.id} className="flex items-center justify-between rounded-md border border-border p-2 bg-muted/30">
          <div className="min-w-0">
            <p className="text-xs font-medium truncate flex items-center gap-1.5">
              <Pill className="h-4 w-4 text-primary" /> {m.medication}
            </p>
            <p className="text-xs text-muted-foreground">
              {m.frequency || "daily"} · {m.reminder_times?.join(", ") || "no time"} · {m.with_food === "with_food" ? "with food" : m.with_food === "without_food" ? "empty" : "either"}
            </p>
            <Badge variant="outline" className="mt-0.5 text-xs px-1 py-0">Self-added</Badge>
          </div>
          <div className="flex items-center gap-1">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              {(m.reminders_enabled ?? true) ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4" />}
              <Switch checked={m.reminders_enabled ?? true} onCheckedChange={(v) => toggleReminder(m.id, v)} />
            </label>
            <Button variant="ghost" size="icon" onClick={() => remove(m.id)} className="text-destructive h-7 w-7">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
