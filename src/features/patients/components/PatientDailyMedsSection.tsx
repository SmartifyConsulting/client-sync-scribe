import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pill } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ApprovedMed {
  id: string;
  name: string;
  category: string;
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
}

export function PatientDailyMedsSection({ patientId, patientUserId }: { patientId: string; patientUserId: string }) {
  const { toast } = useToast();
  const [approved, setApproved] = useState<ApprovedMed[]>([]);
  const [meds, setMeds] = useState<SelfMed[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickedId, setPickedId] = useState("");
  const [time, setTime] = useState("08:00");
  const [withFood, setWithFood] = useState<"with_food" | "without_food" | "either">("either");

  const load = async () => {
    setLoading(true);
    const [{ data: appr }, { data: rxs }] = await Promise.all([
      supabase.from("approved_daily_medications").select("id, name, category, default_with_food").eq("active", true).order("name"),
      supabase
        .from("prescriptions")
        .select("id, medication, dosage, frequency, reminder_times, with_food, status, approved_medication_id")
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
    const med = approved.find((a) => a.id === pickedId);
    if (!med) return;
    const { error } = await supabase.from("prescriptions").insert({
      patient_id: patientId,
      doctor_id: patientUserId,
      medication: med.name,
      dosage: "1",
      frequency: "once daily",
      reminder_times: [time],
      with_food: withFood,
      status: "active",
      source: "self",
      approved_medication_id: med.id,
    } as any);
    if (error) {
      toast({ title: "Couldn't add", description: error.message, variant: "destructive" });
      return;
    }
    setPickedId("");
    toast({ title: "Added — you'll be reminded daily" });
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

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Pill className="h-5 w-5 text-primary" />
          My daily medications
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Add daily vitamins, supplements or approved over-the-counter meds. You'll earn Vulas for each day you take them.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-2">
              <Label className="text-[11px]">Pick a medication</Label>
              <Select value={pickedId} onValueChange={(v) => {
                setPickedId(v);
                const med = approved.find((a) => a.id === v);
                if (med?.default_with_food) setWithFood(med.default_with_food as any);
              }}>
                <SelectTrigger><SelectValue placeholder="Choose from approved list" /></SelectTrigger>
                <SelectContent>
                  {approved.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} <span className="text-xs text-muted-foreground ml-1">({a.category})</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">Reminder time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[11px]">Food:</Label>
            <Select value={withFood} onValueChange={(v) => setWithFood(v as any)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="with_food">With food</SelectItem>
                <SelectItem value="without_food">On empty stomach</SelectItem>
                <SelectItem value="either">Either way</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={add} disabled={!pickedId} className="ml-auto">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && meds.length === 0 && (
          <p className="text-sm text-muted-foreground">No daily medications added yet.</p>
        )}
        {meds.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
            <div>
              <p className="font-medium text-sm">{m.medication}</p>
              <p className="text-xs text-muted-foreground">
                {m.reminder_times?.join(", ") || "no time set"} · {m.with_food === "with_food" ? "with food" : m.with_food === "without_food" ? "empty stomach" : "either"}
              </p>
              <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0">Self-added</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => remove(m.id)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
