import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { clockShift, useMyShifts } from "../../../hooks/useHospitalShifts";
import { useHospitalInpatients, type InpatientRecord } from "../../../hooks/useHospitalInpatients";
import { formatTimeRange, shiftIsLive } from "../../../lib/hospitalWards";
import { LogActivityDialog } from "../../../components/InpatientDialogs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { NotebookPen } from "lucide-react";

export default function MyShiftScreen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { shifts, current, reload } = useMyShifts(user?.id);
  const [nurseIds, setNurseIds] = useState<string[]>([]);
  const [logFor, setLogFor] = useState<InpatientRecord | null>(null);

  const hospitalId = current?.hospital_id ?? shifts[0]?.hospital_id ?? null;
  const { inpatients, reload: reloadPatients } = useHospitalInpatients(hospitalId);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("hospital_nurses").select("id").eq("linked_user_id", user.id)
      .then(({ data }) => setNurseIds(((data ?? []) as { id: string }[]).map((n) => n.id)));
  }, [user?.id]);

  /** Patients this staff member is personally responsible for. */
  const myPatients = useMemo(
    () =>
      inpatients
        .map((p) => {
          const nurseRows = p.nurses.filter((n) => n.nurse_id && nurseIds.includes(n.nurse_id));
          const isDoctor = p.doctors.some((d) => d.doctor_id === user?.id);
          if (!nurseRows.length && !isDoctor) return null;
          return { patient: p, tasks: nurseRows.flatMap((n) => n.care_tasks ?? []), isDoctor };
        })
        .filter(Boolean) as { patient: InpatientRecord; tasks: string[]; isDoctor: boolean }[],
    [inpatients, nurseIds, user?.id],
  );

  const clock = async (id: string, action: "in" | "out") => {
    try { await clockShift(id, action); reload(); }
    catch (e: any) { toast({ title: "Clock failed", description: e?.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hospital operations</p>
        <h1 className="text-2xl font-extrabold">My shift</h1>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b bg-muted/40 px-3 py-2 text-xs font-bold uppercase tracking-wider">Upcoming & current shifts</div>
        <ul className="divide-y">
          {shifts.map((s) => {
            const live = shiftIsLive(s);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                <span className="font-semibold">{new Date(s.starts_at).toLocaleDateString()}</span>
                <span className="text-muted-foreground">{formatTimeRange(s.starts_at, s.ends_at)}</span>
                <Badge variant="outline" className="capitalize">{s.shift_type.replace(/_/g, "-")}</Badge>
                {live && <Badge className="bg-success text-success-foreground">Clocked in</Badge>}
                <div className="ml-auto">
                  {live ? (
                    <Button variant="outline" size="sm" onClick={() => clock(s.id, "out")}>Clock out</Button>
                  ) : s.clocked_out_at ? (
                    <span className="text-muted-foreground">Completed</span>
                  ) : (
                    <Button size="sm" onClick={() => clock(s.id, "in")}>Clock in</Button>
                  )}
                </div>
              </li>
            );
          })}
          {!shifts.length && <li className="p-8 text-center text-xs text-muted-foreground">No shifts assigned to you.</li>}
        </ul>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b bg-muted/40 px-3 py-2 text-xs font-bold uppercase tracking-wider">My patients</div>
        <ul className="divide-y">
          {myPatients.map(({ patient, tasks, isDoctor }) => (
            <li key={patient.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
              <div>
                <p className="font-semibold">{patient.patient_name}</p>
                <p className="text-muted-foreground">Bed {patient.bed_number || "—"}{tasks.length ? ` · ${tasks.join(", ")}` : ""}</p>
              </div>
              {isDoctor && <Badge variant="secondary">Attending doctor</Badge>}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setLogFor(patient)}>
                <NotebookPen className="mr-1 h-3.5 w-3.5" /> Log activity
              </Button>
            </li>
          ))}
          {!myPatients.length && <li className="p-8 text-center text-xs text-muted-foreground">No patients assigned to you.</li>}
        </ul>
      </div>

      <LogActivityDialog
        admission={logFor}
        staffName={(user?.user_metadata?.full_name as string) || user?.email || "Staff"}
        staffRole={nurseIds.length ? "nurse" : "doctor"}
        onOpenChange={(v) => !v && setLogFor(null)}
        onSaved={reloadPatients}
      />
    </div>
  );
}
