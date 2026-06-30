import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const STEPS = [
  { v: "en_route", labelKey: "navigationScreen.enRoute", fallback: "En route" },
  { v: "arrived", labelKey: "navigationScreen.arrived", fallback: "At scene" },
  { v: "en_route_to_hospital", labelKey: "navigationScreen.toHospital", fallback: "To hospital" },
  { v: "at_hospital", labelKey: "navigationScreen.arrivedAtHospital", fallback: "At hospital" },
];

const ORDER: Record<string, number> = {
  assigned: -1,
  en_route: 0,
  arrived: 1,
  patient_collected: 2,
  en_route_to_hospital: 2,
  at_hospital: 3,
  completed: 4,
  treated_on_scene: 4,
};

export function MissionStatusStepper({
  currentStatus,
  treatedOnScene = false,
}: {
  currentStatus?: string | null;
  treatedOnScene?: boolean;
}) {
  const { t } = useTranslation();
  const idx = ORDER[currentStatus ?? ""] ?? -1;

  if (treatedOnScene) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Mission status</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check className="h-3.5 w-3.5" />
          </span>
          <p className="text-sm font-bold text-emerald-700">Treated on scene — transport cancelled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mission status</p>
        <p className="text-[10px] text-muted-foreground">Auto-updates from vehicle GPS</p>
      </div>
      <ol className="mt-2 grid grid-cols-4 gap-1">
        {STEPS.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={s.v} className="flex flex-col items-center gap-1">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                    done && "border-primary bg-primary text-primary-foreground",
                    active && "border-primary bg-primary/15 text-primary ring-2 ring-primary/30",
                    !done && !active && "border-muted-foreground/30 bg-card text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    className={cn(
                      "ml-1 h-0.5 flex-1 rounded",
                      i < idx ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-center text-[10px] leading-tight",
                  active ? "font-bold text-primary" : "text-muted-foreground"
                )}
              >
                {t(s.labelKey, s.fallback)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
