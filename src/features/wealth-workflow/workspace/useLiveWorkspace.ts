import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useWorkflowAudit, useWorkflowBlockers } from "../hooks";
import { useWorkflowMap } from "../map/useWorkflowMap";
import {
  MILESTONE, NEXT_COPY, REQUIREMENT_RULES, STAGE_TO_GROUP, priorityFor, type Priority,
} from "./rules";
import { useWorkflowRealtime } from "./useWorkflowRealtime";

export type ItemKind = "task" | "requirement" | "decision" | "present" | "annual_review" | "next";

export interface WorkspaceItem {
  id: string;
  kind: ItemKind;
  what: string;
  who: string;
  due?: string | null;
  priority: Priority;
  why?: string;
  next?: string;
  group: string;
  todoId?: string;
  recommendationId?: string;
  documentId?: string | null;
}

export function useLiveWorkspace(patientId?: string) {
  const m = useWorkflowMap(patientId);
  const wf = m.workflow;
  useWorkflowRealtime(patientId, wf?.id);
  const { data: audit = [] } = useWorkflowAudit(wf?.id);
  const curDef = m.defs.find((d) => d.stage === wf?.current_stage);
  const nextStage = curDef?.next_stages.find((s) => !["closed_declined", "recommendation", "consultation"].includes(s)) ?? curDef?.next_stages[0];
  const { data: nextBlockers = [] } = useWorkflowBlockers(wf?.id, nextStage as any);

  const { data: lastSession } = useQuery({
    queryKey: ["wealth-last-session", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await supabase.from("sessions").select("id,title,started_at,created_at")
        .eq("patient_id", patientId!).neq("status", "paused").order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const now: WorkspaceItem[] = [];
  const next: WorkspaceItem[] = [];
  const waiting: WorkspaceItem[] = [];
  const blocked: { stage: string; group: string; missing: WorkspaceItem[] }[] = [];
  const completed: { id: string; label: string; clientLabel?: string; at: string }[] = [];

  if (wf) {
    const stage = wf.current_stage;
    const group = STAGE_TO_GROUP[stage] ?? "gateway";
    const recs = m.recs;
    const presented = recs.find((r) => r.status === "presented");
    const draft = recs.find((r) => r.status === "draft");

    // Engine-driven items
    if (stage === "client_decision" && presented) {
      const it: WorkspaceItem = {
        id: `dec-${presented.id}`, kind: "decision", what: `Recommendation v${presented.version} awaiting decision`, who: "client",
        priority: "waiting", why: "Documentation cannot start until the client decides.", next: "Accepted → Documentation. Changes → new ROA version.",
        group, recommendationId: presented.id, documentId: presented.roa_document_id,
      };
      now.push(it); waiting.push(it);
    }
    if (stage === "recommendation" && draft) {
      now.push({
        id: `pres-${draft.id}`, kind: "present", what: draft.roa_document_id ? `Present recommendation v${draft.version}` : `Attach ROA to recommendation v${draft.version}`,
        who: "wealth_manager", priority: "normal", why: "The client needs the ROA to decide.", next: "Client decision opens.",
        group, recommendationId: draft.id, documentId: draft.roa_document_id,
      });
    }
    if (stage === "underwriting") waiting.push({ id: "uw", kind: "next", what: "Underwriting decision", who: "provider", priority: "waiting", why: "The insurer is assessing the application.", next: "Submission.", group });
    if (stage === "submission") waiting.push({ id: "issue", kind: "next", what: "Policy confirmation", who: "provider", priority: "waiting", why: "The insurer must confirm issue.", next: "Follow-up and annual review get scheduled.", group });

    // Blockers (exact missing items)
    const blockList: string[] = wf.status === "blocked" && wf.blockers.length ? wf.blockers : nextBlockers;
    if (blockList.length) {
      const missing = blockList.map((b): WorkspaceItem => {
        const r = REQUIREMENT_RULES[b];
        return { id: `req-${b}`, kind: "requirement", what: b, who: r?.owner ?? "wealth_manager", priority: "blocked", why: r?.why, next: r?.next, group: r?.group ?? group };
      });
      const target = m.defs.find((d) => d.stage === (wf.status === "blocked" ? stage : nextStage))?.label ?? stage;
      blocked.push({ stage: target, group, missing });
      missing.forEach((i) => (i.who === "client" || i.who === "provider" ? waiting.push({ ...i, priority: "waiting" }) : now.push(i)));
    }

    // Next move
    if (NEXT_COPY[stage] && wf.status !== "closed_declined") {
      next.push({
        id: "next-stage", kind: "next", what: NEXT_COPY[stage], who: m.defs.find((d) => d.stage === nextStage)?.owner_role ?? "wealth_manager",
        priority: blockList.length ? "blocked" : "normal",
        why: blockList.length ? `Ready once: ${blockList.join(", ")}` : "Nothing is blocking this step.",
        next: m.defs.find((d) => d.stage === nextStage)?.label, group: STAGE_TO_GROUP[nextStage ?? ""] ?? group,
      });
    }

    // Annual review
    if (wf.next_review_date) {
      const days = differenceInCalendarDays(new Date(wf.next_review_date), new Date());
      if (days <= 60) {
        (days <= 14 ? now : next).push({
          id: "annual", kind: "annual_review", what: "Annual review due", who: "wealth_manager", due: wf.next_review_date,
          priority: priorityFor(wf.next_review_date), why: "Reassess needs and cover every 12 months.", next: "A new consultation cycle starts.", group: "issuance",
        });
      }
    }

    // Tasks
    m.openTasks.forEach((t) => {
      const who = t.owner_role ?? "wealth_manager";
      const pr = priorityFor(t.due_date);
      const it: WorkspaceItem = {
        id: `t-${t.id}`, kind: "task", what: t.title, who, due: t.due_date, priority: pr,
        why: t.workflow_stage ? `Part of ${m.defs.find((d) => d.stage === t.workflow_stage)?.label ?? t.workflow_stage}` : undefined,
        next: t.workflow_stage ? NEXT_COPY[t.workflow_stage] : undefined,
        group: STAGE_TO_GROUP[t.workflow_stage] ?? group, todoId: t.id,
      };
      if (who !== "wealth_manager" && who !== "system") waiting.push({ ...it, priority: pr === "normal" ? "waiting" : pr });
      else if (pr === "overdue" || pr === "due_today") now.push(it);
      else next.push(it);
    });

    // Completed milestones
    audit.forEach((a) => {
      const ms = MILESTONE[a.to_stage];
      if (ms && a.from_stage) completed.push({ id: a.id, label: ms.wm, clientLabel: ms.client, at: a.created_at });
    });
    (m.records?.tasks ?? []).filter((t: any) => t.status === "completed").forEach((t: any) =>
      completed.push({ id: `tc-${t.id}`, label: t.title, at: t.due_date ?? "" }),
    );
  }

  const rank: Record<Priority, number> = { overdue: 0, due_today: 1, blocked: 2, due_soon: 3, waiting: 4, normal: 5 };
  now.sort((a, b) => rank[a.priority] - rank[b.priority]);

  return { ...m, lastSession, nextStage, now, next, waiting, blocked, completed: completed.slice(0, 10) };
}
