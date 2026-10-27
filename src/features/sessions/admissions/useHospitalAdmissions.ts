import { useQuery } from "@tanstack/react-query";
import { listAdmissionsForPatient } from "@/services/supabase/admissions";

export type { HospitalAdmissionRow, HospitalAdmissionInsert } from "@/services/supabase/admissions";

/** Patient-scoped admissions; the service preserves access controls and date ordering. */
export function useHospitalAdmissions(patientId?: string | null) {
  return useQuery({
    queryKey: ["hospital-admissions", patientId],
    enabled: Boolean(patientId),
    queryFn: () => patientId ? listAdmissionsForPatient(patientId) : Promise.resolve([]),
  });
}