import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Hospital, Check } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/userMessage";

type H = {
  id: string;
  name: string;
  ownership: string | null;
  accepting_patients: boolean | null;
  er_capacity_status: "green" | "yellow" | "red" | null;
  er_beds_available: number | null;
  latitude: number | null;
  longitude: number | null;
  distance_km?: number;
};

const capColor = (s: string | null) =>
  s === "red" ? "bg-red-500/15 text-red-700 border-red-500/40"
  : s === "yellow" ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/40"
  : "bg-green-500/15 text-green-700 border-green-500/40";

const dist = (a?: { lat: number; lng: number } | null, b?: { lat: number; lng: number } | null) => {
  if (!a || !b) return undefined;
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

export function HospitalPicker({
  incidentId, selectedId, originLat, originLng,
}: { incidentId: string; selectedId: string | null; originLat?: number | null; originLng?: number | null }) {
  const { t } = useTranslation();
  const [list, setList] = useState<H[]>([]);
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("holarchelp_hospitals_public" as any)
        .select("id, name, ownership, accepting_patients, er_capacity_status, er_beds_available, latitude, longitude");
      const origin = originLat && originLng ? { lat: originLat, lng: originLng } : null;
      const enriched: H[] = ((data as any) ?? []).map((h: any) => ({
        ...h,
        distance_km: h.latitude && h.longitude ? dist(origin, { lat: h.latitude, lng: h.longitude }) : undefined,
      })).sort((a: H, b: H) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
      setList(enriched);
    })();
  }, [originLat, originLng]);

  const choose = async (h: H) => {
    setPicking(h.id);
    const { error } = await supabase.from("holarchelp_incidents" as any)
      .update({ destination_hospital_id: h.id } as any).eq("id", incidentId);
    if (error) { setPicking(null); return toastError(error, "We couldn't complete that. Please try again."); }
    // Verify the write actually persisted (RLS can silently no-op).
    const { data: check } = await supabase.from("holarchelp_incidents" as any)
      .select("destination_hospital_id").eq("id", incidentId).maybeSingle();
    setPicking(null);
    if ((check as any)?.destination_hospital_id !== h.id) {
      return toast.error(t("hospitalPicker.couldNotSet"));
    }
    toast.success(t("hospitalPicker.notified", { name: h.name }));
  };

  return (
    <div className="rounded-2xl border bg-card p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("hospitalPicker.destination")}</p>
      <ul className="max-h-72 space-y-1.5 overflow-auto">
        {list.map((h) => {
          const isSelected = h.id === selectedId;
          const open = !!h.accepting_patients && h.er_capacity_status !== "red";
          return (
            <li key={h.id}
                className={`flex items-center gap-2 rounded-xl border p-2 ${isSelected ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
              <Hospital className={`h-5 w-5 shrink-0 ${open ? "text-blue-600" : "text-muted-foreground"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">{h.name}</p>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px]">
                  <span className={`rounded-full border px-1.5 py-0.5 font-semibold ${capColor(h.er_capacity_status)}`}>
                    {(h.er_capacity_status ?? "green").toUpperCase()}
                  </span>
                  {h.er_beds_available != null && <span className="text-muted-foreground">{h.er_beds_available} {t("common.beds")}</span>}
                  {h.ownership && <span className="capitalize text-muted-foreground">· {h.ownership}</span>}
                  {h.distance_km != null && <span className="text-muted-foreground">· {h.distance_km.toFixed(1)} km</span>}
                  {!h.accepting_patients && <span className="text-destructive">· {t("hospitalPicker.notAccepting")}</span>}
                </div>
              </div>
              <Button size="sm" variant={isSelected ? "secondary" : "default"} className="h-8 shrink-0"
                      disabled={!!picking || (!open && !isSelected)} onClick={() => choose(h)}>
                {isSelected ? t("common.selected") : picking === h.id ? "…" : t("common.pick")}
              </Button>
            </li>
          );
        })}
        {!list.length && <li className="py-4 text-center text-xs text-muted-foreground">{t("hospitalPicker.none")}</li>}
      </ul>
    </div>
  );
}
