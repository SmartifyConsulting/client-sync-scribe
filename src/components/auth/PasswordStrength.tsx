import { useMemo } from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  password: string;
  className?: string;
  /** Set to true after the server (HIBP) rejects the password as breached. */
  breached?: boolean;
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

export function PasswordStrength({ password, className, breached }: Props) {
  const score = useMemo(() => RULES.filter((r) => r.test(password)).length, [password]);
  if (!password) return null;

  const pct = (score / RULES.length) * 100;
  const label = ["Very weak", "Weak", "Fair", "Strong", "Excellent"][score];
  const barColor = breached
    ? "bg-destructive"
    : score <= 1
    ? "bg-destructive"
    : score === 2
    ? "bg-amber-500"
    : score === 3
    ? "bg-primary/70"
    : "bg-primary";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Password strength</span>
        <span className="font-medium text-foreground">{breached ? "Unsafe (breached)" : label}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full transition-all duration-300", barColor)} style={{ width: `${breached ? 100 : pct}%` }} />
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
        {RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.label} className="flex items-center gap-1.5 text-sm">
              {ok ? (
                <Check className="h-3 w-3 text-primary flex-shrink-0" />
              ) : (
                <X className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
              <span className={ok ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
            </li>
          );
        })}
        <li className="col-span-2 flex items-center gap-1.5 text-sm">
          {breached ? (
            <>
              <X className="h-3 w-3 text-destructive flex-shrink-0" />
              <span className="text-destructive">Found in known data breaches — pick a different one</span>
            </>
          ) : (
            <>
              <Check className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Not found in known data breaches</span>
            </>
          )}
        </li>
      </ul>
      <p className="flex items-start gap-1.5 text-sm text-muted-foreground pt-1">
        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span>Tip: avoid names, dictionary words, and passwords you've used on other sites — even with numbers/symbols added.</span>
      </p>
    </div>
  );
}
