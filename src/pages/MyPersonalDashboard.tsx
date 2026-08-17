import { Link } from "react-router-dom";
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
  Plus,
  Leaf,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { ChevronDown, MessageSquare } from "lucide-react";
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

const SUMMARY_LINES = [
  "You slept 7h 42m last night.",
  "Your activity is above your weekly average.",
  "You have one medication due this morning.",
  "You have a doctor's appointment tomorrow at 10:30.",
];

const VITALS = [
  { icon: Smile, label: "Mood", value: "Good" },
  { icon: Moon, label: "Sleep", value: "7h 42m" },
  { icon: Zap, label: "Energy", value: "High" },
  { icon: Activity, label: "Activity", value: "+12%" },
];

const CARE_ITEMS = [
  { icon: Pill, label: "Medication", value: "1 due today" },
  { icon: CalendarDays, label: "Appointments", value: "Tomorrow 10:30" },
  { icon: FlaskConical, label: "Results", value: "1 new" },
];

const PEOPLE = [
  { name: "Mum", relation: "Mother", status: "Doing well", lines: ["Medication taken", "Last check-in: 08:42", "No current concerns"] },
  { name: "Dad", relation: "Father", status: "Doing well", lines: ["Medication taken", "Last activity: 07:51", "No current concerns"] },
  { name: "Emma", relation: "Daughter, 15", status: "Doing well", lines: ["Sleep: 8h 12m", "Mood: Good", "No current concerns"] },
];

const CARE_CIRCLE = [
  { name: "Dr Sarah", role: "GP" },
  { name: "Dr James", role: "Cardiologist" },
  { name: "Angel", role: "AI Wellbeing Companion" },
  { name: "Susan", role: "Physiotherapist" },
  { name: "Mum", role: "Family" },
];

const HAPPENING = [
  { icon: CalendarDays, title: "Tomorrow 10:30", detail: "GP appointment" },
  { icon: FlaskConical, title: "Blood results", detail: "Expected Friday" },
  { icon: Activity, title: "Physio session", detail: "Monday 3:00 PM" },
];

const INSIGHTS = [
  "Your sleep has been more consistent this week.",
  "Your glucose levels are more stable on days you log meals.",
  "Mum's medication was taken this morning.",
];

function Panel({
  title,
  icon: Icon,
  unlocked,
  action,
  children,
  className,
}: {
  title?: string;
  icon?: LucideIcon;
  unlocked: boolean;
  action?: React.ReactNode;
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
        <header className="flex items-center justify-between gap-2 mb-3">
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
  useProfile();
  const unlocked = user?.email === V2_DEMO_EMAIL;

  const { data: roundTableNotes = [], isLoading: roundTableLoading } = useQuery({
    queryKey: ["dashboard-round-table-notes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: patients } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", user!.id);
      if (!patients?.length) return [];
      const { data } = await supabase
        .from("round_table_notes")
        .select("id, doctor_name, content, created_at")
        .in("patient_id", patients.map((p) => p.id))
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
  });



  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-4">
      {/* Hero: photo, greeting, Vulas, appointments + quick access */}
      <PatientHeroCard
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-xs">
                <FolderOpen className="h-3.5 w-3.5" />
                Quick access
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
        }
      />


      {/* Daily summary strip */}
      <Panel unlocked={unlocked}>
        <div className="flex items-start gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", unlocked ? "bg-primary/10" : "bg-muted")}>
            <Heart className={cn("h-5 w-5", unlocked ? "text-primary" : "text-muted-foreground")} />
          </span>
          <ul className="flex-1 space-y-0.5">
            {SUMMARY_LINES.map((line) => (
              <li key={line} className="text-sm text-foreground">{line}</li>
            ))}
          </ul>
          {unlocked ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Main column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Four summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Panel title="How I'm doing" icon={Heart} unlocked={unlocked}>
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
            </Panel>

            <Panel title="My Care" icon={Pill} unlocked={unlocked}>
              <ul className="space-y-2">
                {CARE_ITEMS.map((c) => (
                  <li key={c.label} className="flex items-start gap-2">
                    <c.icon className={cn("h-4 w-4 mt-0.5", unlocked ? "text-primary" : "text-muted-foreground")} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.value}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="My Wellbeing" icon={Sparkles} unlocked={unlocked}>
              <p className="text-sm text-foreground">Need to think something through?</p>
              <div
                className={cn(
                  "mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold",
                  unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                <Sparkles className="h-3.5 w-3.5" /> Ask Angel
              </div>
            </Panel>

            <Panel title="My Journey" icon={TrendingUp} unlocked={unlocked}>
              <p className="text-sm font-semibold text-foreground">Health on track</p>
              <p className="text-xs text-muted-foreground">Longevity dashboard</p>
              <div className={cn("mt-3 h-12 rounded-md", unlocked ? "bg-primary/10" : "bg-muted")} />
              <div className="mt-3 flex items-center gap-2">
                <Leaf className={cn("h-4 w-4", unlocked ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className="text-xs font-semibold text-foreground">+8%</p>
                  <p className="text-[10px] text-muted-foreground">Wellbeing this month</p>
                </div>
              </div>
            </Panel>
          </div>

          {/* People I care for */}
          <Panel
            title="People I care for"
            icon={Heart}
            unlocked={unlocked}
            action={
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                View everyone <ChevronRight className="h-3.5 w-3.5" />
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {PEOPLE.map((p) => (
                <div key={p.name} className="rounded-lg border border-border bg-background/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold", unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      {p.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.relation}</p>
                    </div>
                  </div>
                  <span className="mt-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {p.status}
                  </span>
                  <ul className="mt-2 space-y-0.5">
                    {p.lines.map((l) => (
                      <li key={l} className="text-[11px] text-muted-foreground">{l}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="rounded-lg border border-dashed border-border bg-background/40 p-3 flex flex-col items-center justify-center text-center">
                <Plus className="h-5 w-5 text-muted-foreground" />
                <p className="mt-1 text-xs font-semibold text-foreground">Add someone</p>
                <p className="text-[10px] text-muted-foreground">Keep the people you love close</p>
              </div>
            </div>
          </Panel>

          {/* Lower band: insights + quick access */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <Panel title="Things you should know" icon={Lightbulb} unlocked={unlocked}>
              <ul className="space-y-1.5">
                {INSIGHTS.map((i) => (
                  <li key={i} className="text-xs text-muted-foreground">{i}</li>
                ))}
              </ul>
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
                    <li key={note.id} className="rounded-lg border border-border bg-background/60 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">{note.doctor_name || "Doctor"}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(new Date(note.created_at), "MMM d")}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{note.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

          </div>
        </div>

        {/* Right rail */}
        <div className="lg:col-span-1 space-y-4">
          <Panel title="My Care Circle" icon={Users2} unlocked={unlocked}>
            <p className="-mt-2 mb-2 text-[10px] text-muted-foreground">The people looking out for me.</p>
            <ul className="space-y-2">
              {CARE_CIRCLE.map((c) => (
                <li key={c.name} className="flex items-center gap-2">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold", unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{c.role}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </li>
              ))}
            </ul>
            <div className={cn("mt-3 rounded-lg px-3 py-2 text-center text-xs font-semibold", unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              View my Round Table
            </div>
          </Panel>

          <Panel title="What's happening?" icon={CalendarDays} unlocked={unlocked}>
            <ul className="space-y-2">
              {HAPPENING.map((h) => (
                <li key={h.title} className="flex items-start gap-2">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", unlocked ? "bg-primary/10" : "bg-muted")}>
                    <h.icon className={cn("h-4 w-4", unlocked ? "text-primary" : "text-muted-foreground")} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{h.title}</p>
                    <p className="text-[10px] text-muted-foreground">{h.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className={cn("mt-3 rounded-lg px-3 py-2 text-center text-xs font-semibold", unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              View all appointments
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
