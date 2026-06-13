/**
 * Surfaces a patient's prescriptions that are due (or overdue) for renewal,
 * joined with any existing pending renewal request so the UI can show
 * "Renewal requested" instead of letting the patient submit twice.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInCalendarDays, parseISO } from "date-fns";

export interface RenewalCandidate {
  prescription_id: string;
  medication: string;
  dosage: string | null;
  frequency: string | null;
  instructions: string | null;
  end_date: string | null;
  refills_remaining: number;
  doctor_id: string | null;
  doctor_name: string | null;
  days_until_expiry: number | null; // negative = overdue
  is_expired: boolean;
  existing_request_id: string | null;
  existing_request_doctor_id: string | null;
  existing_request_status: string | null;
  existing_request_comment: string | null;
}

const DEFAULT_LEAD_DAYS = 7;

export function usePrescriptionRenewals(patientId: string | undefined) {
  return useQuery({
    queryKey: ["prescription-renewals", patientId],
    enabled: !!patientId,
    queryFn: async (): Promise<RenewalCandidate[]> => {
      if (!patientId) return [];

      const { data: rxs, error } = await supabase
        .from("prescriptions")
        .select(
          "id, medication, dosage, frequency, instructions, end_date, refills_remaining, doctor_id, status, refill_reminder_days",
        )
        .eq("patient_id", patientId)
        .eq("status", "active");
      if (error) throw error;

      const today = new Date();
      const candidates = (rxs ?? []).filter((rx: any) => {
        const lead = rx.refill_reminder_days ?? DEFAULT_LEAD_DAYS;
        if (rx.end_date) {
          const days = differenceInCalendarDays(parseISO(rx.end_date), today);
          if (days <= lead) return true;
        }
        if (!rx.end_date && (rx.refills_remaining ?? 0) <= 0) return true;
        return false;
      });

      if (candidates.length === 0) return [];

      const doctorIds = Array.from(
        new Set(candidates.map((c: any) => c.doctor_id).filter(Boolean)),
      ) as string[];
      const rxIds = candidates.map((c: any) => c.id) as string[];

      const [{ data: doctors }, { data: requests }] = await Promise.all([
        doctorIds.length
          ? supabase.from("profiles").select("id, full_name").in("id", doctorIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from("prescription_renewal_requests")
          .select("id, prescription_id, requested_doctor_id, status, patient_comment")
          .in("prescription_id", rxIds)
          .eq("status", "pending"),
      ]);

      return candidates.map((rx: any) => {
        const doc = (doctors ?? []).find((d: any) => d.id === rx.doctor_id);
        const req = (requests ?? []).find((r: any) => r.prescription_id === rx.id);
        const daysUntil = rx.end_date
          ? differenceInCalendarDays(parseISO(rx.end_date), today)
          : null;
        return {
          prescription_id: rx.id,
          medication: rx.medication,
          dosage: rx.dosage,
          frequency: rx.frequency,
          instructions: rx.instructions,
          end_date: rx.end_date,
          refills_remaining: rx.refills_remaining ?? 0,
          doctor_id: rx.doctor_id,
          doctor_name: doc?.full_name ?? null,
          days_until_expiry: daysUntil,
          is_expired: daysUntil !== null && daysUntil < 0,
          existing_request_id: req?.id ?? null,
          existing_request_doctor_id: req?.requested_doctor_id ?? null,
          existing_request_status: req?.status ?? null,
          existing_request_comment: req?.patient_comment ?? null,
        };
      });
    },
  });
}
