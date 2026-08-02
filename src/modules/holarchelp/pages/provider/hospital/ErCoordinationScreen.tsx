import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { EtaCountdown } from "../../../components/EtaCountdown";
import { HospitalAcceptancePanel, acceptanceTone } from "../../../components/HospitalAcceptance";
import { Badge } from "@/components/ui/badge";
import { Ambulance, ChevronRight, Radio } from "lucide-react";

type Row = {
  id: string;
  incident_number: string | null;
  status: string;
  severity: string | null;
  eta_minutes: number | null;
  last_eta_update: string | null;
  assigned_provider_id: string | null;
  pre_arrival_notes: string | null;
  hospital_acceptance_status: string | null;
  assigned_trauma_bay: string | null;
  assigned_doctor_name: string | null;
  trauma_team_prepared: boolean | null;
  handover_status: string | null;
  user_id: string | null;
};

const ACTIVE = ["assigned", "en_route", "arrived", "patient_collected", "en_route_to_hospital"];

/**
 * ER Coordination — arrivals board for emergency patients.
 * One row per shared Emergency Incident heading to this hospital.
 */
export default function ErCoordinationScreen() {
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [crews, setCrews] = useState<Record<string, string>>({});
  const [patients, setPatients] = useState<Record<string, string>>({});

  const load = async () => {
    if (!providerId) return;
    const { data } = await supabase
      .from("holarchelp_incidents" as any)
      .select("*")
      .eq("destination_hospital_id", providerId)
      .in("status", ACTIVE)
      .order("eta_minutes", { ascending: true, nullsFirst: false })
      .limit(50);
    const list = ((data as any) ?? []) as Row[];
    setRows(list);

    const ambIds = Array.from(new Set(list.map((r) => r.assigned_provider_id).filter(Boolean))) as string[];
    const userIds = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean))) as string[];
    if (ambIds.length) {
      const { data: amb } = await supabase
        .from("holarchelp_ambulance_providers" as any)
        .select("id, company_name")
        .in("id", ambIds);
      const m: Record<string, string> = {};
      ((amb as any) ?? []).forEach((a: any) => { m[a.id] = a.company_name; });
      setCrews(m);
    }
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles" as any).select("id, full_name").in("id", userIds);
      const m: Record<string, string> = {};
      ((profs as any) ?? []).forEach((p: any) => { m[p.id] = p.full_name; });
      setPatients(m);
    }
  };

  useEffect(() => {
    load();
    if (!providerId) return;
    const ch = supabase
      .channel(`er-coord-${providerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "holarchelp_incidents", filter: `destination_hospital_id=eq.${providerId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const pending = rows.filter((r) => (r.hospital_acceptance_status ?? "pending") === "pending");

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-extrabold">ER Coordination</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} incoming · {pending.length} awaiting acceptance
          </p>
        </div>
        <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/10 text-primary">
          <Radio className="h-3 w-3" /> Live
        </Badge>
      </header>

      {!rows.length && (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No incoming emergency patients right now.
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex items-start justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-extrabold">
                  <Ambulance className="h-4 w-4 text-destructive" />
                  {r.incident_number ?? `Incident ${r.id.slice(0, 8)}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {crews[r.assigned_provider_id ?? ""] ?? "ER Provider"} ·{" "}
                  {patients[r.user_id ?? ""] ?? "Patient"} · {r.status.replace(/_/g, " ")}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {r.severity && <Badge variant="outline">{r.severity}</Badge>}
                  <Badge variant="outline" className={acceptanceTone(r.hospital_acceptance_status)}>
                    {(r.hospital_acceptance_status ?? "pending").replace(/_/g, " ")}
                  </Badge>
                  {r.assigned_trauma_bay && <Badge variant="outline">{r.assigned_trauma_bay}</Badge>}
                </div>
              </div>
              <div className="text-right">
                {r.eta_minutes != null ? (
                  <>
                    <p className="text-xl font-extrabold tabular-nums">
                      <EtaCountdown etaMinutes={r.eta_minutes} lastUpdate={r.last_eta_update} />
                    </p>
                    <p className="text-xs uppercase text-muted-foreground">ETA</p>
                  </>
                ) : (
                  <p className="text-xs uppercase text-muted-foreground">No ETA</p>
                )}
              </div>
            </div>

            {r.pre_arrival_notes && (
              <div className="border-t bg-warning/10 px-3 py-2 text-xs">
                <p className="font-bold uppercase tracking-wider text-warning">Crew notes</p>
                <p className="mt-0.5 line-clamp-3">{r.pre_arrival_notes}</p>
              </div>
            )}

            <HospitalAcceptancePanel incident={r} onChanged={load} />

            <div className="flex justify-end border-t px-3 py-2">
              <Link
                to={`/provider/hospital/incident/${r.id}`}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"
              >
                Open incident <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
