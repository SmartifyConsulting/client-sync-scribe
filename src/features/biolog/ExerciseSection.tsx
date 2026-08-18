import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { BiologExercise, EntryExercise } from "./types";

const CATEGORY_LABELS: Record<string, string> = {
  cardio: "Cardio",
  strength: "Strength",
  flexibility: "Flexibility",
  sports: "Sports",
  other: "Other",
};

const CATEGORY_ORDER = ["cardio", "strength", "flexibility", "sports", "other"];

const normalise = (c?: string) => {
  const key = (c ?? "").toLowerCase();
  return CATEGORY_LABELS[key] ? key : "other";
};

const LABEL = "text-[11px] font-semibold text-foreground";

function NumField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <span className={LABEL}>{label}</span>
      <Input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        className="h-8 w-full text-xs"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}

function ScaleField({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  value: number | null | undefined;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={LABEL}>{label}</span>
        <span className="text-[11px] text-muted-foreground">{value ?? "–"}/10</span>
      </div>
      <Slider
        value={[value ?? 5]}
        min={1}
        max={10}
        step={1}
        disabled={disabled}
        onValueChange={([v]) => onChange(v)}
      />
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function summaryOf(logged: EntryExercise, unit: string) {
  const bits: string[] = [];
  if (logged.duration != null) bits.push(`${logged.duration} ${unit}`);
  if (logged.distance != null) bits.push(`${logged.distance} km`);
  if (logged.sets != null || logged.reps != null)
    bits.push(`${logged.sets ?? "–"} × ${logged.reps ?? "–"}`);
  if (logged.weight != null) bits.push(`${logged.weight} kg`);
  if (logged.intensity != null) bits.push(`intensity ${logged.intensity}`);
  if (logged.heartRate != null) bits.push(`${logged.heartRate} bpm`);
  return bits.join(" · ");
}

interface Props {
  exercises: BiologExercise[];
  logged: EntryExercise[];
  readOnly?: boolean;
  onToggle: (name: string) => void;
  onField: (name: string, field: keyof EntryExercise, value: number | string | null) => void;
}

/** Category-first exercise logging: pick Cardio/Strength/… then log detail on sliding scales. */
export function ExerciseSection({ exercises, logged, readOnly, onToggle, onField }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, BiologExercise[]>();
    for (const ex of exercises) {
      const key = normalise(ex.category);
      map.set(key, [...(map.get(key) ?? []), ex]);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map(
      (c) => [c, map.get(c)!] as [string, BiologExercise[]],
    );
  }, [exercises]);

  const [category, setCategory] = useState<string | null>(null);
  const active = category && grouped.some(([c]) => c === category) ? category : grouped[0]?.[0];
  const list = grouped.find(([c]) => c === active)?.[1] ?? [];

  const totalMinutes = logged.reduce((sum, e) => sum + (e.duration ?? 0), 0);

  if (exercises.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Add the exercises you do on the Customise tab.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {grouped.map(([key, items]) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
              key === active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {CATEGORY_LABELS[key]} ({items.length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((ex) => {
          const entry = logged.find((e) => e.name === ex.name);
          const cat = normalise(ex.category);
          return (
            <div
              key={ex.id}
              className={cn(
                "rounded-lg border p-2.5",
                entry ? "border-primary/40 bg-muted/30" : "border-border",
              )}
            >
              <label className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Checkbox
                    checked={!!entry}
                    disabled={readOnly}
                    onCheckedChange={() => onToggle(ex.name)}
                  />
                  <span className="text-xs font-bold">{ex.name}</span>
                </span>
                {entry && (
                  <span className="text-[10px] text-muted-foreground">
                    {summaryOf(entry, ex.unit)}
                  </span>
                )}
              </label>

              {entry && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <NumField
                      label={`Duration (${ex.unit})`}
                      value={entry.duration}
                      disabled={readOnly}
                      onChange={(v) => onField(ex.name, "duration", v)}
                    />
                    {cat === "cardio" && (
                      <>
                        <NumField
                          label="Distance (km)"
                          value={entry.distance}
                          disabled={readOnly}
                          onChange={(v) => onField(ex.name, "distance", v)}
                        />
                        <NumField
                          label="Avg HR (bpm)"
                          value={entry.heartRate}
                          disabled={readOnly}
                          onChange={(v) => onField(ex.name, "heartRate", v)}
                        />
                      </>
                    )}
                    {cat === "strength" && (
                      <>
                        <NumField
                          label="Sets"
                          value={entry.sets}
                          disabled={readOnly}
                          onChange={(v) => onField(ex.name, "sets", v)}
                        />
                        <NumField
                          label="Reps"
                          value={entry.reps}
                          disabled={readOnly}
                          onChange={(v) => onField(ex.name, "reps", v)}
                        />
                        <NumField
                          label="Weight (kg)"
                          value={entry.weight}
                          disabled={readOnly}
                          onChange={(v) => onField(ex.name, "weight", v)}
                        />
                      </>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ScaleField
                      label="Intensity"
                      hint="1 = easy · 10 = max effort"
                      value={entry.intensity}
                      disabled={readOnly}
                      onChange={(v) => onField(ex.name, "intensity", v)}
                    />
                    <ScaleField
                      label="Effort"
                      hint="How hard did it feel?"
                      value={entry.effort ?? entry.performance}
                      disabled={readOnly}
                      onChange={(v) => onField(ex.name, "effort", v)}
                    />
                  </div>

                  <Input
                    value={entry.note ?? ""}
                    placeholder="Note (optional)"
                    disabled={readOnly}
                    className="h-8 text-xs"
                    onChange={(e) => onField(ex.name, "note", e.target.value || null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalMinutes > 0 && (
        <div className="flex items-center justify-between border-t pt-2 text-xs font-semibold text-foreground">
          <span>Total today</span>
          <span>{totalMinutes} minutes</span>
        </div>
      )}
    </div>
  );
}
