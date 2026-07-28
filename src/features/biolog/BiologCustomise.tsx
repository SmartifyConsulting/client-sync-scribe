import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BUILT_IN_CORRELATIONS, friendlyLabel } from "./correlations";
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
} from "./useBiolog";

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

  const { data: correlationRows = [] } = useBiologCorrelations(ownerUserId);
  const saveCorrelation = useSaveCorrelation(ownerUserId);
  const deleteCorrelation = useDeleteCorrelation(ownerUserId);

  const [newSection, setNewSection] = useState("");
  const [newGroup, setNewGroup] = useState("physical");
  const [newFood, setNewFood] = useState("");
  const [newExercise, setNewExercise] = useState("");
  const [newMedication, setNewMedication] = useState("");

  const [corrTitle, setCorrTitle] = useState("");
  const [corrInput, setCorrInput] = useState("food");
  const [corrOutcome, setCorrOutcome] = useState("");

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

  const builtInDisabled = (title: string) =>
    correlationRows.some((r) => r.title === title && !r.is_custom && !r.enabled);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">What you track daily</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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

      <div className="grid gap-4 md:grid-cols-3">
        <LibraryCard
          title="Foods"
          items={foods.map((f) => ({ id: f.id, label: f.name }))}
          value={newFood}
          setValue={setNewFood}
          onAdd={() => addFood.mutate({ name: newFood.trim() })}
          onRemove={(id) => removeFood.mutate(id)}
        />
        <LibraryCard
          title="Exercises"
          items={exercises.map((e) => ({ id: e.id, label: e.name }))}
          value={newExercise}
          setValue={setNewExercise}
          onAdd={() => addExercise.mutate({ name: newExercise.trim() })}
          onRemove={(id) => removeExercise.mutate(id)}
        />
        <LibraryCard
          title="Medication & supplements"
          items={medications.map((m) => ({ id: m.id, label: m.label }))}
          value={newMedication}
          setValue={setNewMedication}
          onAdd={() => addMedication.mutate({ label: newMedication.trim() })}
          onRemove={(id) => removeMedication.mutate(id)}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Correlations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {BUILT_IN_CORRELATIONS.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <Switch
                checked={!builtInDisabled(c.title)}
                onCheckedChange={(checked) => {
                  const existing = correlationRows.find((r) => r.title === c.title && !r.is_custom);
                  saveCorrelation.mutate({
                    id: existing?.id,
                    title: c.title,
                    group_name: c.group,
                    input_variable: c.inputVar,
                    outcome_variables: c.outcomeVars,
                    enabled: checked,
                    is_custom: false,
                  });
                }}
              />
              <span className={LABEL}>{c.title}</span>
            </div>
          ))}

          {correlationRows
            .filter((r) => r.is_custom)
            .map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(checked) =>
                      saveCorrelation.mutate({ ...r, enabled: checked })
                    }
                  />
                  <span className={LABEL}>{r.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {friendlyLabel(r.input_variable)} →{" "}
                    {r.outcome_variables.map(friendlyLabel).join(", ")}
                  </span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteCorrelation.mutate(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

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
            <div className="space-y-1.5">
              <Label className={LABEL}>When I have</Label>
              <Select value={corrInput} onValueChange={setCorrInput}>
                <SelectTrigger className="h-9 w-[200px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inputOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={LABEL}>Watch</Label>
              <Select value={corrOutcome} onValueChange={setCorrOutcome}>
                <SelectTrigger className="h-9 w-[180px] text-xs">
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {outcomeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={async () => {
                if (!corrTitle.trim() || !corrOutcome) {
                  return toast.error("Give it a title and choose what to watch.");
                }
                await saveCorrelation.mutateAsync({
                  title: corrTitle.trim(),
                  group_name: "Custom",
                  input_variable: corrInput,
                  outcome_variables: [corrOutcome],
                });
                setCorrTitle("");
                setCorrOutcome("");
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

function LibraryCard({
  title,
  items,
  value,
  setValue,
  onAdd,
  onRemove,
}: {
  title: string;
  items: { id: string; label: string }[];
  value: string;
  setValue: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-xs text-muted-foreground">Nothing added yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <span className="text-xs">{item.label}</span>
            <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) {
                onAdd();
                setValue("");
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
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
