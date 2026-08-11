import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { SosLiveMap } from "../../../components/SosLiveMap";
import { EtaCountdown } from "../../../components/EtaCountdown";
import { HospitalAcceptancePanel } from "../../../components/HospitalAcceptance";
import { Badge } from "@/components/ui/badge";
import { Ambulance, MapPin, AlertTriangle, ChevronRight, Handshake } from "lucide-react";

type Row = {
  id: string; status: string; severity: string | null;
  eta_minutes: number | null; last_eta_update: string | null;
  assigned_provider_id: string | null; created_at: string;
  pre_arrival_notes?: string | null;
  incident_number?: string | null;
  hospital_acceptance_status?: string | null;
  assigned_trauma_bay?: string | null;
  assigned_doctor_name?: string | null;
  trauma_team_prepared?: boolean | null;
  handover_status?: string | null;
};



export default function IncomingAmbulancesScreen() {
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [crews, setCrews] = useState<Record<string,{name:string;phone?:string}>>({});
  const [partners, setPartners] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!providerId) return;
      const { data } = await supabase.from("holarchelp_incidents" as any)
        .select("*").eq("destination_hospital_id", providerId)
        .in("status", ["assigned","en_route","arrived","patient_collected","en_route_to_hospital"])
        .order("eta_minutes", { ascending: true, nullsFirst: false }).limit(20);
      const list = ((data as any) ?? []) as Row[];
      setRows(list);
      const ids = Array.from(new Set(list.map(r => r.assigned_provider_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: amb } = await supabase.from("holarchelp_ambulance_providers" as any)
          .select("id, company_name, contact_phone").in("id", ids);
        const m: Record<string,{name:string;phone?:string}> = {};
        ((amb as any) ?? []).forEach((a: any) => { m[a.id] = { name: a.company_name, phone: a.contact_phone }; });
        setCrews(m);

        const { data: aff } = await supabase
          .from("ambulance_hospital_affiliations" as any)
          .select("ambulance_provider_id")
          .eq("hospital_id", providerId)
          .eq("status", "active")
          .in("ambulance_provider_id", ids);
        setPartners(new Set(((aff as any) || []).map((a: any) => a.ambulance_provider_id)));
      }
    };
    load();
    if (!providerId) return;
    const ch = supabase.channel(`hosp-incoming-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents", filter: `destination_hospital_id=eq.${providerId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [providerId, tick]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-foreground">Incoming Ambulances</h1>


      {!rows.length && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <AlertTriangle className="mx-auto mb-2 h-5 w-5 opacity-50" />
          No ambulances currently en route to your facility.
        </div>

      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => {
          const crew = crews[r.assigned_provider_id ?? ""];
          return (
            <div key={r.id} className="overflow-hidden rounded-xl border border-primary bg-card shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold">
                    <Ambulance className="h-4 w-4 text-destructive" />
                    {crew?.name ?? "ER Provider"}
                    {r.assigned_provider_id && partners.has(r.assigned_provider_id) && (
                      <Badge className="ml-1 gap-1 bg-primary text-primary-foreground text-xs">
                        <Handshake className="h-2.5 w-2.5" /> Partner
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{r.incident_number ?? `Incident ${r.id.slice(0,8)}`} · {r.status.replace(/_/g," ")}</p>
                </div>
                <div className="text-right">
                  {r.eta_minutes != null
                    ? <><p className="text-xl font-extrabold tabular-nums"><EtaCountdown etaMinutes={r.eta_minutes} lastUpdate={r.last_eta_update} /></p>
                        <p className="text-xs uppercase text-muted-foreground">ETA</p></>
                    : <p className="text-xs uppercase text-muted-foreground">No ETA</p>}
                </div>
              </div>
              <SosLiveMap incidentId={r.id} mode="hospital" height={200} />
              {r.pre_arrival_notes && (
                <div className="border-t bg-warning/10 px-3 py-2 text-xs dark:bg-warning/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-warning">Pre-arrival notes</p>
                  <p className="mt-0.5 line-clamp-3">{r.pre_arrival_notes}</p>
                </div>
              )}
              <HospitalAcceptancePanel incident={r} onChanged={() => setTick((n) => n + 1)} />
              <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs">

                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> Live tracking
                </span>
                <div className="flex items-center gap-2">
                  {crew?.phone && <a href={`tel:${crew.phone}`} className="rounded-lg border bg-background px-2 py-1 hover:bg-muted">Call crew</a>}
                  <Link to={`/provider/hospital/incident/${r.id}`} className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 font-semibold text-primary-foreground">
                    Open console <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
