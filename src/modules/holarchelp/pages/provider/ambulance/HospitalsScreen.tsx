import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Input } from "@/components/ui/input";
import { Loader2, Building2, Search } from "lucide-react";
import { HospitalCard, StatusBadge, capacityTone, emsDistKm, emsEtaMinutes } from "../../../components/ems";

type Hospital = {
  id: string;
  name: string;
  ownership: string | null;
  latitude: number | null;
  longitude: number | null;
  trauma_level: string | null;
  er_capacity_status: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  accepting_patients: boolean | null;
  status: string | null;
};

export default function HospitalsScreen() {
  const { providerId } = useProviderAccess();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [preferred, setPreferred] = useState<Set<string>>(new Set());
  const [base, setBase] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: hosp }, { data: aff }, { data: prov }] = await Promise.all([
        supabase.from("holarchelp_hospitals" as any)
          .select("id, name, ownership, latitude, longitude, trauma_level, er_capacity_status, phone, email, address, city, accepting_patients, status")
          .eq("status", "approved")
          .order("name"),
        providerId
          ? supabase.from("ambulance_hospital_affiliations" as any)
              .select("hospital_id, is_preferred").eq("provider_id", providerId)
          : Promise.resolve({ data: [] as any[] }),
        providerId
          ? supabase.from("holarchelp_ambulance_providers" as any)
              .select("latitude, longitude").eq("id", providerId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setHospitals((((hosp as any) ?? []) as Hospital[]));
      setPreferred(new Set(((aff as any[]) ?? []).filter((a) => a.is_preferred).map((a) => a.hospital_id)));
      const p: any = prov;
      if (p?.latitude != null && p?.longitude != null) setBase({ lat: p.latitude, lng: p.longitude });
      setLoading(false);
    };
    load();
  }, [providerId]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hospitals
      .map((h) => {
        const km = base && h.latitude != null && h.longitude != null
          ? emsDistKm(base, { lat: h.latitude, lng: h.longitude })
          : null;
        return { h, km, eta: emsEtaMinutes(km), preferred: preferred.has(h.id) };
      })
      .filter((r) => (q ? r.h.name.toLowerCase().includes(q) || (r.h.city ?? "").toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
        return (a.km ?? 9e9) - (b.km ?? 9e9);
      });
  }, [hospitals, base, preferred, search]);

  const selected = rows.find((r) => r.h.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold">
            <Building2 className="h-5 w-5 text-primary" /> Hospitals
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">Which hospital is most suitable?</p>
        </div>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search hospital or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1fr_2.2fr]">
          <section className="rounded-xl border bg-card p-2">
            <h2 className="px-1 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Network · {rows.length}
            </h2>
            {rows.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No approved hospitals found.</p>
            ) : (
              <div className="max-h-[70vh] space-y-1.5 overflow-y-auto">
                {rows.map((r) => (
                  <HospitalCard
                    key={r.h.id}
                    hospital={{
                      id: r.h.id,
                      name: r.h.name,
                      ownership: r.h.ownership,
                      distance_km: r.km,
                      eta_min: r.eta,
                      trauma_level: r.h.trauma_level,
                      er_capacity_status: r.h.er_capacity_status,
                      preferred: r.preferred,
                    }}
                    selected={selectedId === r.h.id}
                    onClick={() => setSelectedId(r.h.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-card p-3">
            {!selected ? (
              <p className="py-16 text-center text-xs text-muted-foreground">Select a hospital to view capability and capacity.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-extrabold">{selected.h.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {[selected.h.address, selected.h.city].filter(Boolean).join(", ") || "No address on file"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.preferred && <StatusBadge tone="primary">Preferred destination</StatusBadge>}
                    {selected.h.er_capacity_status && (
                      <StatusBadge tone={capacityTone(selected.h.er_capacity_status)}>
                        {selected.h.er_capacity_status}
                      </StatusBadge>
                    )}
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 md:grid-cols-3">
                  <Field label="Ownership" value={selected.h.ownership ?? "—"} />
                  <Field label="Trauma level" value={selected.h.trauma_level ?? "Not graded"} />
                  <Field label="Capability" value={selected.h.trauma_level ? `Trauma ${selected.h.trauma_level} centre` : "General emergency"} />
                  <Field label="Current capacity" value={selected.h.er_capacity_status ?? "Unknown"} />
                  <Field label="Accepting patients" value={selected.h.accepting_patients ? "Yes" : "No"} />
                  <Field label="Distance" value={selected.km != null ? `${selected.km.toFixed(1)} km` : "—"} />
                  <Field label="Estimated travel" value={selected.eta != null ? `${selected.eta} min` : "—"} />
                  <Field label="Average offload" value="~22 min" />
                  <Field
                    label="GPS"
                    value={
                      selected.h.latitude != null && selected.h.longitude != null
                        ? `${selected.h.latitude.toFixed(4)}, ${selected.h.longitude.toFixed(4)}`
                        : "No coordinates"
                    }
                  />
                  <Field label="Phone" value={selected.h.phone ?? "—"} />
                  <Field label="Email" value={selected.h.email ?? "—"} />
                </dl>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-xs">{value}</dd>
    </div>
  );
}
