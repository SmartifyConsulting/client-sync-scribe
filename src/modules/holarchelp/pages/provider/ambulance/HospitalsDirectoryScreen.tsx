import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Hospital, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

type H = {
  id: string; name: string; ownership: string | null; city?: string | null;
  accepting_patients: boolean | null; er_capacity_status: "green"|"yellow"|"red"|null;
  er_beds_available: number | null; icu_beds_available: number | null;
  latitude: number | null; longitude: number | null;
  contact_phone?: string | null;
};

const capColor = (s: string | null) =>
  s === "red" ? "border-destructive/40 bg-destructive/10 text-destructive"
  : s === "yellow" ? "border-warning/40 bg-warning/10 text-warning"
  : "border-success/40 bg-success/10 text-success";

const distKm = (a: { lat: number; lng: number } | null, b: { lat: number; lng: number } | null) => {
  if (!a || !b) return undefined;
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

export default function HospitalsDirectoryScreen() {
  const { t } = useTranslation();
  const [list, setList] = useState<H[]>([]);
  const [q, setQ] = useState("");
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    supabase.from("holarchelp_hospitals" as any)
      .select("id,name,ownership,city,accepting_patients,er_capacity_status,er_beds_available,icu_beds_available,latitude,longitude,contact_phone")
      .eq("status", "approved")
      .then(({ data }) => setList(((data as any) ?? []) as H[]));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}, { enableHighAccuracy: true }
      );
    }
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return list
      .map((h) => ({ ...h, _d: h.latitude && h.longitude ? distKm(me, { lat: h.latitude, lng: h.longitude }) : undefined }))
      .filter((h) => !term || h.name.toLowerCase().includes(term) || (h.city ?? "").toLowerCase().includes(term))
      .sort((a, b) => (a._d ?? 9999) - (b._d ?? 9999));
  }, [list, q, me]);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("provider.emergencyResponseDispatch")}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("hospitalsDirectory.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("hospitalsDirectory.subtitle")}</p>
      </header>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("hospitalsDirectory.searchPlaceholder")} className="rounded-xl pl-8" />
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((h) => {
          const open = !!h.accepting_patients && h.er_capacity_status !== "red";
          return (
            <div key={h.id} className="rounded-2xl border bg-card p-3">
              <div className="flex items-start gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${open ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <Hospital className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{h.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {h.city ?? ""}{h.ownership ? ` Â· ${h.ownership}` : ""}{h._d != null ? ` Â· ${h._d.toFixed(1)} km` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-sm">
                <span className={`rounded-full border px-1.5 py-0.5 font-bold uppercase ${capColor(h.er_capacity_status)}`}>
                  {(h.er_capacity_status ?? "green").toUpperCase()}
                </span>
                {h.er_beds_available != null && <span className="rounded-full border bg-background px-1.5 py-0.5">{h.er_beds_available} {t("hospitalsDirectory.erBeds")}</span>}
                {h.icu_beds_available != null && <span className="rounded-full border bg-background px-1.5 py-0.5">{h.icu_beds_available} {t("hospitalsDirectory.icu")}</span>}
                {!h.accepting_patients && <span className="rounded-full border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-destructive">{t("hospitalsDirectory.notAccepting")}</span>}
              </div>
              {h.contact_phone && (
                <a href={`tel:${h.contact_phone}`} className="mt-2 inline-block text-sm font-medium text-primary-dark hover:underline">
                  {h.contact_phone}
                </a>
              )}
            </div>
          );
        })}
        {!filtered.length && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">{t("hospitalsDirectory.noMatches")}</div>}
      </div>
    </div>
  );
}

