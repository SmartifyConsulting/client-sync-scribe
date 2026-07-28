import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, Loader2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BiologPayload,
  EMPTY_PAYLOAD,
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
  useSaveEntry,
} from "./useBiolog";
import { BiologVoiceCheckIn } from "./BiologVoiceCheckIn";

const LABEL = "text-xs font-bold text-foreground";

interface Props {
  ownerUserId?: string;
  readOnly?: boolean;
}

export function BiologToday({ ownerUserId, readOnly }: Props) {
  const [date, setDate] = useState(todayISO());
  const { data: sections = [] } = useBiologSections(ownerUserId);
  const { data: foods = [] } = useBiologFoods(ownerUserId);
  const { data: exercises = [] } = useBiologExercises(ownerUserId);
  const { data: medications = [] } = useBiologMedications(ownerUserId);
  const { data: entry, isLoading } = useBiologEntry(date, ownerUserId);
  const saveEntry = useSaveEntry(ownerUserId);

  const [payload, setPayload] = useState<BiologPayload>(EMPTY_PAYLOAD);
  const [note, setNote] = useState("");
  const [freeFood, setFreeFood] = useState<Record<string, string>>({});

  useEffect(() => {
    setPayload(entry?.payload ?? EMPTY_PAYLOAD);
    setNote(entry?.note ?? "");
  }, [entry, date]);

  const enabledSections = useMemo(
    () => sections.filter((s) => s.enabled),
    [sections],
  );

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

  const setExerciseField = (name: string, field: "duration" | "performance", value: number | null) =>
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

  const handleSave = async () => {
    try {
      await saveEntry.mutateAsync({ date, payload, note });
      toast.success("Check-in saved.");
    } catch (err: any) {
      toast.error(err?.message || "Could not save your check-in.");
    }
  };

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
            <Button size="sm" onClick={handleSave} disabled={saveEntry.isPending}>
              {saveEntry.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save check-in
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">How you felt</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Food</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {MEAL_SLOTS.map(({ slot, label }) => (
            <div key={slot} className="space-y-2">
              <span className={LABEL}>{label}</span>
              <div className="flex flex-wrap gap-1.5">
                {foods.map((food) => {
                  const active = mealFoods(slot).includes(food.name);
                  return (
                    <button
                      key={food.id}
                      type="button"
                      disabled={readOnly}
                      onClick={() => toggleFood(slot, food.name)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-neutral-300 hover:bg-muted",
                      )}
                    >
                      {food.name}
                    </button>
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
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Exercise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {exercises.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Add the exercises you do on the Customise tab.
            </p>
          )}
          {exercises.map((ex) => {
            const logged = payload.exercises?.find((e) => e.name === ex.name);
            return (
              <div key={ex.id} className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={!!logged}
                    disabled={readOnly}
                    onCheckedChange={() => toggleExercise(ex.name)}
                  />
                  <span className="text-xs font-bold">{ex.name}</span>
                </label>
                {logged && (
                  <>
                    <Input
                      type="number"
                      value={logged.duration ?? ""}
                      placeholder={ex.unit}
                      disabled={readOnly}
                      className="h-8 w-24 text-xs"
                      onChange={(e) =>
                        setExerciseField(
                          ex.name,
                          "duration",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Performance</span>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={logged.performance ?? ""}
                        disabled={readOnly}
                        className="h-8 w-16 text-xs"
                        onChange={(e) =>
                          setExerciseField(
                            ex.name,
                            "performance",
                            e.target.value === "" ? null : Number(e.target.value),
                          )
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Medication & supplements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {medications.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Add what you take on the Customise tab.
            </p>
          )}
          {medications.map((med) => (
            <label key={med.id} className="flex items-center gap-2">
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
          ))}
        </CardContent>
      </Card>

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
