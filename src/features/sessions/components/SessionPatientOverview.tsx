import { useEffect, useState } from "react";
import { Loader2, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SessionPatientOverviewProps {
  patient: any | undefined;
  currentMedications?: { medication: string; dosage: string; frequency: string }[];
}

const stripTags = (s: string) =>
  s.replace(/<\/?(med|symptom|condition)>/g, "").replace(/\s+/g, " ").trim();

/**
 * Patient Overview — a single-paragraph, read-only recap of the last 6 months
 * (conditions, current medications, allergies and presenting symptoms), shown
 * above Personal Notes during an active session.
 */
export function SessionPatientOverview({ patient, currentMedications = [] }: SessionPatientOverviewProps) {
  const [loading, setLoading] = useState(false);
  const [paragraph, setParagraph] = useState<string>("");

  const fallbackParagraph = () => {
    if (!patient) return "";
    const conditions = (patient.conditions_diagnoses || [])
      .map((c: any) => c?.name || c?.condition)
      .filter(Boolean);
    const meds = currentMedications.length
      ? currentMedications.map((m) => `${m.medication}${m.dosage ? ` ${m.dosage}` : ""}`)
      : (patient.current_medications || []).map((m: any) => m?.name).filter(Boolean);
    const parts: string[] = [];
    parts.push(`${patient.name} — overview of the last 6 months.`);
    parts.push(
      conditions.length
        ? `Known conditions: ${conditions.join(", ")}.`
        : "No conditions recorded."
    );
    parts.push(meds.length ? `Current medications: ${meds.join(", ")}.` : "No active medications recorded.");
    parts.push(patient.allergies ? `Allergies: ${patient.allergies}.` : "No known allergies recorded.");
    if (patient.notes) parts.push(`Notes: ${String(patient.notes).slice(0, 240)}`);
    return parts.join(" ");
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!patient?.id) return;
      setLoading(true);
      setParagraph("");
      try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const { data: sessions } = await supabase
          .from("sessions")
          .select("started_at, summary, transcript, status")
          .eq("patient_id", patient.id)
          .gte("started_at", sixMonthsAgo.toISOString())
          .order("started_at", { ascending: false })
          .limit(20);

        const { data, error } = await supabase.functions.invoke("summarize-patient-history", {
          body: { patient, sessions: sessions || [] },
        });
        if (error || data?.error) throw error || new Error(data.error);

        const summary = stripTags(String(data?.summary || ""));
        const conditions = (data?.conditions || []).map((c: any) => c.name).filter(Boolean);
        const meds = (data?.medications || []).filter((m: any) => m.status !== "inactive").map((m: any) => m.name).filter(Boolean);
        const allergies = (data?.allergies || []).map((a: any) => (typeof a === "string" ? a : a?.name)).filter(Boolean);
        const symptoms = (data?.symptoms || []).map((s: any) => s.name).filter(Boolean);

        const tail = [
          conditions.length ? `Conditions: ${conditions.join(", ")}.` : null,
          meds.length ? `Current medications: ${meds.join(", ")}.` : null,
          allergies.length ? `Allergies: ${allergies.join(", ")}.` : null,
          symptoms.length ? `Symptoms: ${symptoms.join(", ")}.` : null,
        ].filter(Boolean).join(" ");

        const text = [summary, tail].filter(Boolean).join(" ");
        if (!cancelled) setParagraph(text || fallbackParagraph());
      } catch (e) {
        console.warn("Patient overview generation failed", e);
        if (!cancelled) setParagraph(fallbackParagraph());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  return (
    <div className="flex flex-col rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-primary/5">
        <Stethoscope className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-medium text-foreground">Patient Overview</p>
        <span className="text-[10px] text-muted-foreground ml-auto">Last 6 months</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building overview...
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
            {paragraph || "No history available for this patient yet."}
          </p>
        )}
      </div>
    </div>
  );
}
