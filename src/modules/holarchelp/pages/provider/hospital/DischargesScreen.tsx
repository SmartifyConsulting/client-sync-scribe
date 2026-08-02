import { useMemo, useState } from "react";
import { useProviderAccess } from "../../../components/ProviderGate";
import { useHospitalWards } from "../../../hooks/useHospitalWards";
import { useHospitalInpatients } from "../../../hooks/useHospitalInpatients";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/** Discharges — completed inpatient admissions for this hospital. */
export default function DischargesScreen() {
  const { providerId } = useProviderAccess();
  const { wards } = useHospitalWards(providerId);
  const { inpatients } = useHospitalInpatients(providerId, true);
  const [search, setSearch] = useState("");

  const wardName = (id: string | null) => wards.find((w) => w.id === id)?.name ?? "Unassigned";

  const discharged = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inpatients
      .filter((p) => p.status === "discharged" || !!p.discharged_at)
      .filter((p) => !q || p.patient_name.toLowerCase().includes(q) || wardName(p.ward_id).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inpatients, search, wards]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold">Discharges</h2>
          <p className="text-xs text-muted-foreground">{discharged.length} discharged patients</p>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient or ward"
          className="h-9 w-52"
        />
      </header>

      {!discharged.length ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No discharges recorded yet.
        </div>
      ) : (
        <div className="divide-y rounded-2xl border bg-card">
          {discharged.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-bold">{p.patient_name}</p>
                <p className="text-xs text-muted-foreground">
                  {wardName(p.ward_id)}
                  {p.bed_number ? ` · Bed ${p.bed_number}` : ""} · Admitted{" "}
                  {new Date(p.admitted_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline">
                {p.discharged_at ? `Discharged ${new Date(p.discharged_at).toLocaleDateString()}` : "Discharged"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
