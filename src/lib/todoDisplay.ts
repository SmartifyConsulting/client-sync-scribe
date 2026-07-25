import {
  Receipt,
  Pill,
  CalendarDays,
  Phone,
  FileText,
  Award,
  FlaskConical,
  ArrowUpRight,
  Mail,
  Users,
  CreditCard,
  Hospital,
  Bell,
  AlertTriangle,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import i18n from "@/i18n";

export type TodoKind =
  | "invoice"
  | "prescription"
  | "appointment"
  | "follow_up"
  | "recommendation"
  | "medical_certificate"
  | "referral"
  | "laboratory"
  | "email"
  | "phone"
  | "meeting"
  | "payment"
  | "claim"
  | "reminder"
  | "urgent"
  | "task";

export interface TodoDisplayInput {
  title: string;
  patient_name?: string | null;
  due_date?: string | null;
  task_type?: string | null;
  template_name?: string | null;
}

export interface TodoDisplay {
  kind: TodoKind;
  icon: LucideIcon;
  shortLabel: string;
  patient?: string;
  date?: string;
  time?: string;
  duration?: string;
}

const ICON_MAP: Record<TodoKind, LucideIcon> = {
  invoice: Receipt,
  prescription: Pill,
  appointment: CalendarDays,
  follow_up: Phone,
  recommendation: FileText,
  medical_certificate: Award,
  laboratory: FlaskConical,
  referral: ArrowUpRight,
  email: Mail,
  phone: Phone,
  meeting: Users,
  payment: CreditCard,
  claim: Hospital,
  reminder: Bell,
  urgent: AlertTriangle,
  task: CheckSquare,
};

const LABEL_KEY: Record<TodoKind, string> = {
  invoice: "todo.kinds.invoice",
  prescription: "todo.kinds.prescription",
  appointment: "todo.kinds.appointment",
  follow_up: "todo.kinds.followUp",
  recommendation: "todo.kinds.recommendation",
  medical_certificate: "todo.kinds.medicalCertificate",
  laboratory: "todo.kinds.laboratory",
  referral: "todo.kinds.referral",
  email: "todo.kinds.email",
  phone: "todo.kinds.phone",
  meeting: "todo.kinds.meeting",
  payment: "todo.kinds.payment",
  claim: "todo.kinds.claim",
  reminder: "todo.kinds.reminder",
  urgent: "todo.kinds.urgent",
  task: "todo.kinds.task",
};

function detectKind(input: TodoDisplayInput): TodoKind {
  const t = (input.title || "").toLowerCase();
  const tpl = (input.template_name || "").toLowerCase();
  const tt = (input.task_type || "").toLowerCase();
  const all = `${t} ${tpl} ${tt}`;

  if (/\binvoice\b/.test(all)) return "invoice";
  if (/\bprescription\b/.test(all)) return "prescription";
  if (/\b(medical\s*certificate|sick\s*note)\b/.test(all)) return "medical_certificate";
  if (/\b(referral)\b/.test(all)) return "referral";
  if (/\b(lab(oratory)?|pathology|blood\s*test)\b/.test(all)) return "laboratory";
  if (/\b(recommendation|letter)\b/.test(all)) return "recommendation";
  if (/\b(follow[-\s]?up)\b/.test(all)) return "follow_up";
  if (/\b(appointment|schedule)\b/.test(all)) return "appointment";
  if (/\b(meeting|round\s*table)\b/.test(all)) return "meeting";
  if (/\b(payment|pay|invoice\s*due)\b/.test(all)) return "payment";
  if (/\b(claim|admission)\b/.test(all)) return "claim";
  if (/\b(email)\b/.test(all)) return "email";
  if (/\b(call|phone)\b/.test(all)) return "phone";
  if (/\burgent\b/.test(all)) return "urgent";
  if (/\breminder\b/.test(all)) return "reminder";
  return "task";
}

function extractPatient(title: string): string | undefined {
  // "... — Sharon Kennedy" | "... - Sharon Kennedy" | "... with Sarah Johnson" | "... for Sharon Kennedy"
  const m =
    title.match(/[—-]\s+([A-Z][\p{L}'.-]+(?:\s+[A-Z][\p{L}'.-]+)+)\s*$/u) ||
    title.match(/\bwith\s+([A-Z][\p{L}'.-]+(?:\s+[A-Z][\p{L}'.-]+)+)/u) ||
    title.match(/\bfor\s+([A-Z][\p{L}'.-]+(?:\s+[A-Z][\p{L}'.-]+)+)/u);
  return m?.[1]?.trim();
}

function extractDateTime(input: TodoDisplayInput): {
  date?: string;
  time?: string;
  duration?: string;
} {
  const out: { date?: string; time?: string; duration?: string } = {};

  // Duration: (30 min) / (1 hr)
  const dur = input.title.match(/\((\d+)\s*(min|mins|minutes|hr|hrs|hour|hours)\)/i);
  if (dur) {
    const n = dur[1];
    const unit = dur[2].toLowerCase().startsWith("h") ? "h" : "min";
    out.duration = `${n} ${unit}`;
  }

  // Time: HH:mm (24h) — take the last match to avoid picking a code
  const timeMatches = [...input.title.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)];
  if (timeMatches.length > 0) {
    const [, h, m] = timeMatches[timeMatches.length - 1];
    out.time = `${h.padStart(2, "0")}:${m}`;
  }

  // Date: prefer due_date, else ISO in title
  let dateObj: Date | undefined;
  if (input.due_date) {
    const d = parseISO(input.due_date);
    if (isValid(d)) dateObj = d;
  }
  if (!dateObj) {
    const iso = input.title.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (iso) {
      const d = parseISO(iso[1]);
      if (isValid(d)) dateObj = d;
    }
  }
  if (dateObj) {
    out.date = format(dateObj, "d MMM");
    if (!out.time) {
      const hh = dateObj.getHours();
      const mm = dateObj.getMinutes();
      if (hh !== 0 || mm !== 0) {
        out.time = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      }
    }
  }

  return out;
}

export function getTodoDisplay(input: TodoDisplayInput): TodoDisplay {
  const kind = detectKind(input);
  const icon = ICON_MAP[kind];
  const shortLabel = i18n.t(LABEL_KEY[kind]);
  const patient = input.patient_name?.trim() || extractPatient(input.title || "");
  const { date, time, duration } = extractDateTime(input);
  return { kind, icon, shortLabel, patient, date, time, duration };
}
