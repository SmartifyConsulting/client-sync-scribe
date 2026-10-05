import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FolderOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OwnerBadge } from "./WorkflowGroupCard";
import { STEP_GUIDANCE, fillName, ownerLabel } from "./stepGuidance";
import { KycPanel, SignDocsPanel } from "./OnboardingPanels";
import { AstutePanel } from "./AstutePanel";
import { LaterStepPanel, LATER_STEPS } from "./LaterPanels";
import { QuotesPanel, QUOTE_STEPS } from "./QuotesPanel";
import { PersonalInfoPanel, CaptureFinancialsPanel, VerifyFinancialsPanel, ScheduleMeetingPanel } from "./ProfilePanels";
import type { GroupView } from "./useWorkflowMap";

interface Props {
  group: GroupView | null;
  stepLabel: string | null;
  isLive: boolean;
  viewer: "manager" | "client";
  clientName: string;
  workflowId: string;
  records: any;
  blockers: string[];
  documents: { id: string; name: string; document_kind?: string }[];
  onBackToCurrent: () => void;
  onOpenDocuments?: () => void;
  embedded?: boolean;
  managerName?: string;
}

export function WorkingWindow({ group: propGroup, stepLabel: propStepLabel, isLive, viewer, clientName, workflowId, records, blockers, documents, onBackToCurrent, onOpenDocuments, embedded, managerName }: Props) {
  const wmName = managerName && managerName !== "Wealth Manager" ? managerName : "";
  const wm = (s: string) => wmName ? s.replace(/\b[Yy]our Wealth Manager\b/g, wmName).replace(/\bmy Wealth Manager\b/g, wmName) : s;
  const propStep = propGroup?.steps.find((s) => s.label === propStepLabel);
  const first = clientName.split(" ")[0] || "The client";

  // When the step shown here just finished (e.g. Didit verification came
  // back approved), hold on it for a moment so the client actually sees it
  // marked done — rather than it being yanked out from under them the
  // instant the live "next" step recalculates — then reveal whatever step
  // is current. latestProps is read inside the timeout so an unrelated
  // parent re-render while holding doesn't use stale props.
  const latestProps = useRef({ group: propGroup, stepLabel: propStepLabel });
  latestProps.current = { group: propGroup, stepLabel: propStepLabel };
  const [displayed, setDisplayed] = useState({ group: propGroup, stepLabel: propStepLabel });
  const prevRef = useRef<{ label: string; state: string } | null>(null);
  const holdingRef = useRef(false);

  useEffect(() => {
    if (!propStep) {
      if (!holdingRef.current) setDisplayed({ group: propGroup, stepLabel: propStepLabel });
      return;
    }
    const prev = prevRef.current;
    const justCompleted = prev?.label === propStep.label && prev.state !== "done" && propStep.state === "done";
    prevRef.current = { label: propStep.label, state: propStep.state };

    if (justCompleted && viewer === "client") {
      setDisplayed({ group: propGroup, stepLabel: propStepLabel });
      holdingRef.current = true;
      const timer = setTimeout(() => {
        holdingRef.current = false;
        setDisplayed(latestProps.current);
      }, 1400);
      return () => clearTimeout(timer);
    }

    if (!holdingRef.current) setDisplayed({ group: propGroup, stepLabel: propStepLabel });
  }, [propGroup, propStepLabel, propStep?.label, propStep?.state, viewer]);

  const group = displayed.group;
  const step = group?.steps.find((s) => s.label === displayed.stepLabel);

  if (!group || !step) {
    return (
      <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        <CheckCircle2 className="mb-2 h-5 w-5 text-primary" />
        All steps are complete. The cycle starts again at the next annual review.
      </div>
    );
  }
  const g = STEP_GUIDANCE[step.label];
  const t = g ? g[viewer] : null;
  const mine = (viewer === "client" && step.owner === "client") || (viewer === "manager" && step.owner === "advisor");
  const who = ownerLabel(step.owner, viewer, first);
  const status = step.state === "done" ? "Completed" : step.state === "next" ? (mine ? "" : "In progress") : "Upcoming";
  const waitingText = viewer === "client"
    ? (step.owner === "advisor" ? wm("Your Wealth Manager is working on this. You don't need to do anything yet.") : step.owner === "insurer" ? "Your insurer is working on this. We'll update you here." : "Elysian (Pty) Ltd is doing this automatically.")
    : (step.owner === "client" ? `Waiting for ${first}. This updates as soon as they act.` : step.owner === "insurer" ? "Waiting for the insurer." : "Elysian (Pty) Ltd is doing this automatically.");
  const isKyc = step.label === "Complete KYC, AML and PEP screening";
  const isSign = step.label === "Sign Disclosure and LOA";
  const isAstute = step.label.startsWith("Astute pull");
  const isPersonal = step.label === "Complete personal information";
  const isCapture = step.label === "Record meeting and capture financials";
  const isSchedule = step.label === 'Schedule "Review Financial Health" meeting';
  const isVerify = step.label === "Verify financial information";
  const reached = step.state === "next" || step.state === "done";
  const isLater = LATER_STEPS.has(step.label);
  const isQuote = QUOTE_STEPS.has(step.label);
  const custom = isQuote || isLater || isSchedule || isKyc || isSign || isAstute || isPersonal || isCapture || isVerify;

  return (
    <div key={step.label} className={cn("animate-fade-in overflow-hidden", embedded ? "" : "rounded-xl border border-border/70 bg-card")}>
      {!embedded && (
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
          <span className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", isLive ? "bg-primary animate-pulse" : "bg-muted-foreground/40")} />
            Working window
          </span>
          {!isLive && <button onClick={onBackToCurrent} className="text-xs font-medium text-primary hover:underline">Back to current</button>}
        </div>
      )}

      <div className={cn("grid min-w-0 grid-cols-1", embedded ? "gap-3 px-2 py-3" : "gap-5 p-4 md:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]")}>
        {/* Left: instructions */}
        <div className="min-w-0 divide-y divide-border/60 [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <div className={cn(embedded && "hidden")}>
            <p className="text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Step {group.group.n} · {viewer === "client" ? group.group.clientTitle : group.group.title}</p>
            <div className="mt-1 flex items-center gap-2">
              <OwnerBadge owner={step.owner} label={who} />
              <h3 className="text-base font-medium tracking-tight text-foreground">{step.label}</h3>
            </div>
            {status && <span className={cn("mt-2 inline-block rounded-full px-2 py-0.5 text-2xs font-medium",
              step.state === "done" ? "bg-primary/10 text-primary" : step.state === "next" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {status}
            </span>}
          </div>

          {isSign && viewer === "client" && !embedded ? (
            <div>
              <p className="text-sm leading-relaxed text-muted-foreground">Read and sign two documents:</p>
              <ol className="mt-2 space-y-2.5">
                {[
                  { title: "Disclosure Agreement", text: "Explains who we are and how we are paid." },
                  { title: "Letter of Authority (LOA)", text: wm("Lets your Wealth Manager request your policy information from insurers.") },
                ].map((item, i) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-2xs font-semibold text-primary-foreground">{i + 1}</span>
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold text-foreground">{item.title}</span>{" "}
                      <span className="text-muted-foreground">{item.text}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            t && <p className="text-sm leading-relaxed text-muted-foreground">{wm(fillName(t.what, first))}</p>
          )}

          {blockers.length > 0 && step.state === "next" && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              <p className="flex items-center gap-1.5 font-semibold"><Lock className="h-3.5 w-3.5" /> On hold because</p>
              <ul className="mt-1 space-y-0.5">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          )}

          {!mine && step.state === "next" && (
            <p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">{waitingText}</p>
          )}
        </div>

        {/* Right: the activity itself */}
        <div className={cn("border-t border-border/60 pt-3", !embedded && "md:border-t-0 md:border-l md:pl-5 md:pt-0")}>
          {isKyc && (step.state === "next" || step.state === "done") && (
            <KycPanel workflowId={workflowId} kyc={records?.kyc} viewer={viewer} clientFirst={first} />
          )}
          {isSign && (step.state === "next" || step.state === "done") && (
            <SignDocsPanel workflowId={workflowId} signed={records?.signed ?? []} viewer={viewer} clientName={clientName} />
          )}

          {isAstute && (
            <AstutePanel patientId={records?.patientId} holdings={records?.holdings ?? []} viewer={viewer} />
          )}
          {isPersonal && reached && viewer === "client" && (
            <a href="/patient/details?section=health&returnTo=/my-workspace" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
              Open my profile to complete personal information →
            </a>
          )}
          {isPersonal && reached && <PersonalInfoPanel patientId={records?.patientId} personal={records?.personal} />}
          {isQuote && reached && <QuotesPanel label={step.label} viewer={viewer} workflowId={workflowId} records={records} clientFirst={first} />}
          {isLater && reached && <LaterStepPanel label={step.label} viewer={viewer} workflowId={workflowId} records={records} clientFirst={first} clientFullName={clientName} onOpenDocuments={onOpenDocuments} />}
          {isSchedule && reached && <ScheduleMeetingPanel appointments={records?.appointments ?? []} viewer={viewer} />}
          {isCapture && reached && (
            <CaptureFinancialsPanel patientId={records?.patientId} sessions={records?.sessions ?? []} financials={records?.financials} viewer={viewer} clientFirst={first} />
          )}
          {isVerify && reached && (
            <VerifyFinancialsPanel patientId={records?.patientId} financials={records?.financials} viewer={viewer} clientFirst={first} />
          )}

          {mine && step.state === "next" && t?.action && !custom && (
            <Button className="mt-3 w-full rounded-full" onClick={onOpenDocuments}>{t.action}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <p className="mb-1 text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
