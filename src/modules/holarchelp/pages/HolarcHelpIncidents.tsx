import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { IncidentNumberBadge } from "@/components/IncidentNumberBadge";

export default function HolarcHelpIncidents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("holarchelp_incidents" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const list = (data as any[]) ?? [];
      const providerIds = Array.from(new Set(list.map((i) => i.assigned_provider_id).filter(Boolean)));
      const incidentIds = list.map((i) => i.id);
      const names: Record<string, string> = {};
      const autoSet = new Set<string>();
      if (providerIds.length) {
        const [{ data: hs }, { data: as_ }] = await Promise.all([
          supabase.from("holarchelp_hospitals_public" as any).select("id, name").in("id", providerIds),
          supabase.from("holarchelp_ambulance_providers_public" as any).select("id, company_name").in("id", providerIds),
        ]);
        for (const h of (hs as any[]) ?? []) names[h.id] = h.name;
        for (const a of (as_ as any[]) ?? []) names[a.id] = a.company_name;
      }
      if (incidentIds.length) {
        const { data: ev } = await supabase
          .from("holarchelp_incident_events" as any)
          .select("incident_id, event_type")
          .in("incident_id", incidentIds)
          .eq("event_type", "auto_assigned");
        for (const e of (ev as any[]) ?? []) autoSet.add(e.incident_id);
      }
      setItems(list.map((i) => ({
        ...i,
        provider_name: i.assigned_provider_id ? (names[i.assigned_provider_id] ?? "Assigned provider") : null,
        auto: autoSet.has(i.id),
      })));
    })();
  }, [user]);

  return (
    <div className="mx-auto max-w-md px-4 pb-8">
      <div className="mb-4 flex items-center gap-2 pt-2">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/patient/holarchelp")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
      <h1 className="text-2xl font-extrabold">Incident history</h1>
      <ul className="mt-4 space-y-2">
        {items.length === 0 && <li className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">No incidents yet</li>}
        {items.map((i) => (
          <li key={i.id}>
            <Link to={`/patient/holarchelp/incident/${i.id}`} className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{new Date(i.created_at).toLocaleString()}</p>
                {i.incident_number && (
                  <p className="mt-0.5 font-mono text-[11px] font-bold text-primary">{i.incident_number}</p>
                )}
                {i.provider_name && (
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate">
                    {i.provider_name}
                    {i.auto && <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">AUTO</span>}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{i.resolved_at ? `Resolved ${new Date(i.resolved_at).toLocaleString()}` : "In progress"}</p>
              </div>
              <span className={`ml-2 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${["completed","cancelled"].includes(i.status) ? "bg-secondary text-primary" : "bg-sos/10 text-sos"}`}>
                {(i.status ?? "").toUpperCase().replace(/_/g, " ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
