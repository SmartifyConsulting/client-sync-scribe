import { Link, useNavigate } from "react-router-dom";
import {
  FolderOpen,
  FlaskConical,
  ListChecks,
  BedDouble,
  Lock,
  Heart,
  Wallet as Pill,
  Sparkles,
  TrendingUp,
  Smile,
  Moon,
  Zap,
  TrendingUp as Activity,
  CalendarDays,
  ChevronRight,
  Leaf,
  ChevronDown,
  MessageSquare,
  type LucideIcon,
  HeartHandshake,
  Users2,
  ShieldCheck,
  Wallet as WalletIcon,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolvePermissions } from "@/features/patients/lib/careTeamPermissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PatientHeroCard } from "@/components/dashboard/PatientHeroCard";
import { Panel } from "@/components/ui/Panel";
import { ClientAISummary } from "@/features/wealth-workflow/client/ClientAISummary";
import { useClientWealth, zar, zarShort } from "@/features/wealth-workflow/client/useClientWealth";
import { EmotionalHeadline } from "@/components/dashboard/EmotionalHeadline";
import { PeopleICareFor } from "@/components/dashboard/PeopleICareFor";
import { NextMeetingWithWM } from "@/components/dashboard/NextMeetingWithWM";
import {
  derivePatientState,
  EMOTIONAL_HEADLINE,
  GREETING_LINE,
  wellbeingDescriptor,
} from "@/lib/emotionalState";

interface DashboardTile {
  icon: LucideIcon;
  label: string;
  description: string;
  to: string;
}

const TILES: DashboardTile[] = [
  { icon: FolderOpen, label: "My Documents", description: "All generated and uploaded documents", to: "/my-future?tab=documents" },
  { icon: ListChecks, label: "My Actions", description: "To-dos and reminders", to: "/todos" },
  { icon: BedDouble, label: "My Admissions", description: "Hospital admissions", to: "/admissions" },
];

const VITALS = [
  { icon: Smile, label: "Mood", value: "Good" },
  { icon: Moon, label: "Sleep", value: "7h 42m" },
  { icon: Zap, label: "Energy", value: "High" },
  { icon: Activity, label: "Activity", value: "+12%" },
];

const CARE_ITEMS = [
  { icon: Pill, label: "Medication", value: "1 due today", to: "/patient/rewards" },
  { icon: CalendarDays, label: "Appointments", value: "Tomorrow 10:30", to: "/patient/calendar" },
  { icon: FlaskConical, label: "Results", value: "1 new", to: "/patient/lab-results" },
];

const CARE_CIRCLE = [
  { name: "Dr Sarah", role: "GP", to: "/patient/doctors" },
  { name: "Dr James", role: "Cardiologist", to: "/patient/doctors" },
  { name: "Susan", role: "Physiotherapist", to: "/patient/doctors" },
];

const HAPPENING = [
  { icon: CalendarDays, title: "Tomorrow 10:30", detail: "GP appointment", to: "/patient/calendar" },
  { icon: FlaskConical, title: "Blood results", detail: "Expected Friday", to: "/patient/lab-results" },
  { icon: Activity, title: "Physio consultation", detail: "Monday 3:00 PM", to: "/patient/calendar" },
];

const INSIGHTS = [
  "Your sleep has been more consistent this week.",
  "Your glucose readings have tended to be more stable on days you've logged your meals.",
  "Mum's medication was taken this morning.",
];


export default function MyPersonalDashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const unlocked = true;
  const biologUnlocked = isAdmin;

  const { data: patientIds = [] } = useQuery({
    queryKey: ["dashboard-patient-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("id").eq("patient_user_id", user!.id);
      return (data || []).map((p) => p.id);
    },
  });

  const { data: careTeam = [] } = useQuery({
    queryKey: ["dashboard-care-team", patientIds],
    enabled: patientIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("emergency_contacts")
        .in("id", patientIds)
        .limit(1)
        .maybeSingle();
      return ((data?.emergency_contacts as any[]) || []).slice(0, 5);
    },
  });

  const { data: roundTableNotes = [], isLoading: roundTableLoading } = useQuery({
    queryKey: ["dashboard-round-table-notes", patientIds],
    enabled: patientIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("round_table_notes")
        .select("id, doctor_name, content, created_at")
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
  });

  // Real signals behind the emotional headlines. Absent data simply reads as calm.
  const { data: signals } = useQuery({
    queryKey: ["dashboard-emotional-signals", user?.id, patientIds],
    enabled: !!user?.id,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [todosRes, apptRes] = await Promise.all([
        supabase
          .from("todos")
          .select("id, due_date, status")
          .eq("assigned_to_user_id", user!.id)
          .neq("status", "completed"),
        supabase
          .from("appointment_requests")
          .select("id")
          .eq("patient_user_id", user!.id)
          .in("status", ["approved", "pending"])
          .gte("requested_start", nowIso),
      ]);

      let recentBiologEntries = 0;
      if (patientIds.length) {
        const biologRes: any = await (supabase as any)
          .from("biolog_entries")
          .select("id")
          .in("patient_id", patientIds)
          .gte("created_at", weekAgo);
        recentBiologEntries = (biologRes?.data || []).length;
      }

      const todos = todosRes.data || [];
      return {
        openTasks: todos.length,
        overdueTasks: todos.filter((t: any) => t.due_date && t.due_date < nowIso).length,
        upcomingAppointments: (apptRes.data || []).length,
        medicationDue: 0,
        recentBiologEntries,
        newResults: 0,
      };
    },
  });

  const state = derivePatientState(
    signals || {
      openTasks: 0,
      overdueTasks: 0,
      upcomingAppointments: 0,
      medicationDue: 1,
      recentBiologEntries: 1,
      newResults: 1,
    },
  );

  const { data: w } = useClientWealth();
  const t = w?.totals;

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-4">
      {/* Hero: photo, greeting, Vulas, appointments */}
      <PatientHeroCard emotionalLine={GREETING_LINE[state]} />

      {w?.patientId && <ClientAISummary patientId={w.patientId} />}

      {/* Your Financial Protection + What's Happening */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="Your Financial Protection" icon={ShieldCheck} unlocked={unlocked} onClick={() => navigate("/my-future")}>
          <EmotionalHeadline
            emoji="🛡️"
            title={t?.lifeCover || w?.issued.length ? "You're protected" : "Let's build your protection"}
            sub={w?.stageLabel ? `Your journey: ${w.stageLabel}` : "A clear view of what you're covered for"}
          />
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Life cover", value: t?.lifeCover ? zarShort(t.lifeCover) : "—", note: "If something happens to you" },
              { label: "Income protection", value: t?.incomeProtection ? `${zarShort(t.incomeProtection)} /mo` : "—", note: "If you cannot work" },
              { label: "Severe illness", value: t?.severeIllness ? zarShort(t.severeIllness) : "—", note: "Covered conditions" },
              { label: "Monthly premiums", value: t?.monthlyPremiums ? zar(t.monthlyPremiums) : "—", note: "Across all policies" },
            ].map((f) => (
              <div key={f.label} className="min-w-0">
                <p className="text-2xs uppercase tracking-wide text-muted-foreground">{f.label}</p>
                <p className="text-sm font-semibold text-foreground">{f.value}</p>
                <p className="text-2xs text-muted-foreground">{f.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-2xs uppercase tracking-wide text-primary font-bold mb-1.5">If something happened to you</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>If you die: <span className="font-semibold text-foreground">{t?.lifeCover ? zar(t.lifeCover) : "no cover captured"}</span></li>
              <li>If you can't work: <span className="font-semibold text-foreground">{t?.incomeProtection ? `${zar(t.incomeProtection)} /month` : "no cover captured"}</span></li>
              <li>When you retire: <span className="font-semibold text-foreground">{zar(t?.retirement ?? 0)} saved so far</span></li>
            </ul>
          </div>
        </Panel>

        <Panel title="What's Happening" icon={CalendarDays} unlocked={unlocked}>
          <EmotionalHeadline
            emoji="📍"
            title={w?.stageLabel || "Getting started"}
            sub="Where your Live Workspace is right now"
          />
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-2xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Next meeting</p>
            <NextMeetingWithWM />
          </div>
        </Panel>
      </div>

      {/* My Wealth + My Retirement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="My Wealth" icon={WalletIcon} unlocked={unlocked} onClick={() => navigate("/my-future")}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Net worth", value: zar(t?.netWorth ?? 0) },
              { label: "Investments", value: zar(t?.investments ?? 0) },
              { label: "Tax-free savings", value: zar(t?.taxFree ?? 0) },
              { label: "Debt", value: zar(t?.liabilities ?? 0) },
              { label: "Monthly premiums", value: zar(t?.monthlyPremiums ?? 0) },
              { label: "Total monthly expense", value: zar(t?.monthlyExpenses ?? 0) },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-2xs uppercase tracking-wide text-muted-foreground">{f.label}</p>
                <p className="text-sm font-semibold text-foreground">{f.value}</p>
              </div>
            ))}
          </div>
          {!t?.assets && <p className="mt-3 text-xs text-muted-foreground">Your Wealth Manager will add your assets and investments during your needs analysis.</p>}
        </Panel>
        <Panel title="My Retirement" icon={TrendingUp} unlocked={unlocked} onClick={() => navigate("/my-future")}>
          <div className="grid grid-cols-3 gap-3">
            <div><p className="text-2xs uppercase tracking-wide text-muted-foreground">Saved</p><p className="text-sm font-semibold">{zar(t?.retirement ?? 0)}</p></div>
            <div><p className="text-2xs uppercase tracking-wide text-muted-foreground">Target age</p><p className="text-sm font-semibold">{w?.goals.retirementAge ?? "Not set"}</p></div>
            <div><p className="text-2xs uppercase tracking-wide text-muted-foreground">Risk profile</p><p className="text-sm font-semibold">{w?.goals.riskProfile ?? "Not set"}</p></div>
          </div>
          {w?.goals.retirementIncome ? (
            <p className="mt-3 text-xs text-muted-foreground">Aiming for {zar(w.goals.retirementIncome)} a month in retirement.</p>
          ) : null}
        </Panel>
      </div>

    </div>
  );
}
