import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Stethoscope, Phone, Search } from "lucide-react";

type Row = {
  id: string;
  role_at_hospital: string | null;
  hospital_name_snapshot: string | null;
  doctor: {
    id: string;
    full_name: string | null;
    specialty: string | null;
    practice_number: string | null;
    doctor_number: string | null;
    mobile_number: string | null;
    avatar_url: string | null;
  } | null;
};

export default function AffiliatedDoctorsScreen() {
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!providerId) return;
    (async () => {
      const { data } = await supabase
        .from("doctor_hospital_affiliations")
        .select("id, role_at_hospital, hospital_name_snapshot, doctor:profiles!doctor_hospital_affiliations_doctor_id_fkey(id, full_name, specialty, practice_number, doctor_number, mobile_number, avatar_url)")
        .eq("hospital_id", providerId)
        .eq("status", "active");
      // Fallback if FK alias not resolved
      if (!data) {
        const { data: raw } = await supabase
          .from("doctor_hospital_affiliations")
          .select("id, role_at_hospital, hospital_name_snapshot, doctor_id")
          .eq("hospital_id", providerId)
          .eq("status", "active");
        const ids = (raw || []).map((r: any) => r.doctor_id);
        if (ids.length === 0) { setRows([]); return; }
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, specialty, practice_number, doctor_number, mobile_number, avatar_url")
          .in("id", ids);
        const map = new Map((profiles || []).map((p: any) => [p.id, p]));
        setRows((raw || []).map((r: any) => ({ ...r, doctor: map.get(r.doctor_id) || null })));
        return;
      }
      setRows((data as any) || []);
    })();
  }, [providerId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.doctor?.full_name, r.doctor?.specialty, r.doctor?.practice_number, r.doctor?.doctor_number, r.role_at_hospital]
        .filter(Boolean).some((v) => (v as string).toLowerCase().includes(s))
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> Our Doctors</h1>
          <p className="text-xs text-muted-foreground">Doctors who serve at this hospital.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, specialty, MP no." className="pl-7 h-8 text-sm" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No affiliated doctors yet. Doctors can list this hospital from their Practice Management page.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <Card key={r.id} className="p-3 flex items-center gap-3 border-2 border-primary/20">
              <Avatar className="h-12 w-12 border-2 border-primary/40">
                <AvatarImage src={r.doctor?.avatar_url || undefined} />
                <AvatarFallback>{(r.doctor?.full_name || "?").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{r.doctor?.full_name || "Unknown"}</div>
                <div className="text-xs text-muted-foreground truncate">{r.doctor?.specialty || "—"}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {r.role_at_hospital && <Badge variant="secondary" className="text-[10px]">{r.role_at_hospital}</Badge>}
                  {r.doctor?.practice_number && <Badge variant="outline" className="text-[10px]">MP {r.doctor.practice_number}</Badge>}
                </div>
                {r.doctor?.mobile_number && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                    <Phone className="h-3 w-3" /> {r.doctor.mobile_number}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
