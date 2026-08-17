import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface Props {
  /** Values pulled from the patient's relationship profile when it exists. */
  values?: string[];
  communication?: string[];
  className?: string;
}

/**
 * "You are known" — the care team knows more than a medical history.
 * Falls back to the profile prompts when nothing has been captured yet.
 */
export function YouAreKnownCard({ values, communication, className }: Props) {
  const whatMatters = values?.length ? values : ["Family", "Independence", "Health"];
  const howICommunicate = communication?.length ? communication : ["Straightforward", "Detailed"];

  return (
    <section className={cn("rounded-xl border border-primary bg-card p-4", className)}>
      <p className="text-sm font-semibold text-foreground">🫶 You are known</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Your care team knows more than your medical history.
      </p>

      <dl className="mt-3 space-y-2">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">What matters to me</dt>
          <dd className="text-xs font-medium text-foreground">{whatMatters.join(" · ")}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">How I like to communicate</dt>
          <dd className="text-xs font-medium text-foreground">{howICommunicate.join(" · ")}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">My preferences</dt>
          <dd className="text-xs font-medium text-foreground">My story · My personality</dd>
        </div>
      </dl>

      <Link
        to="/patient/details"
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        View my profile <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

export default YouAreKnownCard;
