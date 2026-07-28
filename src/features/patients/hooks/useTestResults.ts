import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TestType = "blood" | "radiology" | "xray" | "other";

export interface TestResult {
  id: string;
  patient_id: string;
  test_type: TestType;
  test_name: string;
  result_date: string;
  content: string | null;
  media_url: string | null;
  submitted_by: string;
  submitted_by_user_id: string | null;
  created_by: string;
  created_at: string;
}

export function useTestResults(patientId?: string) {
  return useQuery({
    queryKey: ["test-results", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("test_results") as any)
        .select("*")
        .eq("patient_id", patientId!)
        .order("result_date", { ascending: false });
      if (error) throw error;
      return (data || []) as TestResult[];
    },
  });
}

export function useAddTestResult(patientId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      testType: TestType;
      testName: string;
      resultDate: string;
      content?: string;
      submittedBy: string;
      notifyDoctorId?: string | null;
      notifyPatientUserId?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase.from("test_results") as any)
        .insert({
          patient_id: patientId,
          test_type: input.testType,
          test_name: input.testName,
          result_date: input.resultDate,
          content: input.content ?? null,
          submitted_by: input.submittedBy,
          submitted_by_user_id: user.id,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      const notifyTargets = [input.notifyDoctorId, input.notifyPatientUserId].filter(Boolean) as string[];
      if (notifyTargets.length > 0) {
        await (supabase.from("notifications") as any).insert(
          notifyTargets.map((userId) => ({
            user_id: userId,
            type: "test_result_received",
            title: "New test result",
            description: `${input.testName} (${input.testType}) submitted by ${input.submittedBy}`,
            reference_id: data.id,
          })),
        );
      }

      return data as TestResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-results", patientId] });
    },
  });
}
