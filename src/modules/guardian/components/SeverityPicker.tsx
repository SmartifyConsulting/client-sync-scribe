import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type Severity = "critical" | "high" | "moderate";
export type SeverityResult = { severity: Severity; conscious: boolean | null; breathing: boolean | null };

const OPTIONS: { value: Severity; emoji: string; title: string; sub: string; tone: string }[] = [
  { value: "critical", emoji: "🟥", title: "Life-threatening", sub: "Not breathing, severe bleeding, unconscious", tone: "border-red-500/50 bg-red-500/10 hover:bg-red-500/15" },
  { value: "high", emoji: "🟧", title: "Urgent", sub: "Serious pain or injury", tone: "border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/15" },
  { value: "moderate", emoji: "🟨", title: "Non-urgent", sub: "Stable, needs help", tone: "border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/15" },
];

export const SeverityPicker = ({
  open, onSubmit, onSkip,
}: { open: boolean; onSubmit: (r: SeverityResult) => void; onSkip: () => void }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [severity, setSeverity] = useState<Severity>("high");
  const [conscious, setConscious] = useState<boolean | null>(null);
  const [breathing, setBreathing] = useState<boolean | null>(null);

  const pick = (s: Severity) => {
    setSeverity(s);
    if (s === "moderate") onSubmit({ severity: s, conscious: null, breathing: null });
    else setStep(2);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>What's happening?</DialogTitle>
              <p className="text-xs text-muted-foreground">Tap one — this prioritises your help.</p>
            </DialogHeader>
            <div className="mt-2 space-y-2">
              {OPTIONS.map((o) => (
                <button key={o.value} onClick={() => pick(o.value)} className={`w-full rounded-2xl border p-4 text-left transition ${o.tone}`}>
                  <p className="text-base font-bold">{o.emoji} {o.title}</p>
                  <p className="text-xs text-muted-foreground">{o.sub}</p>
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={onSkip} className="mt-2 text-xs">Skip — I can't answer right now</Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Quick check</DialogTitle>
              <p className="text-xs text-muted-foreground">Helps responders prepare.</p>
            </DialogHeader>
            <div className="mt-2 space-y-3">
              <YesNoSkip label="Is the person conscious?" value={conscious} onChange={setConscious} />
              <YesNoSkip label="Are they breathing?" value={breathing} onChange={setBreathing} />
            </div>
            <Button onClick={() => onSubmit({ severity, conscious, breathing })} className="mt-3 w-full">Send for help</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const YesNoSkip = ({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) => (
  <div>
    <p className="mb-1 text-sm font-medium">{label}</p>
    <div className="flex gap-2">
      {[{ l: "Yes", v: true }, { l: "No", v: false }, { l: "Skip", v: null }].map((o) => (
        <button key={o.l} onClick={() => onChange(o.v as any)}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${value === o.v ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>
          {o.l}
        </button>
      ))}
    </div>
  </div>
);
