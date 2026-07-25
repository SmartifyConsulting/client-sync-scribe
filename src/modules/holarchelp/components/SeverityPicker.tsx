import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

export type Severity = "critical" | "high" | "moderate";
export type SeverityResult = {
  severity: Severity;
  peopleCount: number;
  breathingCount: number;
  unconsciousCount: number;
  conscious: boolean | null;
  breathing: boolean | null;
};

const OPTIONS: { value: Severity; emoji: string; titleKey: string; subKey: string; tone: string }[] = [
  { value: "critical", emoji: "ðŸŸ¥", titleKey: "severityPicker.lifeThreatening", subKey: "severityPicker.lifeThreateningSub", tone: "border-red-500/50 bg-red-500/10 hover:bg-red-500/15" },
  { value: "high", emoji: "ðŸŸ§", titleKey: "severityPicker.urgent", subKey: "severityPicker.urgentSub", tone: "border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/15" },
  { value: "moderate", emoji: "ðŸŸ¨", titleKey: "severityPicker.nonUrgent", subKey: "severityPicker.nonUrgentSub", tone: "border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/15" },
];

const deriveLegacy = (people: number, breathing: number, unconscious: number) => ({
  breathing: breathing > 0 ? true : unconscious > 0 ? false : null,
  conscious: (people - unconscious) > 0 ? true : unconscious > 0 ? false : null,
});

export const SeverityPicker = ({
  open, onSubmit, onSkip,
}: { open: boolean; onSubmit: (r: SeverityResult) => void; onSkip: () => void }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [severity, setSeverity] = useState<Severity>("high");
  const [people, setPeople] = useState(1);
  const [breathing, setBreathing] = useState(1);
  const [unconscious, setUnconscious] = useState(0);

  const setPeopleClamped = (n: number) => {
    const next = Math.max(1, n);
    setPeople(next);
    setBreathing((b) => Math.min(b, next));
    setUnconscious((u) => Math.min(u, next));
  };

  const pick = (s: Severity) => {
    setSeverity(s);
    if (s === "moderate") {
      onSubmit({ severity: s, peopleCount: 1, breathingCount: 0, unconsciousCount: 0, conscious: null, breathing: null });
    } else {
      setStep(2);
    }
  };

  const submit = () => {
    const legacy = deriveLegacy(people, breathing, unconscious);
    onSubmit({ severity, peopleCount: people, breathingCount: breathing, unconsciousCount: unconscious, ...legacy });
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("severityPicker.whatHappening")}</DialogTitle>
              <p className="text-sm text-muted-foreground">{t("severityPicker.tapOne")}</p>
            </DialogHeader>
            <div className="mt-2 space-y-2">
              {OPTIONS.map((o) => (
                <button key={o.value} onClick={() => pick(o.value)} className={`w-full rounded-2xl border p-4 text-left transition ${o.tone}`}>
                  <p className="text-base font-bold">{o.emoji} {t(o.titleKey)}</p>
                  <p className="text-sm text-muted-foreground">{t(o.subKey)}</p>
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={onSkip} className="mt-2 text-sm">{t("severityPicker.skip")}</Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("severityPicker.quickCheck")}</DialogTitle>
              <p className="text-sm text-muted-foreground">{t("severityPicker.prepare")}</p>
            </DialogHeader>
            <div className="mt-3 space-y-3">
              <CountStepper
                label={t("severityPicker.peopleNeedHelp")}
                value={people}
                min={1}
                onChange={setPeopleClamped}
              />
              <CountStepper
                label={t("severityPicker.breathingCount")}
                value={breathing}
                min={0}
                max={people}
                onChange={setBreathing}
              />
              <CountStepper
                label={t("severityPicker.unconsciousCount")}
                value={unconscious}
                min={0}
                max={people}
                onChange={setUnconscious}
              />
            </div>
            <Button onClick={submit} className="mt-3 w-full">{t("severityPicker.sendHelp")}</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const CountStepper = ({
  label, value, min = 0, max, onChange,
}: { label: string; value: number; min?: number; max?: number; onChange: (n: number) => void }) => {
  const { t } = useTranslation();
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(max != null ? Math.min(max, value + 1) : value + 1);
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label={t("severityPicker.decrease")}
          className="flex h-11 w-11 items-center justify-center rounded-xl border bg-background text-foreground transition hover:bg-muted disabled:opacity-40"
        >
          <Minus className="h-5 w-5" />
        </button>
        <div className="min-w-[3rem] text-center text-2xl font-bold tabular-nums">{value}</div>
        <button
          type="button"
          onClick={inc}
          disabled={max != null && value >= max}
          aria-label={t("severityPicker.increase")}
          className="flex h-11 w-11 items-center justify-center rounded-xl border bg-background text-foreground transition hover:bg-muted disabled:opacity-40"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

