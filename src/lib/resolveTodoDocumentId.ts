import { supabase } from "@/integrations/supabase/client";
import type { TodoKind } from "@/lib/todoDisplay";

/** Task kinds that always represent a generated document the user can preview. */
export const DOCUMENT_TODO_KINDS: TodoKind[] = [
  "invoice",
  "prescription",
  "medical_certificate",
  "referral",
  "laboratory",
  "recommendation",
];

const KIND_MATCHERS: Partial<Record<TodoKind, string[]>> = {
  invoice: ["invoice"],
  prescription: ["prescription"],
  medical_certificate: ["certificate", "sick note"],
  referral: ["referral"],
  laboratory: ["lab", "pathology"],
  recommendation: ["letter", "recommendation"],
};

export function isDocumentTodoKind(kind: TodoKind): boolean {
  return DOCUMENT_TODO_KINDS.includes(kind);
}

/**
 * Best-effort lookup of the document behind a document-review task that has no
 * document_id stored (older / AI-created tasks). Matches on the task's patient
 * and the document type, preferring the document closest to the task date.
 */
export async function resolveTodoDocumentId(todo: {
  document_id?: string | null;
  patient_id?: string | null;
  session_id?: string | null;
  due_date?: string | null;
  created_at?: string | null;
}, kind: TodoKind): Promise<string | null> {
  if (todo.document_id) return todo.document_id;
  if (!todo.patient_id && !todo.session_id) return null;

  let query = supabase
    .from("documents")
    .select("id, template_name, name, created_at, session_id, patient_id")
    .order("created_at", { ascending: false })
    .limit(50);

  if (todo.patient_id) query = query.eq("patient_id", todo.patient_id);
  else if (todo.session_id) query = query.eq("session_id", todo.session_id);

  const { data } = await query;
  if (!data?.length) return null;

  const matchers = KIND_MATCHERS[kind] || [];
  const typeMatches = matchers.length
    ? data.filter((d: any) => {
        const hay = `${d.template_name || ""} ${d.name || ""}`.toLowerCase();
        return matchers.some((m) => hay.includes(m));
      })
    : data;
  const pool = typeMatches.length ? typeMatches : [];
  if (!pool.length) return null;

  if (todo.session_id) {
    const sameSession = pool.find((d: any) => d.session_id === todo.session_id);
    if (sameSession) return sameSession.id;
  }

  const anchor = new Date(todo.due_date || todo.created_at || Date.now()).getTime();
  const closest = pool.reduce((best: any, d: any) => {
    const delta = Math.abs(new Date(d.created_at).getTime() - anchor);
    return !best || delta < best.delta ? { id: d.id, delta } : best;
  }, null as null | { id: string; delta: number });

  return closest?.id ?? null;
}
