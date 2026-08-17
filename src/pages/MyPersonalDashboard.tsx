import { Link, useNavigate } from "react-router-dom";
import {
  FolderOpen,
  FlaskConical,
  ListChecks,
  Users2,
  BedDouble,
  Lock,
  Heart,
  Pill,
  Sparkles,
  TrendingUp,
  Smile,
  Moon,
  Zap,
  Activity,
  CalendarDays,
  ChevronRight,
  Lightbulb,
  Leaf,
  ChevronDown,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PatientHeroCard } from "@/components/dashboard/PatientHeroCard";
import { EmotionalHeadline, CardFooterLink } from "@/components/dashboard/EmotionalHeadline";
import { PeopleICareFor } from "@/components/dashboard/PeopleICareFor";
import { YouAreKnownCard } from "@/components/dashboard/YouAreKnownCard";
import {
  derivePatientState,
  EMOTIONAL_HEADLINE,
  GREETING_LINE,
  careHeadline,
  wellbeingDescriptor,
} from "@/lib/emotionalState";

// V2 preview — visible to everyone as a greyed-out preview, but only
// interactive for this account so it can be demoed before wider rollout.
const V2_DEMO_EMAIL = "georgia.adams@smartify.co.za";

interface DashboardTile {
  icon: LucideIcon;
  label: string;
  description: string;
  to: string;
}

const TILES: DashboardTile[] = [
  { icon: FolderOpen, label: "My Documents", description: "All generated and uploaded documents", to: "/documents" },
  { icon: FlaskConical, label: "Lab Results", description: "Lab requests and results", to: "/patient/lab-results" },
  { icon: ListChecks, label: "My Tasks", description: "To-dos and reminders", to: "/todos" },
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
  { name: "Angel", role: "AI Wellbeing Companion", to: "/ask-maeve" },
  { name: "Susan", role: "Physiotherapist", to: "/patient/doctors" },
  { name: "Mum", role: "Family", to: "/patient/round-table" },
];

const HAPPENING = [
  { icon: CalendarDays, title: "Tomorrow 10:30", detail: "GP appointment", to: "/patient/calendar" },
  { icon: FlaskConical, title: "Blood results", detail: "Expected Friday", to: "/patient/lab-results" },
  { icon: Activity, title: "Physio session", detail: "Monday 3:00 PM", to: "/patient/calendar" },
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
  const unlocked = user?.email === V2_DEMO_EMAIL;

  const { data: patientIds = [] } = useQuery({
    queryKey: ["dashboard-patient-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("patients").select("id").eq("patient_user_id", user!.id);
      return (data || []).map((p) => p.id);
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

      const [todosRes, apptRes, biologRes] = await Promise.all([
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
        patientIds.length
          ? supabase
              .from("biolog_entries")
              .select("id")
              .in("patient_id", patientIds)
              .gte("created_at", weekAgo)
          : Promise.resolve({ data: [] as { id: string }[] }),
      ]);

      const todos = todosRes.data || [];
      return {
        openTasks: todos.length,
        overdueTasks: todos.filter((t: any) => t.due_date && t.due_date < nowIso).length,
        upcomingAppointments: (apptRes.data || []).length,
        medicationDue: 0,
        recentBiologEntries: ((biologRes as any).data || []).length,
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

  const care = careHeadline(signals?.medicationDue ?? 1, signals?.overdueTasks ?? 0);

  const relationshipValues = (profile as any)?.about_me
    ? undefined
    : undefined;

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-4">
      {/* Hero: photo, greeting, Vulas, appointments */}
      <PatientHeroCard emotionalLine={GREETING_LINE[state]} />

      {/* Daily summary (half width) + Quick View dropdown on the same row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel unlocked={unlocked}>
          <div className="flex items-start gap-3">
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", unlocked ? "bg-primary/10" : "bg-muted")}>
              <Heart className={cn("h-5 w-5", unlocked ? "text-primary" : "text-muted-foreground")} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">💚 Here's what we've noticed</p>
              <p className="mt-1 text-sm text-foreground leading-relaxed">
                You're looking after yourself well. Your sleep has been consistent this week, your
                activity is above your usual level, and you have one medication due this morning.
              </p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                You also have a doctor's appointment tomorrow at 10:30.
              </p>
              <CardFooterLink label="See what's behind this" onClick={() => navigate("/biolog")} />
            </div>
          </div>
        </Panel>

        <Panel unlocked>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Leaf className="h-5 w-5 text-primary" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">🌱 Your Biolog is up to date</p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Wellbeing +8% this month. Everything you've logged is feeding your longer-term picture.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={() => navigate("/biolog")}>
                  <TrendingUp className="h-3.5 w-3.5" /> Open Biolog
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 text-xs">
                      <FolderOpen className="h-3.5 w-3.5" />
                      Quick View
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 bg-popover z-50">
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
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Main column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Four summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Panel title="How I'm doing" icon={Heart} unlocked={unlocked} onClick={() => navigate("/biolog")}>
              <EmotionalHeadline
                emoji="❤️"
                title={EMOTIONAL_HEADLINE[state]}
                sub={wellbeingDescriptor(state)}
                muted={!unlocked}
              />
              <div className="grid grid-cols-2 gap-3">
                {VITALS.map((v) => (
                  <div key={v.label} className="flex items-start gap-2">
                    <v.icon className={cn("h-4 w-4 mt-0.5", unlocked ? "text-primary" : "text-muted-foreground")} />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{v.label}</p>
                      <p className="text-sm font-semibold text-foreground">{v.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <CardFooterLink label="See how this is tracking" onClick={() => navigate("/biolog")} />
            </Panel>

            <Panel title="My Care" icon={Pill} unlocked={unlocked} onClick={() => navigate("/patient/rewards")}>
              <EmotionalHeadline emoji="💚" title={care.title} sub={care.sub} muted={!unlocked} />
              <ul className="space-y-2">
                {CARE_ITEMS.map((c) => (
                  <li key={c.label}>
                    <Link to={c.to} className="flex items-start gap-2 rounded-md -mx-1 px-1 py-0.5 hover:bg-primary/5">
                      <c.icon className={cn("h-4 w-4 mt-0.5", unlocked ? "text-primary" : "text-muted-foreground")} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{c.label}</p>
                        <p className="text-xs text-muted-foreground">{c.value}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <CardFooterLink label="See what needs your attention" onClick={() => navigate("/todos")} />
            </Panel>

            <Panel title="My Wellbeing" icon={Sparkles} unlocked={unlocked} onClick={() => navigate("/ask-maeve")}>
              <EmotionalHeadline
                emoji="✨"
                title="You don't have to figure it out alone"
                sub="Something on your mind?"
                muted={!unlocked}
              />
              <button
                type="button"
                onClick={() => navigate("/ask-maeve")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold",
                  unlocked ? "bg-primary/10 text-primary hover:bg-primary/15" : "bg-muted text-muted-foreground",
                )}
              >
                <Sparkles className="h-3.5 w-3.5" /> Ask Angel
              </button>
              <p className="mt-2 text-xs text-muted-foreground leading-snug">
                A place to slow down, explore what's on your mind and find your own way forward.
              </p>
            </Panel>

            <Panel title="My Journey" icon={TrendingUp} unlocked={unlocked} onClick={() => navigate("/biolog")}>
              <EmotionalHeadline
                emoji="🌱"
                title="You're moving in the right direction"
                sub="See how your choices, patterns and wellbeing are evolving."
                muted={!unlocked}
              />
              <div className={cn("h-12 rounded-md", unlocked ? "bg-primary/10" : "bg-muted")} />
              <div className="mt-3 flex items-center gap-2">
                <Leaf className={cn("h-4 w-4", unlocked ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className="text-xs font-semibold text-foreground">+8%</p>
                  <p className="text-[10px] text-muted-foreground">Wellbeing this month</p>
                </div>
              </div>
              <CardFooterLink label="Open my journey" onClick={() => navigate("/biolog")} />
            </Panel>
          </div>

          {/* People I care for */}
          <Panel title="People I care for" icon={Heart} unlocked={unlocked}>
            <EmotionalHeadline
              emoji="❤️"
              title="They're okay."
              sub="The people you're looking out for"
              muted={!unlocked}
            />
            <PeopleICareFor unlocked={unlocked} />
          </Panel>

          {/* Lower band: observations + round tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <Panel title="We've noticed" icon={Lightbulb} unlocked={unlocked} onClick={() => navigate("/biolog")}>
              <EmotionalHeadline
                emoji="💡"
                title="A few patterns worth knowing"
                sub="Observations from what you've logged — not diagnoses."
                muted={!unlocked}
              />
              <ul className="space-y-1.5">
                {INSIGHTS.map((i) => (
                  <li key={i} className="text-xs text-muted-foreground">{i}</li>
                ))}
              </ul>
              <CardFooterLink label="See what's behind this" onClick={() => navigate("/biolog")} />
            </Panel>

            <Panel
              title="My Round Tables"
              icon={MessageSquare}
              unlocked
              action={
                <Link to="/patient/round-table" className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              <EmotionalHeadline
                emoji="🫶"
                title="Your team is talking to each other"
                sub="What your doctors share about your care lands here."
              />
              {roundTableLoading ? (
                <p className="text-xs text-muted-foreground">Loading your round table notes…</p>
              ) : roundTableNotes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-background/40 p-4 text-center">
                  <MessageSquare className="mx-auto h-6 w-6 text-muted-foreground/50" />
                  <p className="mt-1.5 text-xs font-semibold text-foreground">No round table notes yet</p>
                  <p className="text-[10px] text-muted-foreground">
                    When your doctors share notes about your care, they'll appear here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {roundTableNotes.map((note) => (
                    <li key={note.id}>
                      <Link
                        to="/patient/round-table"
                        className="block rounded-lg border border-border bg-background/60 p-2.5 hover:border-primary"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground truncate">{note.doctor_name || "Doctor"}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {format(new Date(note.created_at), "MMM d")}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{note.content}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        {/* Right rail */}
        <div className="lg:col-span-1 space-y-4">
          <YouAreKnownCard values={relationshipValues} />

          <Panel title="My Care Circle" icon={Users2} unlocked={unlocked} onClick={() => navigate("/patient/doctors")}>
            <EmotionalHeadline
              emoji="❤️"
              title="You're not looking after yourself alone"
              sub="The people looking out for you"
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
            <Link
              to="/patient/round-table"
              className={cn(
                "mt-3 block rounded-lg px-3 py-2 text-center text-xs font-semibold",
                unlocked ? "bg-primary/10 text-primary hover:bg-primary/15" : "bg-muted text-muted-foreground",
              )}
            >
              View my Round Table →
            </Link>
          </Panel>

          <Panel title="You're in the loop" icon={CalendarDays} unlocked={unlocked} onClick={() => navigate("/patient/calendar")}>
            <EmotionalHeadline
              emoji="📅"
              title="You're in the loop"
              sub="Nothing important is getting lost."
              muted={!unlocked}
            />
            <ul className="space-y-2">
              {HAPPENING.map((h) => (
                <li key={h.title}>
                  <Link to={h.to} className="flex items-start gap-2 rounded-md -mx-1 px-1 py-0.5 hover:bg-primary/5">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", unlocked ? "bg-primary/10" : "bg-muted")}>
                      <h.icon className={cn("h-4 w-4", unlocked ? "text-primary" : "text-muted-foreground")} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{h.title}</p>
                      <p className="text-[10px] text-muted-foreground">{h.detail}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/patient/calendar"
              className={cn(
                "mt-3 block rounded-lg px-3 py-2 text-center text-xs font-semibold",
                unlocked ? "bg-primary/10 text-primary hover:bg-primary/15" : "bg-muted text-muted-foreground",
              )}
            >
              View all care →
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
