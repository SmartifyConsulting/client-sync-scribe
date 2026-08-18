// Shared helper that resolves a stored document's [Token] placeholders to real
// values before previewing. Centralises the logic used by every preview entry
// point (Dashboard To-Do, /todos, /documents, PatientProfile, PatientDocuments)
// so all surfaces behave identically.
//
// Responsibilities:
//   1. Load patient, doctor profile, linked invoice, and linked prescriptions
//      based on the document's metadata.
//   2. Pass that context to fillDocumentPlaceholders so all known [Tokens] —
//      including indexed prescription slots like [Medication1], [Dosage1] —
//      get resolved.
//   3. Inline [DoctorSignature] using the doctor's stored signature URL.
//   4. Auto-heal: if resolution actually changed the stored content (i.e. the
//      doc was sitting in the DB with raw placeholders), persist the cleaned
//      version so subsequent prints/emails are already correct.

import { supabase } from "@/integrations/supabase/client";
import { renderSignatureHtml } from "@/lib/signature";

import {
  fillDocumentPlaceholders,
  type FillContext,
  type FillPrescription,
} from "@/lib/fillDocumentPlaceholders";

export interface PreviewDocumentInput {
  id: string;
  content: string | null | undefined;
  user_id?: string | null;
  patient_id?: string | null;
  template_name?: string | null;
  session_id?: string | null;
  name?: string | null;
}

export interface ResolvedDocumentPreview {
  resolvedContent: string;
  logoUrl?: string;
  signatureUrl?: string;
  templateName?: string | null;
  userId?: string | null;
  didChange: boolean;
}

const isInvoiceTemplate = (name?: string | null) =>
  !!name && /invoice/i.test(name);

const isPrescriptionTemplate = (name?: string | null) =>
  !!name && /prescription/i.test(name);

const isCertificateTemplate = (name?: string | null) =>
  !!name && /(certificate|sick\s*note)/i.test(name);

const isReferralTemplate = (name?: string | null) =>
  !!name && /referral/i.test(name);

/** Renders the patient's stored medication list as readable lines. */
function formatMedications(meds: unknown): string | null {
  if (!Array.isArray(meds) || meds.length === 0) return null;
  const lines = meds
    .map((m: any) => {
      if (typeof m === "string") return m;
      const name = m?.name || m?.medication || "";
      if (!name) return "";
      const detail = [m?.dosage, m?.frequency].filter(Boolean).join(" ");
      return detail ? `${name} — ${detail}` : name;
    })
    .filter(Boolean);
  return lines.length ? lines.join("\n") : null;
}


export async function resolveDocumentPreviewContent(
  doc: PreviewDocumentInput,
): Promise<ResolvedDocumentPreview> {
  const original = doc.content || "";

  // Documents created outside a session (or older rows) may not carry a
  // patient_id — recover it from the linked session so certificates/invoices
  // still resolve real patient details.
  let patientId = doc.patient_id || null;
  if (!patientId && doc.session_id) {
    const { data: sessionRow } = await supabase
      .from("sessions")
      .select("patient_id")
      .eq("id", doc.session_id)
      .maybeSingle();
    patientId = (sessionRow as any)?.patient_id || null;
  }

  const [patientRes, profileRes] = await Promise.all([
    patientId
      ? supabase.from("patients").select("*").eq("id", patientId).maybeSingle()
      : Promise.resolve({ data: null } as any),
    doc.user_id
      ? supabase.from("profiles").select("*").eq("id", doc.user_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const patient = patientRes?.data || null;
  const profile = profileRes?.data || null;

  // Invoice context — prefer the invoice raised for this session, then fall
  // back to the patient's most recent invoice so standalone invoice documents
  // still preview with real amounts instead of [Tokens].
  let invoice: FillContext["invoice"] = null;
  if (isInvoiceTemplate(doc.template_name)) {
    let invRow: any = null;
    if (doc.session_id) {
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("session_id", doc.session_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      invRow = data || null;
    }
    if (!invRow && patientId) {
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      invRow = data || null;
    }
    if (invRow) {
      invoice = {
        invoice_number: invRow.invoice_number,
        description: invRow.description,
        amount: invRow.amount,
        due_date: invRow.due_date,
        created_at: invRow.created_at,
        paid_at: invRow.paid_at,
        currency: "ZAR",
      };
    }
  }

  // Prescription context — prefer rows linked to the same session, fall back
  // to the patient's latest active prescriptions so legacy/standalone Rx docs
  // still render with real meds.
  let prescription: FillPrescription | null = null;
  if (isPrescriptionTemplate(doc.template_name)) {
    let rxRows: any[] | null = null;
    if (doc.session_id) {
      const { data } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("session_id", doc.session_id)
        .order("created_at", { ascending: true });
      rxRows = data || null;
    }
    if ((!rxRows || rxRows.length === 0) && patientId) {
      const { data } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(5);
      rxRows = data || null;
    }
    if (rxRows && rxRows.length > 0) {
      prescription = {
        medications: rxRows.map((r) => ({
          medication: r.medication,
          dosage: r.dosage,
          quantity: (r as any).quantity ?? null,
          frequency: r.frequency,
          instructions: r.instructions,
        })),
        repeats: rxRows[0]?.refills_remaining ?? null,
        special_instructions: rxRows[0]?.instructions ?? null,
      };
    }
  }

  // Medical certificate context — consultation date/time come from the linked
  // session, the nature of illness from its summary/diagnosis.
  let certificate: FillContext["certificate"] = null;
  if (isCertificateTemplate(doc.template_name)) {
    let sess: any = null;
    if (doc.session_id) {
      const { data } = await supabase
        .from("sessions")
        .select("created_at, started_at, summary, diagnosis")
        .eq("id", doc.session_id)
        .maybeSingle();
      sess = data || null;
    }
    const when =
      sess?.started_at || sess?.created_at || (doc as any).created_at || new Date().toISOString();
    const nature =
      (sess?.diagnosis && String(sess.diagnosis).trim()) ||
      (sess?.summary ? String(sess.summary).split("\n").find((l: string) => l.trim())?.trim() : "") ||
      "";
    certificate = {
      consultation_date: when,
      consultation_time: new Date(when).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      nature_of_illness: nature,
    };
  }

  // Referral letter context — the specialist comes from the document name (the
  // generator stores "Referral Letter - <Specialist> - <date>"), and the
  // clinical body from the linked session plus the patient's own record, so
  // referral letters never preview as a skeleton of blanks.
  let referral: FillContext["referral"] = null;
  if (isReferralTemplate(doc.template_name) || isReferralTemplate(doc.name)) {
    let sess: any = null;
    if (doc.session_id) {
      const { data } = await supabase
        .from("sessions")
        .select("summary, notes, diagnosis, ai_diagnosis, action_points, external_doctor_name, external_doctor_specialty")
        .eq("id", doc.session_id)
        .maybeSingle();
      sess = data || null;
    }

    const nameParts = String(doc.name || "").split(" - ");
    const fromName = nameParts.length > 1 ? nameParts[1].trim() : "";
    const specialist =
      sess?.external_doctor_name ||
      (fromName && !/^\d/.test(fromName) && fromName !== (patient as any)?.name ? fromName : "");

    const firstLine = (text?: string | null) =>
      text ? String(text).split("\n").find((l) => l.trim())?.trim() || "" : "";

    const diagnosis =
      (sess?.diagnosis && String(sess.diagnosis).trim()) ||
      (sess?.ai_diagnosis && String(sess.ai_diagnosis).trim()) ||
      "";
    const complaint = firstLine(sess?.summary) || diagnosis;

    referral = {
      specialist_name: specialist || null,
      specialist_type: sess?.external_doctor_specialty || null,
      presenting_complaint: complaint || null,
      relevant_history: (patient as any)?.medical_history || null,
      current_medications: formatMedications((patient as any)?.current_medications),
      reason: diagnosis || complaint || null,
      diagnosis: diagnosis || null,
      clinical_notes: sess?.summary ? String(sess.summary).trim() : null,
      urgency: null,
    };
  }

  const filled = fillDocumentPlaceholders(original, {
    patient,
    profile,
    invoice,
    prescription,
    certificate,
    referral,
  });


  let content = filled.content;

  // Inline the doctor's signature (uploaded image or typed signature).
  const signatureUrl = (profile as any)?.signature_url || undefined;
  const signatureHtml = renderSignatureHtml(profile as any);
  if (signatureHtml) {
    content = content.replace(/\[(DoctorSignature|Signature)\]/g, signatureHtml);

    // Legacy documents were saved with the signature slot already flattened to a
    // blank "___" line (the quiet placeholder). Restore the real signature there
    // so To-Do / list previews match the editor preview.
    if (!content.includes(signatureHtml)) {
      content = content.replace(
        /(Registration Number:[^\n]*\n+)\s*_{2,}\s*(?=\n)/,
        `$1${signatureHtml}`,
      );
      const todayLong = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      content = content.replace(/(\n\s*Date:\s*)_{2,}\s*(?=\n|$)/, `$1${todayLong}`);
    }
  }

  const didChange = content !== original;

  // Auto-heal stored documents that still contain raw placeholders so future
  // previews/prints/emails skip resolution entirely. Skip persisting when the
  // signature could not be resolved, so it is retried on the next preview.
  if (filled.hadPlaceholders && didChange && signatureHtml) {
    try {
      await supabase.from("documents").update({ content }).eq("id", doc.id);
    } catch (err) {
      // Non-fatal — preview still works for this view.
      console.error("[resolveDocumentPreviewContent] auto-heal failed", err);
    }
  }


  return {
    resolvedContent: content,
    logoUrl: (profile as any)?.logo_url || undefined,
    signatureUrl,
    templateName: doc.template_name ?? null,
    userId: doc.user_id ?? null,
    didChange,
  };
}
