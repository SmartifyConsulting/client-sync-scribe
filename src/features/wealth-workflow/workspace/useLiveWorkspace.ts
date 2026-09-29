import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useWorkflowAudit, useWorkflowBlockers } from "../hooks";
import { useWorkflowMap } from "../map/useWorkflowMap";
import {
  MILESTONE, NEXT_COPY, REQUIREMENT_RULES, STAGE_TO_GROUP, priorityFor, type Priority,
} from "./rules";
import { useWorkflowRealtime } from "./useWorkflowRealtime";

export type ItemKind = "task" | "requirement" | "decision" | "present" | "annual_review" | "next" | "message";

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

  // Unanswered client question (existing messages)
  const { data: unread } = useQuery({
    queryKey: ["wealth-client-question", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("messages").select("id,subject,content,created_at")
        .eq("patient_id", patientId!).eq("recipient_id", u.user.id).eq("is_read", false)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  // Previous cycle's position (for annual review)
  const { data: prior } = useQuery({
    queryKey: ["wealth-prior-cycle", wf?.previous_workflow_id],
    enabled: !!(wf as any)?.previous_workflow_id,
    queryFn: async () => {
      const db = supabase as any;
      const pid = (wf as any).previous_workflow_id;
      const [r, a] = await Promise.all([
        db.from("wealth_recommendations").select("title,version").eq("workflow_id", pid).eq("status", "accepted").order("version", { ascending: false }).limit(1).maybeSingle(),
        db.from("wealth_applications").select("product,provider").eq("workflow_id", pid).eq("status", "issued").limit(1).maybeSingle(),
      ]);
      return { rec: r.data, app: a.data };
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

    // Client question awaiting response
    if (unread) now.push({
      id: `msg-${unread.id}`, kind: "message", what: `Client question: ${unread.subject || (unread.content ?? "").slice(0, 60)}`,
      who: "wealth_manager", due: unread.created_at, priority: "due_today", why: "The client is waiting for your reply.", next: "The client gets an answer.", group,
    });

    // Quote expiring (only where an expiry date is recorded)
    recs.filter((r: any) => r.quote_expires_at && ["draft", "presented"].includes(r.status)).forEach((r: any) => {
      const d = differenceInCalendarDays(new Date(r.quote_expires_at), new Date());
      if (d <= 7) now.push({
        id: `exp-${r.id}`, kind: "next", what: d < 0 ? `Quote for v${r.version} has expired` : `Quote for v${r.version} expires in ${d} day${d === 1 ? "" : "s"}`,
        who: "wealth_manager", due: r.quote_expires_at, priority: priorityFor(r.quote_expires_at, "due_soon"),
        why: "Expired quotes must be re-issued before the client can proceed.", next: "Re-quote or obtain the decision before expiry.", group: "quotes",
      });
    });

    // Provider response received (last 7 days)
    (m.records?.apps ?? []).forEach((a: any) => {
      const at = a.issued_at ?? a.updated_at;
      if (["issued", "declined", "accepted"].includes(a.status) && at && differenceInCalendarDays(new Date(), new Date(at)) <= 7) {
        now.push({
          id: `prov-${a.id}`, kind: "next", what: `${a.provider ?? "Provider"} response: ${a.status}${a.product ? ` (${a.product})` : ""}`,
          who: "wealth_manager", due: at, priority: "normal", why: "The insurer has responded to the application.",
          next: a.status === "issued" ? "Share the policy schedule with the client." : "Discuss the outcome with the client.", group: "issuance",
        });
      }
    });

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
