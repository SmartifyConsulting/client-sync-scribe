/**
 * Shared domain types for Holarc Health.
 *
 * Wherever possible, types are derived from the auto-generated Supabase
 * `Database` definition (`@/integrations/supabase/types`) so any schema
 * change flows through automatically.
 *
 * Phase 4 of the refactor: extract the most-used inline shapes (Patient,
 * Session, Document, Invoice, Prescription, Profile, Appointment, Reward
 * and a handful of supporting tables) into a single import surface.
 *
 * Existing hooks and components continue to define their own local
 * interfaces — this file only adds a canonical home; nothing is removed.
 */

import type { Database } from "@/integrations/supabase/types";

/* ------------------------------------------------------------------ */
/* Convenience helpers                                                */
/* ------------------------------------------------------------------ */

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type Row<T extends keyof Tables> = Tables[T]["Row"];
export type Insert<T extends keyof Tables> = Tables[T]["Insert"];
export type Update<T extends keyof Tables> = Tables[T]["Update"];

/* ------------------------------------------------------------------ */
/* Core domain rows                                                   */
/* ------------------------------------------------------------------ */

export type Patient = Row<"patients">;
export type PatientInsert = Insert<"patients">;
export type PatientUpdate = Update<"patients">;

export type Session = Row<"sessions">;
export type SessionInsert = Insert<"sessions">;
export type SessionUpdate = Update<"sessions">;

export type DocumentRecord = Row<"documents">;
export type DocumentInsert = Insert<"documents">;
export type DocumentUpdate = Update<"documents">;

export type Invoice = Row<"invoices">;
export type InvoiceInsert = Insert<"invoices">;
export type InvoiceUpdate = Update<"invoices">;

export type Prescription = Row<"prescriptions">;
export type PrescriptionInsert = Insert<"prescriptions">;
export type PrescriptionUpdate = Update<"prescriptions">;

export type Profile = Row<"profiles">;
export type ProfileInsert = Insert<"profiles">;
export type ProfileUpdate = Update<"profiles">;

export type Appointment = Row<"appointments">;
export type AppointmentInsert = Insert<"appointments">;
export type AppointmentUpdate = Update<"appointments">;

export type AppointmentRequest = Row<"appointment_requests">;

export type PatientReward = Row<"patient_rewards">;
export type DoctorReward = Row<"doctor_rewards">;
export type MedicationAdherence = Row<"medication_adherence">;

export type HospitalAdmission = Row<"hospital_admissions">;
export type AdmissionVitals = Row<"admission_vitals">;
export type AdmissionMedication = Row<"admission_medications">;
export type AdmissionLabResult = Row<"admission_lab_results">;
export type AdmissionImaging = Row<"admission_imaging">;

export type Notification = Row<"notifications">;
export type Template = Row<"templates"> extends never ? never : Row<"templates">;
export type HeaderFooterTemplate = Row<"header_footer_templates">;
export type Practice = Row<"practices">;
export type PracticeMember = Row<"practice_members">;

export type DoctorPatientAccess = Row<"doctor_patient_access">;
export type DoctorAccessRequest = Row<"doctor_access_requests">;
export type PatientInvitation = Row<"patient_invitations">;

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export type UserRole = Enums["user_role"];
export type AccessPermission = Enums["access_permission"];
export type InvitationStatus = Enums["invitation_status"];

/* ------------------------------------------------------------------ */
/* Common service result shape                                         */
/* ------------------------------------------------------------------ */

/**
 * Standard return for every wrapper in `src/services/`.
 * Matches the contract used by `safeInvoke` so callers can handle
 * both DB queries and edge function calls uniformly.
 */
export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}
