import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BedDouble, Clock, Stethoscope, Users, UserCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNurseWard } from "../../../hooks/useNurseWard";
import { useHospitalInpatients } from "../../../hooks/useHospitalInpatients";
import { useHospitalShifts, useMyShifts } from "../../../hooks/useHospitalShifts";
import { formatTimeRange, shiftIsLive } from "../../../lib/hospitalWards";

/** A nurse's home screen: her ward, her shift, ward occupancy, colleagues on
 *  shift, and the patients (with recent admissions) in that ward — merges
 *  what used to be separate Ward Board and Admissions screens. */
export default function NurseDashboardScreen() {
  const { user } = useAuth();
  const { assignment, loading } = useNurseWard();
  const { inpatients } = useHospitalInpatients(assignment?.hospitalId ?? null);
  const { onShiftNow } = useHospitalShifts(assignment?.hospitalId ?? null, assignment?.wardId ?? null);
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

  const recentAdmissions = useMemo(
    () => [...wardPatients].sort((a, b) => new Date(b.admitted_at).getTime() - new Date(a.admitted_at).getTime()).slice(0, 5),
    [wardPatients],
  );

  const occupancyPct = assignment?.wardBedCapacity
    ? Math.min(100, (wardPatients.length / assignment.wardBedCapacity) * 100)
    : 0;

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
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
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

      {/* Ward occupancy — merged from Ward Board */}
      {assignment.wardBedCapacity != null && (
        <Card className="rounded-xl border border-primary p-4">
          <div className="flex items-center justify-between text-xs">
            <p className="flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <BedDouble className="h-3.5 w-3.5" /> Ward occupancy
            </p>
            <span className="font-semibold tabular-nums">{wardPatients.length} / {assignment.wardBedCapacity}</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${occupancyPct}%` }} />
          </div>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {/* On shift now — merged from Ward Board */}
        <div className="overflow-hidden rounded-xl border border-neutral-400 bg-white">
          <div className="border-b bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white">
            On shift now
          </div>
          <ul className="space-y-1.5 p-2">
            {onShiftNow.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5 font-semibold">
                  <UserCog className="h-3.5 w-3.5 text-primary shrink-0" /> {s.staff_name}
                </span>
                <span className="capitalize text-muted-foreground">{s.staff_role} · {s.shift_type.replace(/_/g, "-")}</span>
              </li>
            ))}
            {!onShiftNow.length && <li className="px-3 py-4 text-center text-xs text-muted-foreground">Nobody clocked in</li>}
          </ul>
        </div>

        {/* Recent admissions — merged from Admissions */}
        <div className="overflow-hidden rounded-xl border border-neutral-400 bg-white">
          <div className="border-b bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white">
            Recent admissions
          </div>
          <ul className="space-y-1.5 p-2">
            {recentAdmissions.map((p) => {
              const row = (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.patient_name}</span>
                    {p.bed_number && <Badge variant="outline" className="text-[10px]">Bed {p.bed_number}</Badge>}
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    Admitted {new Date(p.admitted_at).toLocaleDateString()}
                    {p.reason ? ` · ${p.reason}` : ""}
                  </p>
                </>
              );
              return (
                <li key={p.id} className="rounded-md bg-muted/40 text-xs">
                  {p.patient_id ? (
                    <Link to={`/provider/hospital/patient/${p.patient_id}`} className="block px-3 py-2 hover:bg-primary/5 rounded-md">
                      {row}
                    </Link>
                  ) : (
                    <div className="px-3 py-2">{row}</div>
                  )}
                </li>
              );
            })}
            {!recentAdmissions.length && <li className="px-3 py-4 text-center text-xs text-muted-foreground">No admissions in your ward yet</li>}
          </ul>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-400 bg-white">
        <div className="border-b bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white">
          {assignment.wardName ?? "Ward"} — current patients
        </div>
        <ul className="divide-y">
          {wardPatients.map((p) => {
            const mine = p.nurses.some((n) => n.nurse_id === assignment.nurseId && !n.released_at);
            return (
              <li key={p.id}>
                {p.patient_id ? (
                  <Link
                    to={`/provider/hospital/patient/${p.patient_id}`}
                    className="flex flex-wrap items-center gap-2 rounded-md px-3 py-2 text-xs hover:bg-primary/5"
                  >
                    <span className="font-semibold text-foreground underline-offset-2 hover:underline">{p.patient_name}</span>
                    {p.bed_number && <Badge variant="outline" className="text-[10px]">Bed {p.bed_number}</Badge>}
                    {mine && <Badge className="text-[10px]">My patient</Badge>}
                    <span className="text-muted-foreground">{p.reason || "—"}</span>
                    {p.doctors[0] && (
                      <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
                        <Stethoscope className="h-3 w-3" /> {p.doctors[0].doctor_name}
                      </span>
                    )}
                  </Link>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                    <span className="font-semibold text-foreground">{p.patient_name}</span>
                    {p.bed_number && <Badge variant="outline" className="text-[10px]">Bed {p.bed_number}</Badge>}
                    {mine && <Badge className="text-[10px]">My patient</Badge>}
                    <span className="text-muted-foreground">{p.reason || "—"}</span>
                    {p.doctors[0] && (
                      <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
                        <Stethoscope className="h-3 w-3" /> {p.doctors[0].doctor_name}
                      </span>
                    )}
                  </div>
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
