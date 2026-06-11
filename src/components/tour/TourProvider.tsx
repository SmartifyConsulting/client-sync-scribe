import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { ArrowCallout } from "./ArrowCallout";
import { doctorTourSteps, patientTourSteps, type TourStep } from "./tourSteps";

interface TourContextValue {
  start: () => void;
  active: boolean;
}

const TourContext = createContext<TourContextValue>({ start: () => {}, active: false });

export const useTour = () => useContext(TourContext);

const findTarget = (id: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-tour="${id}"]`);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { role, isPatient, loading: roleLoading } = useUserRole();
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [active, setActive] = useState(false);
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
  const [autoCheckDone, setAutoCheckDone] = useState(false);

  const finish = useCallback(
    async (skipped: boolean) => {
      setActive(false);
      setTargetEl(null);
      if (!user) return;
      const field = skipped ? "tour_skipped_at" : "tour_completed_at";
      await supabase.from("profiles").update({ [field]: new Date().toISOString() } as any).eq("id", user.id);
    },
    [user]
  );

  const start = useCallback(() => {
    const next = isPatient ? patientTourSteps : doctorTourSteps;
    if (!next.length) return;
    setSteps(next);
    setStepIndex(0);
    setActive(true);
  }, [isPatient]);

  // Auto-start once per user if they've never finished or skipped
  useEffect(() => {
    if (autoCheckDone || !user || roleLoading || !role) return;
    setAutoCheckDone(true);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("tour_completed_at, tour_skipped_at")
        .eq("id", user.id)
        .maybeSingle();
      if (!data) return;
      const t = data as any;
      if (!t.tour_completed_at && !t.tour_skipped_at) {
        // Delay so the dashboard mounts its data-tour targets first
        setTimeout(() => start(), 1500);
      }
    })();
  }, [user, role, roleLoading, autoCheckDone, start]);

  // Resolve target element for current step; skip if missing after retries
  useEffect(() => {
    if (!active) return;
    let attempts = 0;
    const tryFind = () => {
      const step = steps[stepIndex];
      if (!step) return;
      const el = findTarget(step.target);
      if (el) {
        setTargetEl(el);
      } else if (attempts++ < 10) {
        setTimeout(tryFind, 300);
      } else {
        // Move on
        if (stepIndex + 1 >= steps.length) finish(false);
        else setStepIndex((i) => i + 1);
      }
    };
    setTargetEl(null);
    tryFind();
  }, [active, stepIndex, steps, finish]);

  const handleNext = () => {
    if (stepIndex + 1 >= steps.length) finish(false);
    else setStepIndex((i) => i + 1);
  };

  const handleSkip = () => finish(true);

  const value = useMemo(() => ({ start, active }), [start, active]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && targetEl && steps[stepIndex] && (
        <ArrowCallout
          targetEl={targetEl}
          title={steps[stepIndex].title}
          message={steps[stepIndex].message}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          onNext={handleNext}
          onSkip={handleSkip}
        />
      )}
    </TourContext.Provider>
  );
}
