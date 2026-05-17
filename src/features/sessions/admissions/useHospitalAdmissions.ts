import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HospitalAdmission {
  id: string;
  patient_id: string;
  doctor_id: string;
  document_id: string | null;
  hospital: string | null;
  admission_date: string;
  discharge_date: string | null;
  diagnosis: string | null;
  procedure_description: string | null;
  status: string;
  hospital_provider_id?: string | null;
  created_at: string;
  updated_at: string;
}

export function useHospitalAdmissions(patientId?: string) {
  return useQuery({
    queryKey: ["hospital-admissions", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_admissions")
        .select("*")
        .eq("patient_id", patientId!)
        .order("admission_date", { ascending: false });
      if (error) throw error;
      return (data || []) as HospitalAdmission[];
    },
  });
}

export function useAdmissionVitals(admissionId?: string) {
  return useQuery({
    queryKey: ["admission-vitals", admissionId],
    enabled: !!admissionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_vitals")
        .select("*")
        .eq("admission_id", admissionId!)
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAdmissionMedications(admissionId?: string) {
  return useQuery({
    queryKey: ["admission-medications", admissionId],
    enabled: !!admissionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_medications")
        .select("*")
        .eq("admission_id", admissionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAdmissionLabResults(admissionId?: string) {
  return useQuery({
    queryKey: ["admission-lab-results", admissionId],
    enabled: !!admissionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_lab_results")
        .select("*")
        .eq("admission_id", admissionId!)
        .order("result_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAdmissionImaging(admissionId?: string) {
  return useQuery({
    queryKey: ["admission-imaging", admissionId],
    enabled: !!admissionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_imaging")
        .select("*")
        .eq("admission_id", admissionId!)
        .order("performed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useInvalidateAdmissionChildren() {
  const qc = useQueryClient();
  return (admissionId: string) => {
    qc.invalidateQueries({ queryKey: ["admission-vitals", admissionId] });
    qc.invalidateQueries({ queryKey: ["admission-medications", admissionId] });
    qc.invalidateQueries({ queryKey: ["admission-lab-results", admissionId] });
    qc.invalidateQueries({ queryKey: ["admission-imaging", admissionId] });
  };
}
