import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, BedDouble, Search } from "lucide-react";
import { format } from "date-fns";

type Row = {
  id: string;
  patient_id: string;
  doctor_id: string;
  hospital: string | null;
  admission_date: string;
  discharge_date: string | null;
  diagnosis: string | null;
  status: string;
  patient_name?: string;
  doctor_name?: string;
};

export default function DoctorAdmissions() {
  const navigate = useNavigate();
  const [scope, setScope] = useState<"mine" | "others">("mine");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-admissions"],
    queryFn: async (): Promise<Row[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: myPatients } = await supabase
        .from("patients")
        .select("id, name")
        .eq("user_id", user.id);
      const nameById = new Map<string, string>((myPatients || []).map((p: any) => [p.id, p.name]));
      const ids = Array.from(nameById.keys());
      if (ids.length === 0) return [];

      const { data: rows, error } = await supabase
        .from("hospital_admissions")
        .select("*")
        .in("patient_id", ids)
        .order("admission_date", { ascending: false });
      if (error) throw error;

      const doctorIds = Array.from(new Set((rows || []).map((r: any) => r.doctor_id).filter(Boolean)));
      const docNameById = new Map<string, string>();
      if (doctorIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", doctorIds);
        (profs || []).forEach((p: any) => docNameById.set(p.id, p.full_name));
      }

      return (rows || []).map((r: any) => ({
        ...r,
        patient_name: nameById.get(r.patient_id) || "Unknown patient",
        doctor_name: docNameById.get(r.doctor_id) || "—",
      }));
    },
  });

  const { data: currentUserId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const rows = useMemo(() => {
    const list = (data || []).filter((r) =>
      scope === "mine" ? r.doctor_id === currentUserId : r.doctor_id !== currentUserId,
    );
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        (r.patient_name || "").toLowerCase().includes(q) ||
        (r.hospital || "").toLowerCase().includes(q) ||
        (r.diagnosis || "").toLowerCase().includes(q),
    );
  }, [data, scope, search, currentUserId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admissions</h1>
        <p className="text-xs text-muted-foreground">Hospital admissions for your patients</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="single"
          value={scope}
          onValueChange={(v) => v && setScope(v as "mine" | "others")}
          className="rounded-lg border border-border p-0.5"
        >
          <ToggleGroupItem value="mine" className="h-8 px-3 text-xs">
            Admitted by me
          </ToggleGroupItem>
          <ToggleGroupItem value="others" className="h-8 px-3 text-xs">
            Other doctors
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="relative flex-1 min-w-[14rem] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admissions..."
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No admissions to show.
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {rows.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/patients/${r.patient_id}`)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
            >
              <BedDouble className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{r.patient_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[r.hospital, r.diagnosis].filter(Boolean).join(" · ") || "No details"}
                </p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-xs text-muted-foreground">
                  {r.admission_date ? format(new Date(r.admission_date), "d MMM yyyy") : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">{r.doctor_name}</p>
              </div>
              <Badge variant={r.discharge_date ? "secondary" : "default"} className="shrink-0 text-[10px]">
                {r.discharge_date ? "Discharged" : r.status || "Admitted"}
              </Badge>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
