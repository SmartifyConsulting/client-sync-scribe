import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroupView } from "./useWorkflowMap";

interface Props {
  groups: GroupView[];
  viewer: "manager" | "client";
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
}

/** Horizontal 6-step overview of the wealth workflow. Locked steps cannot be selected. */
export function WorkflowStepper({ groups, viewer, selectedKey, onSelect }: Props) {
  const visible = groups.filter((g) => g.state !== "not_applicable");

  return (
    <ol className="flex items-start">
      {visible.map((g, i) => {
        const done = g.state === "completed";
        const active = ["current", "waiting", "blocked"].includes(g.state);
        const locked = g.state === "pending";
        const isSelected = selectedKey === g.group.key;

        return (
          <li key={g.group.key} className="flex flex-1 flex-col items-center last:max-w-none last:flex-none">
            <div className="flex w-full items-center">
              <button
                type="button"
                disabled={locked}
                onClick={() => !locked && onSelect?.(g.group.key)}
                aria-current={active || isSelected ? "step" : undefined}
                aria-label={viewer === "client" ? g.group.clientTitle : g.group.title}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done ? "border-primary bg-primary text-primary-foreground"
                    : active || isSelected ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground",
                  locked ? "cursor-not-allowed opacity-60" : onSelect && "cursor-pointer hover:border-primary/60",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : locked ? <Lock className="h-3.5 w-3.5" /> : g.group.n}
              </button>
              {i < visible.length - 1 && (
                <span className={cn("mx-1 h-0.5 flex-1", done ? "bg-primary" : "bg-border")} />
              )}
            </div>
            <span
              className={cn(
                "mt-1.5 max-w-[88px] text-center text-[11px] leading-tight",
                active || isSelected ? "font-semibold text-foreground" : locked ? "text-muted-foreground/70" : "text-muted-foreground",
              )}
            >
              {viewer === "client" ? g.group.clientTitle : g.group.title}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default WorkflowStepper;
