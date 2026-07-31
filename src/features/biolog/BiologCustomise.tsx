import { useState } from "react";
import { Check, Pencil, Plus, Sparkles, Trash2, Utensils, Dumbbell, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  SECTION_CONTENT_CLASS,
  SECTION_ITEM_CLASS,
  SECTION_TRIGGER_ALWAYS_GREEN_CLASS,
} from "@/components/ui/section-accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BUILT_IN_CORRELATIONS, friendlyLabel } from "./correlations";
import { useBiologEntries } from "./useBiolog";
import type { BiologExercise, BiologFood, BiologMedication } from "./types";

/** Checkbox-list popover for picking one or more of a set of options. */
function MultiSelectField({
  label,
  options,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  options: { value: string; label: string }[];
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 w-[220px] justify-start text-xs font-normal">
            {values.length ? values.map(friendlyLabel).join(", ") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] max-h-72 overflow-y-auto p-2">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"
            >
              <span>{o.label}</span>
              {values.includes(o.value) && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

const FOOD_CATEGORY_LABELS: Record<string, string> = {
  protein: "Protein",
  carbs: "Carbs",
  vegetables: "Vegetables",
  fruits: "Fruits",
  fats: "Fats",
  drinks: "Drinks",
  baked_goods: "Baked Goods",
  treats: "Treats",
  other: "Other",
};

const EXERCISE_CATEGORY_LABELS: Record<string, string> = {
  cardio: "Cardio",
  strength: "Strength",
  flexibility: "Flexibility & Mobility",
  sports: "Sports",
  general: "Other",
};

function groupByCategory<T extends { category: string }>(
  items: T[],
  labels: Record<string, string>,
) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.category || "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => (labels[a] ?? a).localeCompare(labels[b] ?? b))
    .map(([key, groupItems]) => ({ key, label: labels[key] ?? key, items: groupItems }));
}
import {
  useAddLibraryItem,
  useBiologCorrelations,
  useBiologExercises,
  useBiologFoods,
  useBiologMedications,
  useBiologSections,
  useDeleteCorrelation,
  useDeleteSection,
  useRemoveLibraryItem,
  useSaveCorrelation,
  useSaveSection,
  useUpdateLibraryItem,
} from "./useBiolog";

const EXERCISE_CATEGORY_OPTIONS = [
  { value: "cardio", label: "Cardio" },
  { value: "strength", label: "Strength" },
  { value: "flexibility", label: "Flexibility & Mobility" },
  { value: "sports", label: "Sports" },
];

interface Props {
  ownerUserId?: string;
}

const LABEL = "text-xs font-bold text-foreground";

export function BiologCustomise({ ownerUserId }: Props) {
  const { data: sections = [] } = useBiologSections(ownerUserId);
  const saveSection = useSaveSection(ownerUserId);
  const deleteSection = useDeleteSection(ownerUserId);

  const { data: foods = [] } = useBiologFoods(ownerUserId);
  const { data: exercises = [] } = useBiologExercises(ownerUserId);
  const { data: medications = [] } = useBiologMedications(ownerUserId);
  const addFood = useAddLibraryItem("biolog_foods", "biolog-foods", ownerUserId);
  const addExercise = useAddLibraryItem("biolog_exercises", "biolog-exercises", ownerUserId);
  const addMedication = useAddLibraryItem("biolog_medications", "biolog-medications", ownerUserId);
  const removeFood = useRemoveLibraryItem("biolog_foods", "biolog-foods", ownerUserId);
  const removeExercise = useRemoveLibraryItem("biolog_exercises", "biolog-exercises", ownerUserId);
  const removeMedication = useRemoveLibraryItem("biolog_medications", "biolog-medications", ownerUserId);
  const updateMedication = useUpdateLibraryItem("biolog_medications", "biolog-medications", ownerUserId);

  const { data: correlationRows = [] } = useBiologCorrelations(ownerUserId);
  const saveCorrelation = useSaveCorrelation(ownerUserId);
  const deleteCorrelation = useDeleteCorrelation(ownerUserId);
  const { data: entries = [] } = useBiologEntries(ownerUserId);

  const [newSection, setNewSection] = useState("");
  const [newGroup, setNewGroup] = useState("physical");
  const [newFood, setNewFood] = useState("");
  const [newFoodKj, setNewFoodKj] = useState("");
  const [newExercise, setNewExercise] = useState("");
  const [newExerciseCategory, setNewExerciseCategory] = useState("cardio");
  const [newExerciseUnit, setNewExerciseUnit] = useState("minutes");
  const [newMedication, setNewMedication] = useState("");
  const [newMedDose, setNewMedDose] = useState("");
  const [newMedUnit, setNewMedUnit] = useState("mg");

  const [corrTitle, setCorrTitle] = useState("");
  const [corrInputs, setCorrInputs] = useState<string[]>(["food"]);
  const [corrOutcomes, setCorrOutcomes] = useState<string[]>([]);

  const [editingCorrKey, setEditingCorrKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editInputs, setEditInputs] = useState<string[]>([]);
  const [editOutcomes, setEditOutcomes] = useState<string[]>([]);

  const [suggestions, setSuggestions] = useState<
    { title: string; input_variable: string; outcome_variables: string[]; rationale?: string }[] | null
  >(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const outcomeOptions = sections.map((s) => ({ value: s.key, label: s.label }));
  const inputOptions = [
    { value: "food", label: "Food" },
    { value: "exercise", label: "Exercise" },
    { value: "medication", label: "Medication" },
    ...outcomeOptions,
    ...foods.map((f) => ({ value: `food:${f.name}`, label: `Food · ${f.name}` })),
    ...exercises.map((e) => ({ value: `exercise:${e.name}`, label: `Exercise · ${e.name}` })),
    ...medications.map((m) => ({ value: `medication:${m.label}`, label: `Medication · ${m.label}` })),
  ];

  const startEditCorr = (key: string, title: string, inputVar: string, outcomeVars: string[]) => {
    setEditingCorrKey(key);
    setEditTitle(title);
    setEditInputs(inputVar.split(",").map((s) => s.trim()).filter(Boolean));
    setEditOutcomes(outcomeVars);
  };

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    setSuggestions(null);
    try {
      const { data, error } = await supabase.functions.invoke("biolog-suggest-correlations", {
        body: {
          entries: entries.map((e) => ({ date: e.entry_date, ...e.payload })),
          existing: [...BUILT_IN_CORRELATIONS.map((c) => c.title), ...correlationRows.map((r) => r.title)],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuggestions(data?.suggestions ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Could not fetch suggestions.");
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const builtInDisabled = (title: string) =>
    correlationRows.some((r) => r.title === title && !r.is_custom && !r.enabled);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">What variables you track</CardTitle>
          <p className="text-xs text-muted-foreground">
            Turn off anything you don't want to rate on the Today screen, or add your own.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <div key={section.id} className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={section.enabled}
                    onCheckedChange={(checked) =>
                      saveSection.mutate({ ...section, enabled: checked })
                    }
                  />
                  <span className={LABEL}>{section.label}</span>
                  <span className="text-[11px] text-muted-foreground">{section.group_name}</span>
                </div>
                {section.is_custom && (
                  <Button size="sm" variant="ghost" onClick={() => deleteSection.mutate(section.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-2 pt-2">
            <div className="space-y-1.5">
              <Label className={LABEL}>Add your own</Label>
              <Input
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="e.g. Headache"
                className="h-9 w-[200px] text-xs"
              />
            </div>
            <Select value={newGroup} onValueChange={setNewGroup}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="mental">Mental</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={async () => {
                const label = newSection.trim();
                if (!label) return;
                await saveSection.mutateAsync({
                  key: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                  label,
                  group_name: newGroup,
                  sort_order: sections.length,
                  is_custom: true,
                });
                setNewSection("");
                toast.success("Trackable added.");
              }}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Preferences</h2>
        <p className="text-xs text-muted-foreground">
          Select the foods you frequently eat, your regular exercise routine, and the medications or
          supplements you take. These become your quick-pick options on the Today screen.
        </p>
      </div>

      <Accordion type="multiple" className="rounded-lg overflow-hidden divide-y divide-white">
        <AccordionItem value="foods" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
            <span className="flex items-center gap-2 font-semibold text-sm">
              <Utensils className="h-4 w-4" /> Foods
            </span>
          </AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            <FoodLibraryContent
              items={foods}
              value={newFood}
              setValue={setNewFood}
              kj={newFoodKj}
              setKj={setNewFoodKj}
              onAdd={() => {
                const kilojoules = newFoodKj.trim() ? Number(newFoodKj) : undefined;
                addFood.mutate({
                  name: newFood.trim(),
                  ...(kilojoules != null && !Number.isNaN(kilojoules)
                    ? { kilojoules, calories: Math.round(kilojoules / 4.184) }
                    : {}),
                });
              }}
              onRemove={(id) => removeFood.mutate(id)}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="exercises" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
            <span className="flex items-center gap-2 font-semibold text-sm">
              <Dumbbell className="h-4 w-4" /> Exercises
            </span>
          </AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            <p className="text-xs text-muted-foreground -mt-1 mb-2">
              These are the exercises selected here that appear on the Today screen, where you capture
              duration and performance for each session.
            </p>
            <ExerciseLibraryContent
              items={exercises}
              value={newExercise}
              setValue={setNewExercise}
              category={newExerciseCategory}
              setCategory={setNewExerciseCategory}
              unit={newExerciseUnit}
              setUnit={setNewExerciseUnit}
              onAdd={() =>
                addExercise.mutate({
                  name: newExercise.trim(),
                  category: newExerciseCategory,
                  unit: newExerciseUnit.trim() || "minutes",
                })
              }
              onRemove={(id) => removeExercise.mutate(id)}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="medications" className={SECTION_ITEM_CLASS}>
          <AccordionTrigger className={SECTION_TRIGGER_ALWAYS_GREEN_CLASS}>
            <span className="flex items-center gap-2 font-semibold text-sm">
              <Pill className="h-4 w-4" /> Medication & supplements
            </span>
          </AccordionTrigger>
          <AccordionContent className={SECTION_CONTENT_CLASS}>
            <MedicationLibraryContent
              items={medications}
              value={newMedication}
              setValue={setNewMedication}
              dose={newMedDose}
              setDose={setNewMedDose}
              unit={newMedUnit}
              setUnit={setNewMedUnit}
              onAdd={() => {
                const dose_amount = newMedDose.trim() ? Number(newMedDose) : undefined;
                addMedication.mutate({
                  label: newMedication.trim(),
                  ...(dose_amount != null && !Number.isNaN(dose_amount)
                    ? { dose_amount, dose_unit: newMedUnit.trim() || "mg" }
                    : {}),
                });
              }}
              onRemove={(id) => removeMedication.mutate(id)}
              onUpdate={(id, values) => updateMedication.mutate({ id, values })}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm">Correlations</CardTitle>
              <p className="text-xs text-muted-foreground">
                Correlations watch whether two things tend to happen together over time — for example,
                whether poor sleep tends to line up with more headaches, or a specific food with worse
                energy the next day. Turn on the ones you want tracked, edit them, or build your own below.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={fetchSuggestions} disabled={loadingSuggestions}>
              <Sparkles className="h-4 w-4" />
              {loadingSuggestions ? "Thinking…" : "AI Suggestions"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">
                {suggestions.length === 0
                  ? "No new suggestions yet — keep checking in and try again in a few days."
                  : "Suggested correlations based on your check-ins:"}
              </p>
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-md bg-background p-2">
                  <div>
                    <p className="text-xs font-bold text-foreground">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {friendlyLabel(s.input_variable)} → {s.outcome_variables.map(friendlyLabel).join(", ")}
                      {s.rationale ? ` — ${s.rationale}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await saveCorrelation.mutateAsync({
                        title: s.title,
                        group_name: "AI suggested",
                        input_variable: s.input_variable,
                        outcome_variables: s.outcome_variables,
                      });
                      setSuggestions((prev) => prev?.filter((x) => x !== s) ?? null);
                      toast.success("Correlation added.");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setSuggestions(null)}>
                Dismiss
              </Button>
            </div>
          )}

          {BUILT_IN_CORRELATIONS.filter((c) => {
            const override = correlationRows.find((r) => r.title === c.title && !r.is_custom);
            return override?.group_name !== "__removed__";
          }).map((c) => {
            const override = correlationRows.find((r) => r.title === c.title && !r.is_custom);
            const inputVar = override?.input_variable ?? c.inputVar;
            const outcomeVars = override?.outcome_variables ?? c.outcomeVars;
            const key = `builtin-${c.id}`;
            return editingCorrKey === key ? (
              <CorrelationEditRow
                key={key}
                title={editTitle}
                setTitle={setEditTitle}
                inputs={editInputs}
                setInputs={setEditInputs}
                outcomes={editOutcomes}
                setOutcomes={setEditOutcomes}
                inputOptions={inputOptions}
                outcomeOptions={outcomeOptions}
                onCancel={() => setEditingCorrKey(null)}
                onSave={async () => {
                  await saveCorrelation.mutateAsync({
                    id: override?.id,
                    title: editTitle.trim(),
                    group_name: c.group,
                    input_variable: editInputs.join(","),
                    outcome_variables: editOutcomes,
                    enabled: override?.enabled ?? true,
                    is_custom: false,
                  });
                  setEditingCorrKey(null);
                  toast.success("Correlation updated.");
                }}
              />
            ) : (
              <div key={key} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={!builtInDisabled(c.title)}
                    onCheckedChange={(checked) => {
                      saveCorrelation.mutate({
                        id: override?.id,
                        title: override?.title ?? c.title,
                        group_name: c.group,
                        input_variable: inputVar,
                        outcome_variables: outcomeVars,
                        enabled: checked,
                        is_custom: false,
                      });
                    }}
                  />
                  <span className={LABEL}>{override?.title ?? c.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    (Monitor how {friendlyLabel(inputVar)} affects your{" "}
                    {outcomeVars.map(friendlyLabel).join(" and ")})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEditCorr(key, override?.title ?? c.title, inputVar, outcomeVars)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      saveCorrelation.mutate({
                        id: override?.id,
                        title: c.title,
                        group_name: "__removed__",
                        input_variable: inputVar,
                        outcome_variables: outcomeVars,
                        enabled: false,
                        is_custom: false,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
          {correlationRows.some((r) => !r.is_custom && r.group_name === "__removed__") && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground"
              onClick={() => {
                correlationRows
                  .filter((r) => !r.is_custom && r.group_name === "__removed__")
                  .forEach((r) => deleteCorrelation.mutate(r.id));
              }}
            >
              Restore removed defaults
            </Button>
          )}

          {correlationRows
            .filter((r) => r.is_custom)
            .map((r) => {
              const key = `custom-${r.id}`;
              return editingCorrKey === key ? (
                <CorrelationEditRow
                  key={key}
                  title={editTitle}
                  setTitle={setEditTitle}
                  inputs={editInputs}
                  setInputs={setEditInputs}
                  outcomes={editOutcomes}
                  setOutcomes={setEditOutcomes}
                  inputOptions={inputOptions}
                  outcomeOptions={outcomeOptions}
                  onCancel={() => setEditingCorrKey(null)}
                  onSave={async () => {
                    await saveCorrelation.mutateAsync({
                      ...r,
                      title: editTitle.trim(),
                      input_variable: editInputs.join(","),
                      outcome_variables: editOutcomes,
                    });
                    setEditingCorrKey(null);
                    toast.success("Correlation updated.");
                  }}
                />
              ) : (
                <div key={key} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={r.enabled}
                      onCheckedChange={(checked) =>
                        saveCorrelation.mutate({ ...r, enabled: checked })
                      }
                    />
                    <span className={LABEL}>{r.title}</span>
                    <span className="text-[11px] text-muted-foreground">
                      (Monitor how {friendlyLabel(r.input_variable)} affects your{" "}
                      {r.outcome_variables.map(friendlyLabel).join(" and ")})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditCorr(key, r.title, r.input_variable, r.outcome_variables)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteCorrelation.mutate(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}

          <div className="flex flex-wrap items-end gap-2 pt-2">
            <div className="space-y-1.5">
              <Label className={LABEL}>Title</Label>
              <Input
                value={corrTitle}
                onChange={(e) => setCorrTitle(e.target.value)}
                placeholder="e.g. Headaches vs Coffee"
                className="h-9 w-[220px] text-xs"
              />
            </div>
            <MultiSelectField
              label="When I have"
              options={inputOptions}
              values={corrInputs}
              onChange={setCorrInputs}
              placeholder="Choose one or more"
            />
            <MultiSelectField
              label="Watch"
              options={outcomeOptions}
              values={corrOutcomes}
              onChange={setCorrOutcomes}
              placeholder="Choose one or more"
            />
            <Button
              size="sm"
              onClick={async () => {
                if (!corrTitle.trim() || !corrOutcomes.length || !corrInputs.length) {
                  return toast.error("Give it a title, at least one input, and at least one outcome to watch.");
                }
                await saveCorrelation.mutateAsync({
                  title: corrTitle.trim(),
                  group_name: "Custom",
                  input_variable: corrInputs.join(","),
                  outcome_variables: corrOutcomes,
                });
                setCorrTitle("");
                setCorrInputs(["food"]);
                setCorrOutcomes([]);
                toast.success("Correlation added.");
              }}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CorrelationEditRow({
  title,
  setTitle,
  inputs,
  setInputs,
  outcomes,
  setOutcomes,
  inputOptions,
  outcomeOptions,
  onSave,
  onCancel,
}: {
  title: string;
  setTitle: (v: string) => void;
  inputs: string[];
  setInputs: (v: string[]) => void;
  outcomes: string[];
  setOutcomes: (v: string[]) => void;
  inputOptions: { value: string; label: string }[];
  outcomeOptions: { value: string; label: string }[];
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-foreground">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 w-[200px] text-xs" />
      </div>
      <MultiSelectField
        label="When I have"
        options={inputOptions}
        values={inputs}
        onChange={setInputs}
        placeholder="Choose one or more"
      />
      <MultiSelectField
        label="Watch"
        options={outcomeOptions}
        values={outcomes}
        onChange={setOutcomes}
        placeholder="Choose one or more"
      />
      <Button size="sm" onClick={onSave}>
        Save
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function FoodLibraryContent({
  items,
  value,
  setValue,
  kj,
  setKj,
  onAdd,
  onRemove,
}: {
  items: BiologFood[];
  value: string;
  setValue: (v: string) => void;
  kj: string;
  setKj: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-xs text-muted-foreground">Nothing added yet.</p>}
      <Accordion type="multiple" className="space-y-1">
        {groupByCategory(items, FOOD_CATEGORY_LABELS).map((group) => (
          <AccordionItem key={group.key} value={group.key} className="border-0">
            <AccordionTrigger className="py-1 text-xs font-semibold text-primary hover:no-underline">
              {group.label} ({group.items.length})
            </AccordionTrigger>
            <AccordionContent className="space-y-1.5 pt-1">
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs">
                    {item.name}
                    {item.kilojoules != null && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {item.kilojoules}kJ / {item.calories}kcal{item.serving_size ? ` (${item.serving_size})` : ""}
                      </span>
                    )}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <div className="flex flex-wrap gap-2 pt-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Food name"
          className="h-8 text-xs flex-1 min-w-[100px]"
        />
        <Input
          value={kj}
          onChange={(e) => setKj(e.target.value)}
          placeholder="kJ (optional)"
          type="number"
          className="h-8 w-24 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) {
              onAdd();
              setValue("");
              setKj("");
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (!value.trim()) return;
            onAdd();
            setValue("");
            setKj("");
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ExerciseLibraryContent({
  items,
  value,
  setValue,
  category,
  setCategory,
  unit,
  setUnit,
  onAdd,
  onRemove,
}: {
  items: BiologExercise[];
  value: string;
  setValue: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  unit: string;
  setUnit: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-xs text-muted-foreground">Nothing added yet.</p>}
      <Accordion type="multiple" className="space-y-1">
        {groupByCategory(items, EXERCISE_CATEGORY_LABELS).map((group) => (
          <AccordionItem key={group.key} value={group.key} className="border-0">
            <AccordionTrigger className="py-1 text-xs font-semibold text-primary hover:no-underline">
              {group.label} ({group.items.length})
            </AccordionTrigger>
            <AccordionContent className="space-y-1.5 pt-1">
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs">
                    {item.name} <span className="text-muted-foreground">({item.unit})</span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <div className="flex flex-wrap items-end gap-2 pt-1">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Name</Label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 text-xs w-[160px]"
            placeholder="Exercise name"
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) {
                onAdd();
                setValue("");
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXERCISE_CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Measured in</Label>
          <Input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="h-8 w-[110px] text-xs"
            placeholder="minutes, km…"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (!value.trim()) return;
            onAdd();
            setValue("");
          }}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  );
}

function MedicationLibraryContent({
  items,
  value,
  setValue,
  dose,
  setDose,
  unit,
  setUnit,
  onAdd,
  onRemove,
  onUpdate,
}: {
  items: BiologMedication[];
  value: string;
  setValue: (v: string) => void;
  dose: string;
  setDose: (v: string) => void;
  unit: string;
  setUnit: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, values: Record<string, unknown>) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDose, setEditDose] = useState("");
  const [editUnit, setEditUnit] = useState("mg");

  const startEdit = (m: BiologMedication) => {
    setEditingId(m.id);
    setEditLabel(m.label);
    setEditDose(m.dose_amount != null ? String(m.dose_amount) : "");
    setEditUnit(m.dose_unit ?? "mg");
  };

  const saveEdit = () => {
    if (!editingId) return;
    const dose_amount = editDose.trim() ? Number(editDose) : null;
    onUpdate(editingId, {
      label: editLabel.trim(),
      dose_amount: dose_amount != null && !Number.isNaN(dose_amount) ? dose_amount : null,
      dose_unit: dose_amount != null ? editUnit.trim() || "mg" : null,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-xs text-muted-foreground">Nothing added yet.</p>}
      {items.map((item) =>
        editingId === item.id ? (
          <div key={item.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 p-2">
            <Input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="h-8 text-xs w-[140px]"
            />
            <Input
              value={editDose}
              onChange={(e) => setEditDose(e.target.value)}
              type="number"
              placeholder="Dose"
              className="h-8 w-20 text-xs"
            />
            <Input
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              placeholder="mg"
              className="h-8 w-16 text-xs"
            />
            <Button size="sm" onClick={saveEdit}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div key={item.id} className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-xs text-left hover:underline"
              onClick={() => startEdit(item)}
            >
              {item.label}
              {item.dose_amount != null && (
                <span className="text-muted-foreground">
                  {" "}
                  · {item.dose_amount}
                  {item.dose_unit}
                </span>
              )}
            </button>
            <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ),
      )}
      <div className="flex flex-wrap items-end gap-2 pt-1">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Name</Label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 text-xs w-[160px]"
            placeholder="e.g. Vitamin D"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Dose</Label>
          <Input
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            type="number"
            className="h-8 w-20 text-xs"
            placeholder="e.g. 1000"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Unit</Label>
          <Input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="h-8 w-16 text-xs"
            placeholder="mg"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (!value.trim()) return;
            onAdd();
            setValue("");
            setDose("");
          }}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  );
}

