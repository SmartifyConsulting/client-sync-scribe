import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { CalendarDays, Loader2, Mic, Wallet as Pill, Plus, Settings2, Trash2, Utensils, X, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  SECTION_CONTENT_CLASS,
  SECTION_ITEM_CLASS,
  SECTION_TRIGGER_ALWAYS_GREEN_CLASS,
} from "@/components/ui/section-accordion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BiologPayload,
  EMPTY_PAYLOAD,
  EntryExercise,
  MEAL_SLOTS,
  MealSlot,
} from "./types";

import {
  todayISO,
  useBiologEntry,
  useBiologExercises,
  useBiologFoods,
  useBiologMedications,
  useBiologSections,
  useRemoveLibraryItem,
  useSaveEntry,
} from "./useBiolog";
import { BiologVoiceCheckIn } from "./BiologVoiceCheckIn";
import { ExerciseSection } from "./ExerciseSection";


const LABEL = "text-xs font-bold text-foreground";

interface Props {
  ownerUserId?: string;
  readOnly?: boolean;
}

const NEW_DAY_PAYLOAD: BiologPayload = {
  ...EMPTY_PAYLOAD,
  meals: MEAL_SLOTS.map(({ slot }) => ({ slot, foods: ["Water"] })),
};

export function BiologToday({ ownerUserId, readOnly }: Props) {
  const [, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(todayISO());
  const { data: sections = [] } = useBiologSections(ownerUserId);
  const { data: foods = [] } = useBiologFoods(ownerUserId);
  const { data: exercises = [] } = useBiologExercises(ownerUserId);
  const { data: medications = [] } = useBiologMedications(ownerUserId);
  const { data: entry, isLoading } = useBiologEntry(date, ownerUserId);
  const saveEntry = useSaveEntry(ownerUserId);
  const removeFoodItem = useRemoveLibraryItem("biolog_foods", "biolog-foods", ownerUserId);

  const [payload, setPayload] = useState<BiologPayload>(EMPTY_PAYLOAD);
  const [note, setNote] = useState("");
  const [freeFood, setFreeFood] = useState<Record<string, string>>({});
  const skipNextAutosave = useRef(true);

  useEffect(() => {
    skipNextAutosave.current = true;
    setPayload(entry?.payload ?? NEW_DAY_PAYLOAD);
    setNote(entry?.note ?? "");
  }, [entry, date]);

  // Autosave shortly after any change, so check-ins don't need a manual save step.
  useEffect(() => {
    if (readOnly) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      saveEntry.mutate(
        { date, payload, note },
        { onError: (err: any) => toast.error(err?.message || "Could not save your check-in.") },
      );
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, note]);

  const goToCustomise = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "customise");
      return next;
    });
  };

  const setWeight = (value: number) => setPayload((p) => ({ ...p, weight: value }));

  const setMealTime = (slot: MealSlot, time: string) =>
    setPayload((p) => {
      const meals = [...(p.meals ?? [])];
      const idx = meals.findIndex((m) => m.slot === slot);
      if (idx >= 0) meals[idx] = { ...meals[idx], time };
      else meals.push({ slot, foods: [], time });
      return { ...p, meals };
    });

  const mealTime = (slot: MealSlot) => payload.meals?.find((m) => m.slot === slot)?.time ?? "";

  const enabledSections = useMemo(
    () => sections.filter((s) => s.enabled && s.key !== "weight"),
    [sections],
  );
  const weightEnabled = sections.find((s) => s.key === "weight")?.enabled ?? true;

  const setRating = (key: string, value: number) =>
    setPayload((p) => ({ ...p, ratings: { ...p.ratings, [key]: value } }));

  const toggleFood = (slot: MealSlot, name: string) =>
    setPayload((p) => {
      const meals = [...(p.meals ?? [])];
      const idx = meals.findIndex((m) => m.slot === slot);
      const current = idx >= 0 ? meals[idx].foods : [];
      const next = current.includes(name)
        ? current.filter((f) => f !== name)
        : [...current, name];
      if (idx >= 0) meals[idx] = { slot, foods: next };
      else meals.push({ slot, foods: next });
      return { ...p, meals };
    });

  const mealFoods = (slot: MealSlot) =>
    payload.meals?.find((m) => m.slot === slot)?.foods ?? [];

  const toggleExercise = (name: string) =>
    setPayload((p) => {
      const list = p.exercises ?? [];
      return list.some((e) => e.name === name)
        ? { ...p, exercises: list.filter((e) => e.name !== name) }
        : { ...p, exercises: [...list, { name, duration: null, performance: null }] };
    });

  const setExerciseField = (
    name: string,
    field: keyof EntryExercise,
    value: number | string | null,
  ) =>
    setPayload((p) => ({
      ...p,
      exercises: (p.exercises ?? []).map((e) =>
        e.name === name ? { ...e, [field]: value } : e,
      ),
    }));


  const toggleMedication = (label: string) =>
    setPayload((p) => {
      const list = p.medications ?? [];
      const existing = list.find((m) => m.label === label);
      return existing
        ? { ...p, medications: list.map((m) => (m.label === label ? { ...m, taken: !m.taken } : m)) }
        : { ...p, medications: [...list, { label, taken: true }] };
    });

  const medTaken = (label: string) =>
    payload.medications?.find((m) => m.label === label)?.taken ?? false;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <Input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value || todayISO())}
            className="h-9 w-[160px] text-xs"
          />
          <span className="text-xs text-muted-foreground">
            {format(parseISO(date), "EEEE d MMMM yyyy")}
          </span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <BiologVoiceCheckIn
              sections={enabledSections.map((s) => ({ key: s.key, label: s.label }))}
              foods={foods.map((f) => f.name)}
              exercises={exercises.map((e) => e.name)}
              medications={medications.map((m) => m.label)}
              onParsed={(parsed) => {
                setPayload((p) => ({
                  ratings: { ...p.ratings, ...(parsed.ratings ?? {}) },
                  meals: parsed.meals?.length ? parsed.meals : p.meals,
                  exercises: parsed.exercises?.length ? parsed.exercises : p.exercises,
                  medications: parsed.medications?.length ? parsed.medications : p.medications,
                }));
                if (parsed.note) setNote((n) => (n ? `${n}\n${parsed.note}` : parsed.note!));
              }}
            />
            <span className="text-xs text-muted-foreground min-w-[70px]">
              {saveEntry.isPending ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                </span>
              ) : (
                "Autosaved"
              )}
            </span>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex items-start gap-2 rounded-lg border border-neutral-300 bg-muted/40 p-3">
          <Mic className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Prefer to talk?</span> Tap{" "}
            <span className="font-semibold text-foreground">Voice check-in</span> and just describe your
            day out loud — how you're feeling, what you ate, any exercise or medication. We'll transcribe it
            and fill in the fields below automatically.
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="pb-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm">Bio Check-In</CardTitle>
              <p className="text-xs text-muted-foreground">
                Check in as often as you like during the day — the more data you add, the better the
                correlation reports you'll get.
              </p>
            </div>
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={goToCustomise}>
                <Settings2 className="h-4 w-4" />
                Customise
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 pt-3">
          {weightEnabled && (
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className={LABEL}>Weight (kg)</span>
                <Badge className="text-[10px] bg-primary text-white hover:bg-primary">
                  {payload.weight != null ? payload.weight : "—"}
                </Badge>
              </div>
              <Slider
                min={30}
                max={200}
                step={0.5}
                value={[payload.weight ?? 70]}
                disabled={readOnly}
                onValueChange={([v]) => setWeight(v)}
              />
            </div>
          )}
          {enabledSections.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No trackables yet — add them on the Customise tab.
            </p>
          )}
          {enabledSections.map((section) => {
            const value = payload.ratings?.[section.key] ?? 5;
            return (
              <div key={section.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={LABEL}>{section.label}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {payload.ratings?.[section.key] != null ? value : "—"}
                  </Badge>
                </div>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[value]}
                  disabled={readOnly}
                  onValueChange={([v]) => setRating(section.key, v)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Accordion type="multiple" className="divide-y divide-white overflow-hidden">
        <AccordionItem value="nutrition" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
            <span className="flex items-center gap-2 font-semibold text-sm">
              <Utensils className="h-4 w-4" /> Nutrition
            </span>
          </AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            <Accordion type="multiple" className="space-y-2 py-1">
              {MEAL_SLOTS.map(({ slot, label }) => {
                const slotFoods = mealFoods(slot);
                const slotKj = slotFoods.reduce((sum, name) => sum + (foods.find((f) => f.name === name)?.kilojoules ?? 0), 0);
                const slotKcal = slotFoods.reduce((sum, name) => sum + (foods.find((f) => f.name === name)?.calories ?? 0), 0);
                return (
                  <AccordionItem
                    key={slot}
                    value={slot}
                    className="border-0 !border-b-0 rounded-lg bg-muted/30 overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-1.5 border-0 rounded-none bg-transparent hover:no-underline hover:bg-muted/50">
                      <div className="flex flex-1 items-center justify-between pr-2">
                        <span className={LABEL}>{label}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {slotFoods.length > 0
                            ? `${slotFoods.length} item${slotFoods.length > 1 ? "s" : ""}${
                                slotKj > 0 ? ` · ${Math.round(slotKj)} kJ` : ""
                              }${slotKcal > 0 ? ` · ${Math.round(slotKcal)} kcal` : ""}`
                            : "Nothing logged"}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-1 pb-3 pt-1 space-y-2 bg-card">
                      {!readOnly && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">Time eaten</span>
                          <Input
                            type="time"
                            value={mealTime(slot)}
                            onChange={(e) => setMealTime(slot, e.target.value)}
                            className="h-8 w-28 text-xs"
                          />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {foods.map((food) => {
                          const active = mealFoods(slot).includes(food.name);
                          return (
                            <span
                              key={food.id}
                              className={cn(
                                "group inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                                active
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-neutral-300 hover:bg-muted",
                              )}
                            >
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => toggleFood(slot, food.name)}
                                title={
                                  food.kilojoules != null
                                    ? `${food.serving_size ?? ""} · ${food.kilojoules} kJ / ${food.calories} kcal`
                                    : undefined
                                }
                              >
                                {food.name}
                                {food.kilojoules != null && (
                                  <span className="opacity-70"> · {Math.round(food.kilojoules)}kJ</span>
                                )}
                              </button>
                              {!readOnly && (
                                <Trash2
                                  className="h-3 w-3 cursor-pointer opacity-0 group-hover:opacity-60 hover:!opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Remove "${food.name}" from your food list? You can add it back on the Customise tab.`)) {
                                      removeFoodItem.mutate(food.id);
                                    }
                                  }}
                                />
                              )}
                            </span>
                          );
                        })}
                        {mealFoods(slot)
                          .filter((f) => !foods.some((x) => x.name === f))
                          .map((f) => (
                            <span
                              key={f}
                              className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-3 py-1 text-xs text-primary-foreground"
                            >
                              {f}
                              {!readOnly && (
                                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFood(slot, f)} />
                              )}
                            </span>
                          ))}
                      </div>
                      {!readOnly && (
                        <div className="flex gap-2">
                          <Input
                            value={freeFood[slot] ?? ""}
                            placeholder="Add something else…"
                            className="h-8 max-w-[220px] text-xs"
                            onChange={(e) => setFreeFood((s) => ({ ...s, [slot]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && freeFood[slot]?.trim()) {
                                toggleFood(slot, freeFood[slot].trim());
                                setFreeFood((s) => ({ ...s, [slot]: "" }));
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!freeFood[slot]?.trim()) return;
                              toggleFood(slot, freeFood[slot].trim());
                              setFreeFood((s) => ({ ...s, [slot]: "" }));
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
            {(() => {
              const allFoods = MEAL_SLOTS.flatMap(({ slot }) => mealFoods(slot));
              const dayKj = allFoods.reduce((sum, name) => sum + (foods.find((f) => f.name === name)?.kilojoules ?? 0), 0);
              const dayKcal = allFoods.reduce((sum, name) => sum + (foods.find((f) => f.name === name)?.calories ?? 0), 0);
              if (dayKj === 0 && dayKcal === 0) return null;
              return (
                <div className="flex items-center justify-between border-t pt-3 text-xs font-semibold text-foreground">
                  <span>Total today</span>
                  <span>{Math.round(dayKj)} kJ · {Math.round(dayKcal)} kcal</span>
                </div>
              );
            })()}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="exercise" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
            <span className="flex items-center gap-2 font-semibold text-sm">
              <Dumbbell className="h-4 w-4" /> Exercise
            </span>
          </AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            <ExerciseSection
              exercises={exercises}
              logged={payload.exercises ?? []}
              readOnly={readOnly}
              onToggle={toggleExercise}
              onField={setExerciseField}
            />
          </AccordionContent>

        </AccordionItem>

        <AccordionItem value="medication" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
            <span className="flex items-center gap-2 font-semibold text-sm">
              <Pill className="h-4 w-4" /> Vitamins & Medication
            </span>
          </AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            {medications.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add what you take on the Customise tab.
              </p>
            )}
            {medications.map((med) => {
              const entry = payload.medications?.find((m) => m.label === med.label);
              return (
                <div key={med.id} className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={medTaken(med.label)}
                      disabled={readOnly}
                      onCheckedChange={() => toggleMedication(med.label)}
                    />
                    <span className="text-xs font-bold">{med.label}</span>
                    {med.dose_amount != null && (
                      <span className="text-[11px] text-muted-foreground">
                        {med.dose_amount} {med.dose_unit}
                      </span>
                    )}
                  </label>
                  {entry?.taken && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Quantity</span>
                      <Input
                        type="number"
                        min={1}
                        value={entry.quantity ?? 1}
                        disabled={readOnly}
                        className="h-8 w-16 text-xs"
                        onChange={(e) =>
                          setPayload((p) => ({
                            ...p,
                            medications: (p.medications ?? []).map((m) =>
                              m.label === med.label
                                ? { ...m, quantity: Math.max(1, Number(e.target.value) || 1) }
                                : m,
                            ),
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={note}
            disabled={readOnly}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything else worth remembering about today…"
            className="text-xs"
          />
        </CardContent>
      </Card>
    </div>
  );
}
