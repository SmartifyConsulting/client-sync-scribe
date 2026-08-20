import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SafetyCheckResult {
  isSafe: boolean;
  warnings: string[];
  blocks: string[];
  checkSummary: string;
}

export function useMedicationSafety(patientUserId: string | null) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateMedication = useCallback(
    async (medicationName: string): Promise<SafetyCheckResult | null> => {
      if (!patientUserId) return null;

      setChecking(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          "validate_medication_safety",
          {
            p_patient_id: patientUserId,
            p_medication_name: medicationName,
            p_prescribed_by: null,
          }
        );

        if (rpcError) {
          setError(rpcError.message);
          return null;
        }

        if (data && data.length > 0) {
          return {
            isSafe: data[0].is_safe,
            warnings: data[0].warnings || [],
            blocks: data[0].blocks || [],
            checkSummary: data[0].check_summary,
          };
        }

        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return null;
      } finally {
        setChecking(false);
      }
    },
    [patientUserId]
  );

  const checkAllergyConflicts = useCallback(
    async (medicationName: string) => {
      if (!patientUserId) return [];

      const { data, error: rpcError } = await supabase.rpc(
        "check_allergy_conflicts",
        {
          p_patient_id: patientUserId,
          p_medication_name: medicationName,
        }
      );

      if (rpcError) {
        console.error("Allergy check error:", rpcError);
        return [];
      }

      return data || [];
    },
    [patientUserId]
  );

  const checkDrugInteractions = useCallback(
    async (medicationName: string) => {
      if (!patientUserId) return [];

      const { data, error: rpcError } = await supabase.rpc(
        "check_drug_interactions",
        {
          p_patient_id: patientUserId,
          p_new_medication: medicationName,
        }
      );

      if (rpcError) {
        console.error("Drug interaction check error:", rpcError);
        return [];
      }

      return data || [];
    },
    [patientUserId]
  );

  return {
    validateMedication,
    checkAllergyConflicts,
    checkDrugInteractions,
    checking,
    error,
  };
}
