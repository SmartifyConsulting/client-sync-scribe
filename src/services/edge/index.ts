/**
 * Edge function services — typed callers, one per function.
 *
 * Mirrors the existing edge functions in `supabase/functions/`. Use these in
 * new code. Existing call sites can be migrated incrementally without
 * behaviour change.
 */

import { safeInvoke, type SafeInvokeResult } from "./safeInvoke";

// --- AI / clinical ---

export const summarizeSession = (payload: {
  notes?: string | null;
  transcript?: string | null;
  language?: string;
  action?: "translate" | "summarize";
}) => safeInvoke("summarize-session", payload);

export const transcribeAudio = (payload: { audio?: string; language?: string } | FormData) =>
  safeInvoke("transcribe-audio", payload);

export const translateText = (payload: { text: string; targetLanguage: string }) =>
  safeInvoke<{ translated: string }>("translate-text", payload);

export const analyzeMedicalImage = (payload: { imageUrl: string; documentId?: string }) =>
  safeInvoke("analyze-medical-image", payload);

export const compareMedicalImages = (payload: { imageUrls: string[]; comparisonType?: string }) =>
  safeInvoke("compare-medical-images", payload);

export const aiClinicianDiagnosis = (payload: Record<string, unknown>) =>
  safeInvoke("ai-clinician-diagnosis", payload);

export const checkMedicationConflicts = (payload: { medications: string[] }) =>
  safeInvoke("check-medication-conflicts", payload);

export const lookupMedicalCodes = (payload: { query: string; codeType?: string }) =>
  safeInvoke("lookup-medical-codes", payload);

export const summarizePatientHistory = (payload: Record<string, unknown>) =>
  safeInvoke("summarize-patient-history", payload);

export const validateMedicationVideo = (payload: Record<string, unknown>) =>
  safeInvoke("validate-medication-video", payload);

export const validateHealthPhoto = (payload: { imageUrl: string; category?: string }) =>
  safeInvoke("validate-health-photo", payload);

export const narrateBriefing = (payload: { text: string; voice?: string }) =>
  safeInvoke<{ audio: string }>("narrate-briefing", payload);

export const processTodoActions = (payload: { text: string }) =>
  safeInvoke("process-todo-actions", payload);

// --- Patients & data ingestion ---

export const parsePatientImport = (payload: Record<string, unknown> | FormData) =>
  safeInvoke("parse-patient-import", payload);

// --- Documents / email ---

export const sendDocumentEmail = (payload: {
  documentId?: string;
  to?: string;
  recipientEmail?: string;
  subject?: string;
  content?: string;
}) => safeInvoke("send-document-email", payload);

export const sendInvoiceReport = (payload: Record<string, unknown>) =>
  safeInvoke("send-invoice-report", payload);

export const submitInsuranceClaim = (payload: Record<string, unknown>) =>
  safeInvoke("submit-insurance-claim", payload);

export const receiveEmailDocument = (payload: Record<string, unknown>) =>
  safeInvoke("receive-email-document", payload);

// --- Invitations & connections ---

export const sendPatientInvitation = (payload: {
  patientEmail: string;
  patientName?: string;
  message?: string;
}) => safeInvoke("send-patient-invitation", payload);

export const sendUserInvitation = (payload: {
  recipientEmail: string;
  senderName?: string;
  message?: string;
  isPracticePartner?: boolean;
  partnerName?: string;
}) => safeInvoke("send-user-invitation", payload);

export const notifyNextOfKin = (payload: Record<string, unknown>) =>
  safeInvoke("notify-next-of-kin", payload);

// --- Calendar ---

export const googleCalendarAuth = (payload?: Record<string, unknown>) =>
  safeInvoke("google-calendar-auth", payload);

export const googleCalendarSync = (payload?: Record<string, unknown>) =>
  safeInvoke("google-calendar-sync", payload);

// --- Subscriptions & background ---

export const paypalSubscription = (payload: Record<string, unknown>) =>
  safeInvoke("paypal-subscription", payload);

export const reconcileAdherenceMonthly = (payload?: Record<string, unknown>) =>
  safeInvoke("reconcile-adherence-monthly", payload);

export const remindAudioRetention = (payload?: Record<string, unknown>) =>
  safeInvoke("remind-audio-retention", payload);

// --- Misc ---

export const googlePlacesAutocomplete = (payload: { input: string }) =>
  safeInvoke<{ predictions: any[] }>("google-places-autocomplete", payload);

export const adminUpdateEmail = (payload: { userId: string; newEmail: string }) =>
  safeInvoke("admin-update-email", payload);

export type { SafeInvokeResult };
