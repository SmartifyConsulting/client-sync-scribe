import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Stethoscope, Phone, Search, UserPlus } from "lucide-react";
import { ImportDoctorsDialog } from "./ImportDoctorsDialog";

type Row = {
  id: string;
  role_at_hospital: string | null;
  hospital_name_snapshot: string | null;
  status: string;
  doctor_id: string | null;
  pending_doctor_payload: any | null;
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

  const load = useCallback(async () => {
    if (!providerId) return;
    const { data: raw } = await supabase
      .from("doctor_hospital_affiliations" as any)
      .select("id, role_at_hospital, hospital_name_snapshot, status, doctor_id, pending_doctor_payload")
      .eq("hospital_id", providerId);
    const ids = ((raw as any) || []).map((r: any) => r.doctor_id).filter(Boolean);
    let profileMap = new Map<string, any>();
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, practice_number, doctor_number, mobile_number, avatar_url")
        .in("id", ids);
      profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    }
    setRows(((raw as any) || []).map((r: any) => ({
      ...r,
      doctor: r.doctor_id ? profileMap.get(r.doctor_id) || null : null,
    })));
  }, [providerId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const name = r.doctor?.full_name || r.pending_doctor_payload?.full_name || r.hospital_name_snapshot;
      const specialty = r.doctor?.specialty || r.pending_doctor_payload?.specialty;
      const pn = r.doctor?.practice_number || r.pending_doctor_payload?.practice_number;
      return [name, specialty, pn, r.role_at_hospital]
        .filter(Boolean).some((v) => (v as string).toLowerCase().includes(s));
    });
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> Our Doctors</h1>
          <p className="text-sm text-muted-foreground">Doctors who serve at this hospital. Pending rows link automatically when the doctor signs up.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, specialty, MP no." className="pl-7 h-8 text-sm" />
          </div>
          {providerId && <ImportDoctorsDialog hospitalId={providerId} onImported={load} />}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No affiliated doctors yet. Doctors can list this hospital from their Practice Management page, or import a CSV/XLSX above.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => {
            const pending = !r.doctor_id;
            const name = r.doctor?.full_name || r.pending_doctor_payload?.full_name || r.hospital_name_snapshot || "Unknown";
            const specialty = r.doctor?.specialty || r.pending_doctor_payload?.specialty || "â€”";
            const practiceNo = r.doctor?.practice_number || r.pending_doctor_payload?.practice_number;
            const mobile = r.doctor?.mobile_number || r.pending_doctor_payload?.mobile_number;
            return (
              <Card key={r.id} className={`p-3 flex items-center gap-3 border-2 ${pending ? "border-dashed border-muted-foreground/30" : "border-primary/20"}`}>
                <Avatar className="h-12 w-12 border-2 border-primary/40">
                  <AvatarImage src={r.doctor?.avatar_url || undefined} />
                  <AvatarFallback>{pending ? <UserPlus className="h-4 w-4" /> : name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                    {name}
                    {pending && <Badge variant="outline" className="text-sm">Not yet on platform</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{specialty}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {r.role_at_hospital && <Badge variant="secondary" className="text-sm">{r.role_at_hospital}</Badge>}
                    {practiceNo && <Badge variant="outline" className="text-sm">MP {practiceNo}</Badge>}
                  </div>
                  {mobile && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Phone className="h-3 w-3" /> {mobile}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

