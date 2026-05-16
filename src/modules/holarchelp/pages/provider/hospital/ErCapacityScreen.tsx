import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BedDouble, Activity } from "lucide-react";

export default function ErCapacityScreen() {
  const { providerId } = useProviderAccess();
  const [h, setH] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!providerId) return;
    supabase.from("holarchelp_hospitals" as any).select("*").eq("id", providerId).maybeSingle()
      .then(({ data }) => setH(data));
  }, [providerId]);

  const patch = async (p: any) => {
    if (!providerId) return;
    setSaving(true);
    const { error } = await supabase.from("holarchelp_hospitals" as any).update(p).eq("id", providerId);
    setSaving(false);
    if (error) return toast.error(error.message);
    setH((prev: any) => ({ ...(prev ?? {}), ...p }));
    toast.success("Capacity updated");
  };

  if (!h) return <div className="text-sm text-muted-foreground">Loading capacity…</div>;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Hospital Emergency Operations</p>
        <h1 className="text-2xl font-extrabold">ER Capacity</h1>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Tile icon={Activity} label="Capacity status">
          <Select value={h.er_capacity_status ?? "green"} onValueChange={(v) => patch({ er_capacity_status: v })}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="green">🟢 Green — full capacity</SelectItem>
              <SelectItem value="yellow">🟡 Yellow — busy</SelectItem>
              <SelectItem value="red">🔴 Red — diversion</SelectItem>
            </SelectContent>
          </Select>
        </Tile>

        <Tile icon={BedDouble} label="ER beds available">
          <NumberField value={h.er_beds_available} onSave={(v) => patch({ er_beds_available: v })} saving={saving} />
        </Tile>

        <Tile icon={BedDouble} label="ICU beds available">
          <NumberField value={h.icu_beds_available} onSave={(v) => patch({ icu_beds_available: v })} saving={saving} />
        </Tile>

        <Tile icon={BedDouble} label="Trauma bays available">
          <NumberField value={h.trauma_bays_available} onSave={(v) => patch({ trauma_bays_available: v })} saving={saving} />
        </Tile>

        <Tile icon={Activity} label="ER load (% utilised)">
          <NumberField value={h.er_load_percent} onSave={(v) => patch({ er_load_percent: v })} saving={saving} max={100} />
        </Tile>

        <Tile icon={Activity} label="Diversion state">
          <div className="flex items-center gap-3 rounded-xl border bg-background p-3">
            <Switch checked={!!h.accepting_patients} onCheckedChange={(v) => patch({ accepting_patients: v })} />
            <span className="text-sm">{h.accepting_patients ? "Accepting patients" : "On diversion"}</span>
          </div>
        </Tile>
      </div>
    </div>
  );
}

const Tile = ({ icon: Icon, label, children }: any) => (
  <div className="rounded-2xl border bg-card p-3 space-y-2">
    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {label}
    </p>
    {children}
  </div>
);

function NumberField({ value, onSave, saving, max }: { value: number | null; onSave: (v: number | null) => void; saving: boolean; max?: number }) {
  const [v, setV] = useState<string>(value == null ? "" : String(value));
  useEffect(() => { setV(value == null ? "" : String(value)); }, [value]);
  return (
    <div className="flex gap-2">
      <Input type="number" value={v} onChange={(e) => setV(e.target.value)} max={max} className="rounded-xl" />
      <Button size="sm" disabled={saving} onClick={() => onSave(v === "" ? null : Number(v))}>Save</Button>
    </div>
  );
}
