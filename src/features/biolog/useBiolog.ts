import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  BiologCorrelationRow,
  BiologEntry,
  BiologExercise,
  BiologFood,
  BiologMedication,
  BiologPayload,
  BiologProgramme,
  BiologProgrammeAssignment,
  BiologSection,
  DEFAULT_SECTIONS,
  EMPTY_PAYLOAD,
} from "./types";

const db = supabase as any;

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** The user whose biolog we're looking at — self by default, a patient for doctors. */
export function useBiologOwner(ownerUserId?: string) {
  const { user } = useAuth();
  const owner = ownerUserId || user?.id || null;
  return { owner, isOwn: !!owner && owner === user?.id };
}

export function useBiologSections(ownerUserId?: string) {
  const { owner, isOwn } = useBiologOwner(ownerUserId);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["biolog-sections", owner],
    enabled: !!owner,
    queryFn: async () => {
      const { data, error } = await db
        .from("biolog_sections")
        .select("*")
        .eq("user_id", owner)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as BiologSection[];
    },
  });

  // Seed the starter set the first time somebody opens their own biolog.
  useEffect(() => {
    if (!isOwn || !owner || query.isLoading || (query.data?.length ?? 0) > 0) return;
    (async () => {
      const rows = DEFAULT_SECTIONS.map((s, i) => ({
        user_id: owner,
        key: s.key,
        label: s.label,
        group_name: s.group_name,
        sort_order: i,
      }));
      await db.from("biolog_sections").upsert(rows, { onConflict: "user_id,key" });
      qc.invalidateQueries({ queryKey: ["biolog-sections", owner] });
    })();
  }, [isOwn, owner, query.isLoading, query.data?.length, qc]);

  return query;
}

export function useSaveSection(ownerUserId?: string) {
  const { owner } = useBiologOwner(ownerUserId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<BiologSection> & { key: string; label: string }) => {
      const { error } = await db.from("biolog_sections").upsert(
        {
          user_id: owner,
          key: input.key,
          label: input.label,
          group_name: input.group_name ?? "physical",
          enabled: input.enabled ?? true,
          sort_order: input.sort_order ?? 99,
          is_custom: input.is_custom ?? true,
        },
        { onConflict: "user_id,key" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biolog-sections", owner] }),
  });
}

export function useDeleteSection(ownerUserId?: string) {
  const { owner } = useBiologOwner(ownerUserId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("biolog_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biolog-sections", owner] }),
  });
}

function useSimpleList<T>(table: string, key: string, ownerUserId?: string, orderBy = "name") {
  const { owner } = useBiologOwner(ownerUserId);
  return useQuery({
    queryKey: [key, owner],
    enabled: !!owner,
    queryFn: async () => {
      const { data, error } = await db
        .from(table)
        .select("*")
        .eq("user_id", owner)
        .order(orderBy);
      if (error) throw error;
      return (data || []) as T[];
    },
  });
}

export const useBiologFoods = (owner?: string) =>
  useSimpleList<BiologFood>("biolog_foods", "biolog-foods", owner);
export const useBiologExercises = (owner?: string) =>
  useSimpleList<BiologExercise>("biolog_exercises", "biolog-exercises", owner);
export const useBiologMedications = (owner?: string) =>
  useSimpleList<BiologMedication>("biolog_medications", "biolog-medications", owner, "label");

export function useAddLibraryItem(
  table: "biolog_foods" | "biolog_exercises" | "biolog_medications",
  queryKey: string,
  ownerUserId?: string,
) {
  const { owner } = useBiologOwner(ownerUserId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await db.from(table).insert({ ...values, user_id: owner });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey, owner] }),
  });
}

export function useRemoveLibraryItem(
  table: "biolog_foods" | "biolog_exercises" | "biolog_medications",
  queryKey: string,
  ownerUserId?: string,
) {
  const { owner } = useBiologOwner(ownerUserId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey, owner] }),
  });
}

export function useBiologEntries(ownerUserId?: string, days = 120) {
  const { owner } = useBiologOwner(ownerUserId);
  return useQuery({
    queryKey: ["biolog-entries", owner, days],
    enabled: !!owner,
    queryFn: async () => {
      const from = new Date();
      from.setDate(from.getDate() - days);
      const { data, error } = await db
        .from("biolog_entries")
        .select("*")
        .eq("user_id", owner)
        .gte("entry_date", from.toISOString().slice(0, 10))
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        payload: { ...EMPTY_PAYLOAD, ...(row.payload || {}) },
      })) as BiologEntry[];
    },
  });
}

export function useBiologEntry(date: string, ownerUserId?: string) {
  const { owner } = useBiologOwner(ownerUserId);
  return useQuery({
    queryKey: ["biolog-entry", owner, date],
    enabled: !!owner,
    queryFn: async () => {
      const { data, error } = await db
        .from("biolog_entries")
        .select("*")
        .eq("user_id", owner)
        .eq("entry_date", date)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        payload: { ...EMPTY_PAYLOAD, ...(data.payload || {}) },
      } as BiologEntry;
    },
  });
}

export function useSaveEntry(ownerUserId?: string) {
  const { owner } = useBiologOwner(ownerUserId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { date: string; payload: BiologPayload; note?: string | null }) => {
      const { error } = await db.from("biolog_entries").upsert(
        {
          user_id: owner,
          entry_date: input.date,
          payload: input.payload,
          note: input.note ?? null,
        },
        { onConflict: "user_id,entry_date" },
      );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["biolog-entry", owner, vars.date] });
      qc.invalidateQueries({ queryKey: ["biolog-entries", owner] });
    },
  });
}

export function useBiologCorrelations(ownerUserId?: string) {
  const { owner } = useBiologOwner(ownerUserId);
  return useQuery({
    queryKey: ["biolog-correlations", owner],
    enabled: !!owner,
    queryFn: async () => {
      const { data, error } = await db
        .from("biolog_correlations")
        .select("*")
        .eq("user_id", owner)
        .order("created_at");
      if (error) throw error;
      return (data || []) as BiologCorrelationRow[];
    },
  });
}

export function useSaveCorrelation(ownerUserId?: string) {
  const { owner } = useBiologOwner(ownerUserId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<BiologCorrelationRow> & { title: string; input_variable: string; outcome_variables: string[] }) => {
      const payload = {
        user_id: owner,
        title: input.title,
        group_name: input.group_name ?? "Custom",
        input_variable: input.input_variable,
        outcome_variables: input.outcome_variables,
        enabled: input.enabled ?? true,
        is_custom: input.is_custom ?? true,
      };
      const { error } = input.id
        ? await db.from("biolog_correlations").update(payload).eq("id", input.id)
        : await db.from("biolog_correlations").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biolog-correlations", owner] }),
  });
}

export function useDeleteCorrelation(ownerUserId?: string) {
  const { owner } = useBiologOwner(ownerUserId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("biolog_correlations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biolog-correlations", owner] }),
  });
}

export function useBiologProgrammes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["biolog-programmes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("biolog_programmes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as BiologProgramme[];
    },
  });
}

export function useSaveProgramme() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<BiologProgramme> & { name: string }) => {
      const payload = {
        created_by: user?.id,
        name: input.name,
        description: input.description ?? null,
        kind: input.kind ?? "mixed",
        duration_days: input.duration_days ?? 30,
        targets: input.targets ?? [],
      };
      const { error } = input.id
        ? await db.from("biolog_programmes").update(payload).eq("id", input.id)
        : await db.from("biolog_programmes").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biolog-programmes"] }),
  });
}

export function useDeleteProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("biolog_programmes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biolog-programmes"] }),
  });
}

export function useProgrammeAssignments(ownerUserId?: string) {
  const { owner } = useBiologOwner(ownerUserId);
  return useQuery({
    queryKey: ["biolog-assignments", owner],
    enabled: !!owner,
    queryFn: async () => {
      const { data, error } = await db
        .from("biolog_programme_assignments")
        .select("*, programme:biolog_programmes(*)")
        .eq("patient_user_id", owner)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data || []) as BiologProgrammeAssignment[];
    },
  });
}

export function useAssignProgramme(ownerUserId?: string) {
  const { user } = useAuth();
  const { owner } = useBiologOwner(ownerUserId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { programmeId: string; patientUserId?: string; startDate?: string }) => {
      const { error } = await db.from("biolog_programme_assignments").insert({
        programme_id: input.programmeId,
        patient_user_id: input.patientUserId ?? owner,
        assigned_by: user?.id,
        start_date: input.startDate ?? todayISO(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biolog-assignments"] }),
  });
}

export function useEndAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("biolog_programme_assignments")
        .update({ status: "completed", end_date: todayISO() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["biolog-assignments"] }),
  });
}
