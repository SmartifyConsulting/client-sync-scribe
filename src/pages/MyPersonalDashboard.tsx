import { Link } from "react-router-dom";
import { FolderOpen, FlaskConical, ListChecks, Users2, BedDouble, Lock, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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
  { icon: Users2, label: "My Round Tables", description: "Shared notes with other specialists", to: "/doctor/round-tables" },
  { icon: BedDouble, label: "My Admissions", description: "Hospital admissions", to: "/admissions" },
];

export default function MyPersonalDashboard() {
  const { user } = useAuth();
  const unlocked = user?.email === V2_DEMO_EMAIL;

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="mb-6 space-y-1">
        <h1 className="text-3xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-muted-foreground text-xs">
          A consolidated view of your documents, tasks, and care activity.
          {!unlocked && " These sections are in preview and not yet available."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          const card = (
            <div
              className={cn(
                "rounded-xl border p-5 transition-colors h-full",
                unlocked
                  ? "border-primary bg-card hover:bg-primary/5 cursor-pointer"
                  : "border-border bg-muted/30 opacity-60 cursor-not-allowed",
              )}
            >
              <div className="flex items-start justify-between">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", unlocked ? "bg-primary/10" : "bg-muted")}>
                  <Icon className={cn("h-5 w-5", unlocked ? "text-primary" : "text-muted-foreground")} />
                </div>
                {!unlocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{tile.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tile.description}</p>
              {!unlocked && (
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Coming soon
                </span>
              )}
            </div>
          );

          return unlocked ? (
            <Link key={tile.to} to={tile.to} className="block h-full">
              {card}
            </Link>
          ) : (
            <div key={tile.to} aria-disabled="true">
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
