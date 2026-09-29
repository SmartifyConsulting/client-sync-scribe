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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { resolvePermissions } from "@/features/patients/lib/careTeamPermissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PatientHeroCard } from "@/components/dashboard/PatientHeroCard";
import { EmotionalHeadline } from "@/components/dashboard/EmotionalHeadline";
import { PeopleICareFor } from "@/components/dashboard/PeopleICareFor";
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
  { icon: FolderOpen, label: "My Documents", description: "All generated and uploaded documents", to: "/documents" },
  { icon: FlaskConical, label: "Lab Results", description: "Lab requests and results", to: "/patient/lab-results" },
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

function Panel({
  title,
  icon: Icon,
  unlocked,
  action,
  onClick,
  children,
  className,
}: {
  title?: string;
  icon?: LucideIcon;
  unlocked: boolean;
  action?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border p-4 h-full",
        unlocked ? "border-primary bg-card" : "border-border bg-muted/30 opacity-60",
        className,
      )}
    >
      {title && (
        <header
          className={cn("flex items-center justify-between gap-2 mb-3", onClick && "cursor-pointer")}
          onClick={onClick}
        >
          <div className="flex items-center gap-2">
            {Icon && (
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  unlocked ? "bg-primary/10" : "bg-muted",
                )}
              >
                <Icon className={cn("h-4 w-4", unlocked ? "text-primary" : "text-muted-foreground")} />
              </span>
            )}
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          </div>
          {action ?? (unlocked ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />)}
        </header>
      )}
      {children}
    </section>
  );
}

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

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-4">
      {/* Hero: photo, greeting, Vulas, appointments */}
      <PatientHeroCard emotionalLine={GREETING_LINE[state]} />

      {/* Ask Holarc — top frame, admin-only until launched */}
      <div className={cn("rounded-lg border p-3 flex items-center gap-3", isAdmin ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30")}>
        <Sparkles className={cn("h-5 w-5 shrink-0", isAdmin ? "text-primary" : "text-muted-foreground")} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-foreground">You don't have to figure it out alone</p>
            {!isAdmin && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          <p className="text-[10px] text-muted-foreground">Something on your mind? A place to slow down and find your own way forward.</p>
          <p className="text-[10px] text-muted-foreground italic">Holarc Wealth does not dispense advice — only questions.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/ask-maeve")}
          disabled={!isAdmin}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
            isAdmin ? "bg-primary/10 text-primary hover:bg-primary/15" : "bg-muted text-muted-foreground",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" /> Ask Holarc
        </button>
      </div>

      {/* Daily summary (half width) + Quick View dropdown on the same row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel unlocked={biologUnlocked}>
          <div className="flex items-start gap-3">
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", biologUnlocked ? "bg-primary/10" : "bg-muted")}>
              <Leaf className={cn("h-5 w-5", biologUnlocked ? "text-primary" : "text-muted-foreground")} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-foreground">🌱 Your Biolog Updates</p>
                  {!biologUnlocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0" onClick={() => navigate("/biolog")} disabled={!biologUnlocked}>
                  <TrendingUp className="h-3.5 w-3.5" /> Open Biolog
                </Button>
              </div>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {biologUnlocked
                  ? "Wellbeing +8% this month. Everything you've logged is feeding your longer-term picture."
                  : "Coming soon — this feature hasn't been introduced yet."}
              </p>
              <EmotionalHeadline
                emoji="❤️"
                title={EMOTIONAL_HEADLINE[state]}
                sub={wellbeingDescriptor(state)}
                muted={!biologUnlocked}
              />
              <div className="grid grid-cols-2 gap-3">
                {VITALS.map((v) => (
                  <div key={v.label} className="flex items-start gap-2">
                    <v.icon className={cn("h-4 w-4 mt-0.5", biologUnlocked ? "text-primary" : "text-muted-foreground")} />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{v.label}</p>
                      <p className="text-sm font-semibold text-foreground">{v.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <ul className="mt-3 space-y-1.5">
                {INSIGHTS.map((i) => (
                  <li key={i} className="text-xs text-muted-foreground">{i}</li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>

        {/* What's Happening — renamed from My Care: calendar content, then medications/results (Tasks, in teal, no hyperlink), then what needs your attention */}
        <Panel
          title="What's Happening"
          icon={CalendarDays}
          unlocked={unlocked}
          action={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Quick View
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-popover z-50">
                {TILES.map((tile) => (
                  <DropdownMenuItem key={tile.to} asChild>
                    <Link to={tile.to} className="flex items-start gap-2">
                      <tile.icon className="h-4 w-4 mt-0.5 text-primary" />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-foreground">{tile.label}</span>
                        <span className="block text-[10px] text-muted-foreground">{tile.description}</span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        >
          <EmotionalHeadline
            emoji="📅"
            title="You're in the loop"
            sub="Nothing important is getting lost."
            muted={!unlocked}
          />
          <div className="grid grid-cols-2 gap-4">
            <ul className="space-y-1">
              {HAPPENING.map((h) => (
                <li key={h.title} className="flex items-start gap-1.5 rounded-md -mx-1 px-1 py-0.5">
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-lg shrink-0", unlocked ? "bg-primary/10" : "bg-muted")}>
                    <h.icon className={cn("h-3.5 w-3.5", unlocked ? "text-primary" : "text-muted-foreground")} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{h.title}</p>
                    <p className="text-[10px] text-muted-foreground">{h.detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Today's To Do List</p>
                <Button size="sm" variant="outline" className="h-6 gap-1 text-[10px] px-2" onClick={() => navigate("/todos")}>
                  <ListChecks className="h-3 w-3" /> Record Task
                </Button>
              </div>
              <ul className="space-y-1">
                {CARE_ITEMS.filter((c) => c.label === "Medication" || c.label === "Results").map((c) => (
                  <li key={c.label} className="flex items-start gap-1.5 rounded-md -mx-1 px-1 py-0.5">
                    <c.icon className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.value}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* My Round Tables — folded into the whitespace at the bottom */}
          <div className="mt-4 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-primary font-bold">
                <Users2 className="h-3.5 w-3.5" />
                My Round Tables
              </p>
              <Link to="/patient/round-table" className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {roundTableLoading ? (
              <p className="text-xs text-muted-foreground">Loading your round table notes…</p>
            ) : roundTableNotes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-background/40 p-3 text-center">
                <MessageSquare className="mx-auto h-5 w-5 text-muted-foreground/50" />
                <p className="mt-1 text-xs font-semibold text-foreground">No round table notes yet</p>
                <p className="text-[10px] text-muted-foreground">
                  When your doctors share notes about your care, they'll appear here.
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {roundTableNotes.map((note) => (
                  <li key={note.id}>
                    <Link
                      to="/patient/round-table"
                      className="block rounded-lg border border-border bg-background/60 p-2 hover:border-primary"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">{note.doctor_name || "Doctor"}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(new Date(note.created_at), "MMM d")}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{note.content}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        {/* Main column */}
        <div className="space-y-4">
          {/* People I care for — right under the hero row */}
          <Panel title="People I care for" icon={Heart} unlocked={unlocked}>
            <EmotionalHeadline
              emoji="❤️"
              title="They're okay."
              sub="The people you're looking out for"
              muted={!unlocked}
            />
            <PeopleICareFor unlocked={unlocked} />
          </Panel>

          {/* My Holarcy — its own row at the bottom */}
          <Panel title="My Holarcy" icon={HeartHandshake} unlocked={unlocked}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 rounded-xl border border-border bg-background/40 p-4">
                <p className="text-xs font-semibold text-foreground">My Holarc Wealth Financial Team</p>
                <EmotionalHeadline
                  emoji="❤️"
                  title="You're not looking after yourself alone"
                  sub="The practitioners looking after you"
                  muted={!unlocked}
                />
                <ul className="space-y-2">
                  {CARE_CIRCLE.map((c) => (
                    <li key={c.name}>
                      <Link to={c.to} className="flex items-center gap-2 rounded-md -mx-1 px-1 py-0.5 hover:bg-primary/5">
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold", unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {c.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{c.role}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1 rounded-xl border border-border bg-background/40 p-4">
                <p className="text-xs font-semibold text-foreground">Personal Care Circle</p>
                <EmotionalHeadline
                  emoji="❤️"
                  title="They're close, even when they're far away"
                  sub="The friends and family you share parts of your profile with"
                  muted={!unlocked}
                />
                {careTeam.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No one added yet. Your Next of Kin is listed here by default.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {careTeam.map((c: any) => (
                      <li key={c.id} className="flex items-center gap-2">
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold", unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {(c.name || "?").slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{c.name || "Unnamed"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {c.relationship || "Care team"} · {resolvePermissions(c).length} areas shared
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to="/patient/details?section=personal"
                  className={cn(
                    "block rounded-lg px-3 py-2 text-center text-xs font-semibold",
                    unlocked ? "bg-primary/10 text-primary hover:bg-primary/15" : "bg-muted text-muted-foreground",
                  )}
                >
                  Manage my Care Team →
                </Link>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
