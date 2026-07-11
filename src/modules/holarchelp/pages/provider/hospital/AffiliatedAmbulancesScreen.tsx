import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Ambulance, Phone, Search, MapPin } from "lucide-react";

type Row = {
  id: string;
  role: string | null;
  ambulance: {
    id: string;
    company_name: string | null;
    contact_phone: string | null;
    city: string | null;
    base_address: string | null;
    status: string | null;
  } | null;
};

export default function AffiliatedAmbulancesScreen() {
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!providerId) return;
    (async () => {
      const { data: raw } = await supabase
        .from("ambulance_hospital_affiliations" as any)
        .select("id, role, ambulance_provider_id")
        .eq("hospital_id", providerId)
        .eq("status", "active");
      const ids = ((raw as any) || []).map((r: any) => r.ambulance_provider_id);
      if (!ids.length) { setRows([]); return; }
      const { data: provs } = await supabase
        .from("holarchelp_ambulance_providers" as any)
        .select("id, company_name, contact_phone, city, base_address, status")
        .in("id", ids);
      const map = new Map((provs || []).map((p: any) => [p.id, p]));
      setRows(((raw as any) || []).map((r: any) => ({
        id: r.id,
        role: r.role,
        ambulance: map.get(r.ambulance_provider_id) || null,
      })));
    })();
  }, [providerId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.ambulance?.company_name, r.ambulance?.city, r.role]
        .filter(Boolean).some((v) => (v as string).toLowerCase().includes(s)),
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Ambulance className="h-5 w-5 text-primary" /> Our ER Providers
          </h1>
          <p className="text-xs text-muted-foreground">ER providers partnered with this hospital.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company or city" className="pl-7 h-8 text-sm" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No affiliated ER providers yet. ER providers can list this hospital from their "Affiliated Hospitals" tab.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <Card key={r.id} className="p-3 border-2 border-primary/20">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-sos/15 flex items-center justify-center">
                  <Ambulance className="h-5 w-5 text-sos" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{r.ambulance?.company_name || "Unknown"}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {r.role && <Badge variant="secondary" className="text-xs">{r.role}</Badge>}
                    {r.ambulance?.status && r.ambulance.status !== "approved" && (
                      <Badge variant="outline" className="text-xs">{r.ambulance.status}</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                {r.ambulance?.city && (
                  <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.ambulance.city}</div>
                )}
                {r.ambulance?.contact_phone && (
                  <a href={`tel:${r.ambulance.contact_phone}`} className="flex items-center gap-1 hover:text-foreground">
                    <Phone className="h-3 w-3" />{r.ambulance.contact_phone}
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
