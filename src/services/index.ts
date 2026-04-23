/**
 * Services index — re-exports all data-layer modules.
 *
 * Hooks/components can import from `@/services` once the project standardises
 * on the new path. Until then, both this and direct module paths work.
 */

export * as patientsService from "./supabase/patients";
export * as sessionsService from "./supabase/sessions";
export * as documentsService from "./supabase/documents";
export * as invoicesService from "./supabase/invoices";
export * as prescriptionsService from "./supabase/prescriptions";
export * as profilesService from "./supabase/profiles";
export * as appointmentsService from "./supabase/appointments";
export * as rewardsService from "./supabase/rewards";
export * as admissionsService from "./supabase/admissions";
export * as notificationsService from "./supabase/notifications";
export * as practiceService from "./supabase/practice";
export * as templatesService from "./supabase/templates";

export * as edge from "./edge";
export { safeInvoke } from "./edge/safeInvoke";
export { logger } from "./logger";
