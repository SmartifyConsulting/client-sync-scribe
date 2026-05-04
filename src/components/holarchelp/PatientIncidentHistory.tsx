import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Siren, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  /** auth user_id of the patient whose incidents to show */
  userId: string | null | undefined;
  title?: string;
}

const SEVERITY_CHIP: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function PatientIncidentHistory({ userId, title = "Emergency incidents" }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: incidents } = await supabase
        .from("holarchelp_incidents" as any)
        .select("id, status, severity, created_at, accepted_at, arrived_at, resolved_at, eta_minutes, assigned_provider_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      const list = (incidents as any[]) ?? [];
      // Resolve provider names in one pass
      const providerIds = Array.from(new Set(list.map((i) => i.assigned_provider_id).filter(Boolean)));
      let providerNames: Record<string, string> = {};
      if (providerIds.length) {
        const [{ data: hs }, { data: as_ }] = await Promise.all([
          supabase.from("holarchelp_hospitals" as any).select("id, name").in("id", providerIds),
          supabase.from("holarchelp_ambulance_providers" as any).select("id, company_name").in("id", providerIds),
        ]);
        for (const h of (hs as any[]) ?? []) providerNames[h.id] = h.name;
        for (const a of (as_ as any[]) ?? []) providerNames[a.id] = a.company_name;
      }
      if (cancelled) return;
      setRows(list.map((i) => ({ ...i, provider_name: providerNames[i.assigned_provider_id] ?? "Unassigned" })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Siren className="h-4 w-4 text-red-500" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No SOS calls on record.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((i) => (
              <div key={i.id} className="rounded-lg border p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{format(parseISO(i.created_at), "MMM d, yyyy h:mm a")}</span>
                  <div className="flex items-center gap-1.5">
                    {i.severity && (
                      <Badge className={`border-0 capitalize ${SEVERITY_CHIP[i.severity] ?? "bg-muted text-foreground"}`}>{i.severity}</Badge>
                    )}
                    <Badge variant="outline" className="capitalize">{i.status}</Badge>
                  </div>
                </div>
                <div className="text-muted-foreground">
                  Provider: <span className="text-foreground font-medium">{i.provider_name}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {i.accepted_at && <span>Accepted {format(parseISO(i.accepted_at), "HH:mm")}</span>}
                  {i.arrived_at && <span>Arrived {format(parseISO(i.arrived_at), "HH:mm")}</span>}
                  {i.resolved_at && <span>Resolved {format(parseISO(i.resolved_at), "HH:mm")}</span>}
                  {i.eta_minutes != null && !i.arrived_at && <span>ETA {i.eta_minutes}min</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
