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
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/userMessage";

export default function ErCapacityScreen() {
  const { t } = useTranslation();
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
    if (error) return toastError(error, "We couldn't complete that. Please try again.");
    setH((prev: any) => ({ ...(prev ?? {}), ...p }));
    toast.success(t("common.capacityUpdated"));
  };

  if (!h) return <div className="text-sm text-muted-foreground">{t("capacity.loading")}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-foreground">{t("capacity.title")}</h1>

      <div className="grid gap-3 md:grid-cols-3">
        <Tile icon={Activity} label={t("capacity.status")}>
          <Select value={h.er_capacity_status ?? "green"} onValueChange={(v) => patch({ er_capacity_status: v })}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="green">{t("capacity.green")}</SelectItem>
              <SelectItem value="yellow">{t("capacity.yellow")}</SelectItem>
              <SelectItem value="red">{t("capacity.red")}</SelectItem>
            </SelectContent>
          </Select>
        </Tile>

        <Tile icon={BedDouble} label={t("capacity.erBeds")}>
          <NumberField value={h.er_beds_available} onSave={(v) => patch({ er_beds_available: v })} saving={saving} />
        </Tile>

        <Tile icon={BedDouble} label={t("capacity.icuBeds")}>
          <NumberField value={h.icu_available} onSave={(v) => patch({ icu_available: v })} saving={saving} />
        </Tile>

        <Tile icon={BedDouble} label={t("capacity.traumaBays")}>
          <NumberField value={h.trauma_bays_available} onSave={(v) => patch({ trauma_bays_available: v })} saving={saving} />
        </Tile>

        <Tile icon={Activity} label={t("capacity.erLoad")}>
          <NumberField value={h.er_load_percent} onSave={(v) => patch({ er_load_percent: v })} saving={saving} max={100} />
        </Tile>

        <Tile icon={Activity} label={t("capacity.diversion")}>
          <div className="flex items-center gap-3 rounded-xl border bg-background p-3">
            <Switch checked={!!h.accepting_patients} onCheckedChange={(v) => patch({ accepting_patients: v })} />
            <span className="text-sm">{h.accepting_patients ? t("capacity.accepting") : t("capacity.onDiversion")}</span>
          </div>
        </Tile>
      </div>
    </div>
  );
}

const Tile = ({ icon: Icon, label, children }: any) => (
  <div className="overflow-hidden rounded-xl border-2 border-primary bg-card">
    <p className="flex items-center gap-1.5 bg-primary px-3 py-2 text-sm font-bold uppercase tracking-wider text-white">
      <Icon className="h-3.5 w-3.5 text-white" /> {label}
    </p>
    <div className="p-3">{children}</div>
  </div>
);

function NumberField({ value, onSave, saving, max }: { value: number | null; onSave: (v: number | null) => void; saving: boolean; max?: number }) {
  const { t } = useTranslation();
  const [v, setV] = useState<string>(value == null ? "" : String(value));
  useEffect(() => { setV(value == null ? "" : String(value)); }, [value]);
  return (
    <div className="flex gap-2">
      <Input type="number" value={v} onChange={(e) => setV(e.target.value)} max={max} className="rounded-xl" />
      <Button size="sm" disabled={saving} onClick={() => onSave(v === "" ? null : Number(v))}>{t("common.save")}</Button>
    </div>
  );
}
