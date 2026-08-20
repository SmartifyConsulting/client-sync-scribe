import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PatientSearchResult = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  admission_status: string;
  admission_id: string | null;
  incident_id: string | null;
  incident_number: string | null;
};

interface UsePatientSearchProps {
  hospitalId: string;
  enabled?: boolean;
}

/**
 * Hook to search for patients by name/phone in a hospital context
 * Used by hospital staff to find patient profiles during admissions
 */
export function usePatientSearch({ hospitalId, enabled = true }: UsePatientSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search to avoid excessive queries
  useEffect(() => {
    if (!enabled || !query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchPatients();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, hospitalId, enabled]);

  const searchPatients = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.rpc(
        "search_patients_for_hospital",
        {
          p_query: query.trim(),
          p_hospital_id: hospitalId,
        }
      );

      if (err) {
        throw err;
      }

      setResults((data as PatientSearchResult[]) || []);

      // Log search for audit
      if (data && data.length > 0) {
        await logPatientAccess("patient_search", data[0].user_id);
      }
    } catch (err) {
      console.error("Patient search error:", err);
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const logPatientAccess = async (accessType: string, patientUserId: string) => {
    try {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) return;

      await supabase.from("patient_context_access_log").insert({
        staff_user_id: userAuth.user.id,
        patient_user_id: patientUserId,
        hospital_id: hospitalId,
        access_type: accessType,
      });
    } catch (err) {
      console.error("Failed to log patient access:", err);
      // Don't throw - logging errors shouldn't break the app
    }
  };

  const linkAdmissionToPatient = async (
    admissionId: string,
    patientUserId: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.rpc(
        "link_admission_to_patient",
        {
          p_admission_id: admissionId,
          p_patient_user_id: patientUserId,
        }
      );

      if (err) {
        throw err;
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) {
        throw new Error(result?.message || "Failed to link patient");
      }

      // Log the link action
      await logPatientAccess("admission_link", patientUserId);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to link patient";
      setError(message);
      console.error("Admission link error:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    searchPatients,
    linkAdmissionToPatient,
    clearResults: () => setResults([]),
  };
}
