import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BedDouble, Clock, Stethoscope, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNurseWard } from "../../../hooks/useNurseWard";
import { useHospitalInpatients } from "../../../hooks/useHospitalInpatients";
import { useMyShifts } from "../../../hooks/useHospitalShifts";
import { formatTimeRange, shiftIsLive } from "../../../lib/hospitalWards";

/** A nurse's home screen: her ward, her shift and the patients in that ward. */
export default function NurseDashboardScreen() {
  const { user } = useAuth();
  const { assignment, loading } = useNurseWard();
  const { inpatients } = useHospitalInpatients(assignment?.hospitalId ?? null);
  const { shifts, current } = useMyShifts(user?.id);

  /** Only the ward this nurse is dedicated to. */
  const wardPatients = useMemo(
    () =>
      assignment?.wardId
        ? inpatients.filter((p) => p.ward_id === assignment.wardId && !p.discharged_at)
        : [],
    [inpatients, assignment?.wardId],
  );

  const myPatients = useMemo(
    () => wardPatients.filter((p) => p.nurses.some((n) => n.nurse_id === assignment?.nurseId && !n.released_at)),
    [wardPatients, assignment?.nurseId],
  );

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading your ward…</div>;
  }

  if (!assignment) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        You aren't on a hospital nursing roster yet. Ask your ward manager to add you.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold text-foreground">My Ward</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {assignment.hospitalName ?? "Hospital"}
          {assignment.wardName ? ` · ${assignment.wardName}` : " · no ward assigned yet"}
        </p>
      </header>

      {!assignment.wardId && (
        <Card className="border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
          You have no ward assigned, so no patient records are visible. Your ward manager can assign
          your ward on the nursing roster.
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-xl border border-primary p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <BedDouble className="h-3.5 w-3.5" /> Patients in ward
          </p>
          <p className="mt-1 text-2xl font-bold">{wardPatients.length}</p>
        </Card>
        <Card className="rounded-xl border border-primary p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Assigned to me
          </p>
          <p className="mt-1 text-2xl font-bold">{myPatients.length}</p>
        </Card>
        <Card className="rounded-xl border border-primary p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Shift
          </p>
          <p className="mt-1 text-sm font-semibold">
            {current ? formatTimeRange(current.starts_at, current.ends_at) : "Not on duty"}
          </p>
          {shifts.length > 0 && (
            <Link to="/my-shift" className="text-xs text-primary underline">
              View my shifts
            </Link>
          )}
        </Card>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-400 bg-white">
        <div className="border-b bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white">
          {assignment.wardName ?? "Ward"} — current patients
        </div>
        <ul className="divide-y">
          {wardPatients.map((p) => {
            const mine = p.nurses.some((n) => n.nurse_id === assignment.nurseId && !n.released_at);
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                <span className="font-semibold text-foreground">{p.patient_name}</span>
                {p.bed_number && <Badge variant="outline" className="text-[10px]">Bed {p.bed_number}</Badge>}
                {mine && <Badge className="text-[10px]">My patient</Badge>}
                <span className="text-muted-foreground">{p.reason || "—"}</span>
                {p.doctors[0] && (
                  <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
                    <Stethoscope className="h-3 w-3" /> {p.doctors[0].doctor_name}
                  </span>
                )}
              </li>
            );
          })}
          {wardPatients.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-muted-foreground">
              No active patients in your ward right now.
            </li>
          )}
        </ul>
      </div>

      {current && shiftIsLive(current) && (
        <p className="text-xs text-muted-foreground">You are currently on duty.</p>
      )}
    </div>
  );
}
