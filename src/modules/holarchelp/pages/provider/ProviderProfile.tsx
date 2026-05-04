import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../components/ProviderGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function ProviderProfile() {
  const { providerType, providerId, loading } = useProviderAccess();
  const table = providerType === "hospital" ? "holarchelp_hospitals" : "holarchelp_ambulance_providers";
  const [row, setRow] = useState<any | null>(null);

  useEffect(() => {
    if (!providerId) return;
    supabase.from(table as any).select("*").eq("id", providerId).maybeSingle()
      .then(({ data }) => setRow(data));
  }, [providerId, table]);

  const save = async () => {
    if (!row || !providerId) return;
    const patch = providerType === "hospital"
      ? {
          name: row.name, contact_email: row.contact_email, contact_phone: row.contact_phone,
          address: row.address, city: row.city, state: row.state,
          bed_capacity: Number(row.bed_capacity) || 0, beds_available: Number(row.beds_available) || 0,
          icu_capacity: Number(row.icu_capacity) || 0, icu_available: Number(row.icu_available) || 0,
          at_capacity: !!row.at_capacity,
        }
      : {
          company_name: row.company_name, contact_email: row.contact_email, contact_phone: row.contact_phone,
          base_address: row.base_address, city: row.city, state: row.state,
          fleet_size: Number(row.fleet_size) || 1, at_capacity: !!row.at_capacity,
        };
    const { error } = await supabase.from(table as any).update(patch as any).eq("id", providerId);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  if (loading || !row) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Provider profile</h1>
        <p className="text-sm text-muted-foreground">
          Status: <span className="font-semibold">{row.status}</span> · Tier: <span className="font-semibold">{row.tier}</span>
          {" · "}Subscription: <span className="font-semibold">{row.subscription_status}</span>
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4">
        {providerType === "hospital" ? (
          <>
            <Field label="Hospital name" value={row.name} onChange={(v) => setRow({ ...row, name: v })} />
            <Field label="Contact email" type="email" value={row.contact_email} onChange={(v) => setRow({ ...row, contact_email: v })} />
            <Field label="Contact phone" value={row.contact_phone ?? ""} onChange={(v) => setRow({ ...row, contact_phone: v })} />
            <Field label="Address" value={row.address ?? ""} onChange={(v) => setRow({ ...row, address: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={row.city ?? ""} onChange={(v) => setRow({ ...row, city: v })} />
              <Field label="State" value={row.state ?? ""} onChange={(v) => setRow({ ...row, state: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bed capacity" type="number" value={String(row.bed_capacity ?? 0)} onChange={(v) => setRow({ ...row, bed_capacity: v })} />
              <Field label="Beds available" type="number" value={String(row.beds_available ?? 0)} onChange={(v) => setRow({ ...row, beds_available: v })} />
              <Field label="ICU capacity" type="number" value={String(row.icu_capacity ?? 0)} onChange={(v) => setRow({ ...row, icu_capacity: v })} />
              <Field label="ICU available" type="number" value={String(row.icu_available ?? 0)} onChange={(v) => setRow({ ...row, icu_available: v })} />
            </div>
          </>
        ) : (
          <>
            <Field label="Company name" value={row.company_name} onChange={(v) => setRow({ ...row, company_name: v })} />
            <Field label="Contact email" type="email" value={row.contact_email} onChange={(v) => setRow({ ...row, contact_email: v })} />
            <Field label="Contact phone" value={row.contact_phone ?? ""} onChange={(v) => setRow({ ...row, contact_phone: v })} />
            <Field label="Base address" value={row.base_address ?? ""} onChange={(v) => setRow({ ...row, base_address: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={row.city ?? ""} onChange={(v) => setRow({ ...row, city: v })} />
              <Field label="State" value={row.state ?? ""} onChange={(v) => setRow({ ...row, state: v })} />
            </div>
            <Field label="Fleet size" type="number" value={String(row.fleet_size ?? 1)} onChange={(v) => setRow({ ...row, fleet_size: v })} />
          </>
        )}

        <div className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <p className="text-sm font-semibold">At capacity</p>
            <p className="text-xs text-muted-foreground">Pause incoming dispatches</p>
          </div>
          <Switch checked={!!row.at_capacity} onCheckedChange={(v) => setRow({ ...row, at_capacity: v })} />
        </div>

        <Button onClick={save} className="h-12 rounded-xl">Save changes</Button>
      </div>
    </div>
  );
}

const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <div className="grid gap-1.5">
    <Label className="text-xs">{label}</Label>
    <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl" />
  </div>
);
