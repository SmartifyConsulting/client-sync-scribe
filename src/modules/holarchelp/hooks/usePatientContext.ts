import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PatientAllergyAlert {
  id: string;
  allergen: string;
  type: string;
  severity: "mild" | "moderate" | "severe";
  reaction: string;
  date_reported: string;
}

export interface PatientMedication {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  route: string;
  indication: string;
  pharmacy: string;
  status: string;
}

export interface PatientLabResult {
  id: string;
  test: string;
  value: number;
  unit: string;
  normal_min: number;
  normal_max: number;
  date: string;
  status: "normal" | "abnormal" | "critical";
  facility: string;
}

export interface PatientImaging {
  id: string;
  type: string;
  region: string;
  date: string;
  findings: string;
  report_url: string;
  dicom_url: string;
}

export interface PatientMedicalHistory {
  id: string;
  condition: string;
  status: string;
  diagnosed_date: string;
  severity: string;
  notes: string;
}

export interface DrugInteraction {
  drug_1: string;
  drug_2: string;
  severity: "mild" | "moderate" | "severe";
  effect: string;
  recommendation: string;
}

export interface PatientContext {
  medical_history: PatientMedicalHistory[];
  allergies: PatientAllergyAlert[];
  current_medications: PatientMedication[];
  recent_labs: PatientLabResult[];
  recent_imaging: PatientImaging[];
  drug_interactions: DrugInteraction[];
}

interface UsePatientContextProps {
  patientUserId: string | null;
  enabled?: boolean;
}

/**
 * Hook to fetch complete patient context (medical history, allergies, labs, imaging)
 * for display in hospital ER/incident console
 */
export function usePatientContext({ patientUserId, enabled = true }: UsePatientContextProps) {
  const [context, setContext] = useState<PatientContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !patientUserId) {
      setContext(null);
      return;
    }

    fetchPatientContext();
  }, [patientUserId, enabled]);

  const fetchPatientContext = async () => {
    if (!patientUserId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.rpc("get_patient_context", {
        p_patient_user_id: patientUserId,
      });

      if (err) {
        throw err;
      }

      if (data && data.length > 0) {
        const contextData = data[0] as Record<string, unknown>;
        setContext({
          medical_history: (contextData.medical_history as PatientMedicalHistory[]) || [],
          allergies: (contextData.allergies as PatientAllergyAlert[]) || [],
          current_medications: (contextData.current_medications as PatientMedication[]) || [],
          recent_labs: (contextData.recent_labs as PatientLabResult[]) || [],
          recent_imaging: (contextData.recent_imaging as PatientImaging[]) || [],
          drug_interactions: (contextData.drug_interactions as DrugInteraction[]) || [],
        });

        // Log access for audit
        await logPatientAccess("view_context");
      } else {
        setContext({
          medical_history: [],
          allergies: [],
          current_medications: [],
          recent_labs: [],
          recent_imaging: [],
          drug_interactions: [],
        });
      }
    } catch (err) {
      console.error("Patient context fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load patient context");
      setContext(null);
    } finally {
      setLoading(false);
    }
  };

  const logPatientAccess = async (accessType: string) => {
    if (!patientUserId) return;

    try {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) return;

      await supabase.from("patient_context_access_log").insert({
        staff_user_id: userAuth.user.id,
        patient_user_id: patientUserId,
        access_type: accessType,
      });
    } catch (err) {
      console.error("Failed to log patient context access:", err);
      // Don't throw - logging errors shouldn't block UI
    }
  };

  /**
   * Check for drug interactions with a new medication
   */
  const checkMedicationInteraction = async (
    newMedication: string,
    existingMedications: string[]
  ): Promise<DrugInteraction[]> => {
    const interactions: DrugInteraction[] = [];

    try {
      for (const existing of existingMedications) {
        const { data, error: err } = await supabase.rpc(
          "check_medication_interaction",
          {
            p_drug_1: newMedication,
            p_drug_2: existing,
          }
        );

        if (err) {
          console.error("Interaction check error:", err);
          continue;
        }

        if (data && data.length > 0 && data[0].has_interaction) {
          interactions.push({
            drug_1: newMedication,
            drug_2: existing,
            severity: data[0].severity,
            effect: data[0].clinical_effect,
            recommendation: data[0].recommendation,
          });
        }
      }
    } catch (err) {
      console.error("Failed to check medication interactions:", err);
    }

    return interactions;
  };

  /**
   * Check if patient has critical allergies
   */
  const getCriticalAllergies = (): PatientAllergyAlert[] => {
    if (!context) return [];
    return context.allergies.filter((a) => a.severity === "severe");
  };

  /**
   * Get active medications (not discontinued)
   */
  const getActiveMedications = (): PatientMedication[] => {
    if (!context) return [];
    return context.current_medications.filter((m) => m.status === "active");
  };

  /**
   * Get abnormal lab results
   */
  const getAbnormalLabs = (): PatientLabResult[] => {
    if (!context) return [];
    return context.recent_labs.filter((l) => l.status !== "normal");
  };

  return {
    context,
    loading,
    error,
    refetch: fetchPatientContext,
    checkMedicationInteraction,
    getCriticalAllergies,
    getActiveMedications,
    getAbnormalLabs,
  };
}
