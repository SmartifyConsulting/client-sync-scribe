import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBiologOwner } from "../useBiolog";
import {
  AgeingConfig,
  AgeingInsightRow,
  BiologicalAgeAssessment,
  DEFAULT_AGEING_CONFIG,
} from "./types";

const db = supabase as any;

export function useAgeingConfig() {
  return useQuery({
    queryKey: ["biolog-ageing-config"],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<AgeingConfig> => {
      const { data, error } = await db.from("biolog_ageing_config").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return (data as AgeingConfig) || DEFAULT_AGEING_CONFIG;
    },
  });
}

export function useAgeingAssessments(ownerUserId?: string) {
  const { owner, isOwn } = useBiologOwner(ownerUserId);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["biolog-ageing-assessments", owner],
    enabled: !!owner,
    queryFn: async (): Promise<BiologicalAgeAssessment[]> => {
      const { data, error } = await db
        .from("biolog_biological_age_assessments")
        .select("*")
        .eq("patient_user_id", owner)
        .order("assessment_date", { ascending: false });
      if (error) throw error;
      return (data || []) as BiologicalAgeAssessment[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["biolog-ageing-assessments", owner] });

  const addAssessment = useMutation({
    mutationFn: async (payload: Partial<BiologicalAgeAssessment>) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db.from("biolog_biological_age_assessments").insert({
        ...payload,
        patient_user_id: owner,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteAssessment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("biolog_biological_age_assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    owner,
    isOwn,
    assessments: query.data || [],
    loading: query.isLoading,
    addAssessment,
    deleteAssessment,
  };
}

export function useAgeingInsights(ownerUserId?: string) {
  const { owner } = useBiologOwner(ownerUserId);
  return useQuery({
    queryKey: ["biolog-ageing-insights", owner],
    enabled: !!owner,
    queryFn: async (): Promise<AgeingInsightRow[]> => {
      const { data, error } = await db
        .from("biolog_ageing_insights")
        .select("*")
        .eq("patient_user_id", owner)
        .eq("status", "active")
        .order("generated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AgeingInsightRow[];
    },
  });
}

/** Date of birth for the owner, used for the chronological age display. */
export function useOwnerDob(ownerUserId?: string) {
  const { owner } = useBiologOwner(ownerUserId);
  return useQuery({
    queryKey: ["biolog-ageing-dob", owner],
    enabled: !!owner,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await db
        .from("patients")
        .select("dob")
        .eq("user_id", owner)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.dob as string) || null;
    },
  });
}

/** Uploads a private laboratory report and returns its storage path. */
export async function uploadAgeingReport(file: File): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("You must be signed in to upload a report.");
  const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
  const { error } = await supabase.storage.from("biolog-ageing-reports").upload(path, file);
  if (error) throw error;
  return path;
}

export async function signedReportUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("biolog-ageing-reports").createSignedUrl(path, 300);
  if (error) return null;
  return data?.signedUrl ?? null;
}
