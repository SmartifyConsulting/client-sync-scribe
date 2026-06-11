import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  password: string;
  className?: string;
}

interface Rule {
  label: string;
  test: (pw: string) => boolean;
}

const RULES: Rule[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Mixed upper & lower case", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "At least one number", test: (p) => /\d/.test(p) },
  { label: "At least one symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function PasswordStrength({ password, className }: Props) {
  const score = useMemo(() => RULES.filter((r) => r.test(password)).length, [password]);
  if (!password) return null;

  const pct = (score / RULES.length) * 100;
  const label = ["Very weak", "Weak", "Fair", "Strong", "Excellent"][score];
  const barColor =
    score <= 1 ? "bg-destructive" : score === 2 ? "bg-amber-500" : score === 3 ? "bg-primary/70" : "bg-primary";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Password strength</span>
        <span className="font-medium text-foreground">{label}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full transition-all duration-300", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
        {RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.label} className="flex items-center gap-1.5 text-[11px]">
              {ok ? (
                <Check className="h-3 w-3 text-primary flex-shrink-0" />
              ) : (
                <X className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
              <span className={ok ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
