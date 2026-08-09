import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Minus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  DAY_LABELS,
  FOOD_GROUPS,
  MEAL_SLOTS,
  VULA_MATRIX,
  foodGroupBadge,
  type MealPlanFood,
} from "../types";
import {
  isoDate,
  useExercisePlan,
  useExercisePlanDays,
  useMealPlan,
  useMealPlanFoods,
  useMealSlotInstructions,
  useMealSlotItems,
  useProgrammeAdherence,
  weekDays,
  weekStart,
} from "../usePatientProgrammes";

interface Props {
  patientId: string;
  /** Doctors / practice assistants build the plan; patients tick it off. */
  canEdit: boolean;
  /** Only the patient themselves earns Vulas for ticking. */
  canTick: boolean;
}

export function ProgrammePlanner({ patientId, canEdit, canTick }: Props) {
  const { toast } = useToast();
  const [weekOffset, setWeekOffset] = useState(0);

  const start = useMemo(() => weekStart(new Date(), weekOffset), [weekOffset]);
  const days = useMemo(() => weekDays(start), [start]);
  const from = isoDate(days[0]);
  const to = isoDate(days[6]);

  const { plan, createPlan } = useMealPlan(patientId);
  const { foods, addFood, removeFood } = useMealPlanFoods(plan?.id);
  const { instructions, save: saveInstruction } = useMealSlotInstructions(plan?.id);
  const { items, addItem, setMultiplier, removeItem } = useMealSlotItems(plan?.id);
  const { plan: exPlan, createPlan: createExPlan } = useExercisePlan(patientId);
  const { days: exDays, saveDay } = useExercisePlanDays(exPlan?.id);
  const { adherence, toggle } = useProgrammeAdherence(patientId, from, to);

  const itemsFor = (dow: number, slot: string) =>
    items.filter((i) => i.day_of_week === dow && i.slot_key === slot);

  const instructionFor = (slot: string) => instructions.find((i) => i.slot_key === slot);

  const tickFor = (date: string, kind: "meal" | "exercise", slot: string) =>
    adherence.find((a) => a.entry_date === date && a.kind === kind && a.slot_key === slot);

  const handleToggle = async (
    date: string,
    kind: "meal" | "exercise",
    slot: string,
  ) => {
    if (!canTick) return;
    const existing = tickFor(date, kind, slot);
    const res = await toggle.mutateAsync({ entry_date: date, kind, slot_key: slot, existing });
    if (res.awarded > 0) {
      toast({ title: `+${res.awarded} Vulas`, description: "Adherence recorded. Keep it up!" });
    }
  };

  if (!plan) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">No eating plan has been set up yet.</p>
        {canEdit && (
          <Button className="mt-3" size="sm" onClick={() => createPlan.mutate()}>
            <Plus className="mr-1.5 h-4 w-4" /> Create eating plan
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && <FoodPalette foods={foods} onAdd={addFood.mutate} onRemove={removeFood.mutate} />}

      {/* Week navigation */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xs font-semibold">
          {days[0].toLocaleDateString(undefined, { day: "numeric", month: "short" })} –{" "}
          {days[6].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          {weekOffset === 0 && <span className="ml-2 text-primary">This week</span>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Eating plan week */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="w-32 px-2 py-2 text-left text-[12px] font-bold">Meal</th>
              {days.map((d, i) => (
                <th key={i} className="px-2 py-2 text-left text-[12px] font-bold">
                  {DAY_LABELS[d.getDay()]} {d.getDate()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEAL_SLOTS.map((slot) => (
              <tr key={slot.key} className="border-t border-border align-top">
                <td className="px-2 py-2">
                  <div className="text-[12px] font-bold">{slot.label}</div>
                  <SlotInstruction
                    slotKey={slot.key}
                    instruction={instructionFor(slot.key)}
                    canEdit={canEdit}
                    onSave={(v) => saveInstruction.mutate(v)}
                  />
                </td>
                {days.map((d, i) => {
                  const date = isoDate(d);
                  const dow = d.getDay();
                  const slotItems = itemsFor(dow, slot.key);
                  const tick = tickFor(date, "meal", slot.key);
                  return (
                    <td key={i} className="border-l border-border px-1.5 py-2">
                      <div className="flex flex-wrap gap-1">
                        {slotItems.map((it) => (
                          <Badge
                            key={it.id}
                            variant="outline"
                            className={cn("gap-1 px-1.5 py-0.5 text-[11px]", foodGroupBadge(it.food_group))}
                          >
                            <span>
                              {it.food_name} ({Math.round(Number(it.grams) * Number(it.unit_multiplier))}g)
                            </span>
                            {canEdit && (
                              <span className="flex items-center gap-0.5">
                                <button
                                  aria-label="Decrease portion"
                                  onClick={() =>
                                    setMultiplier.mutate({
                                      id: it.id,
                                      unit_multiplier: Math.max(0.25, Number(it.unit_multiplier) - 0.25),
                                    })
                                  }
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <button
                                  aria-label="Increase portion"
                                  onClick={() =>
                                    setMultiplier.mutate({
                                      id: it.id,
                                      unit_multiplier: Number(it.unit_multiplier) + 0.25,
                                    })
                                  }
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                                <button aria-label="Remove food" onClick={() => removeItem.mutate(it.id)}>
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            )}
                          </Badge>
                        ))}
                        {canEdit && (
                          <AddFoodButton
                            foods={foods}
                            onPick={(food) => addItem.mutate({ day_of_week: dow, slot_key: slot.key, food })}
                          />
                        )}
                      </div>
                      {canTick && (
                        <button
                          onClick={() => handleToggle(date, "meal", slot.key)}
                          className={cn(
                            "mt-1.5 flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                            tick
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground hover:border-primary",
                          )}
                          aria-label={`Mark ${slot.label} on ${date} as followed`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Exercise week */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="w-32 px-2 py-2 text-left text-[12px] font-bold">Exercise</th>
              {days.map((d, i) => (
                <th key={i} className="px-2 py-2 text-left text-[12px] font-bold">
                  {DAY_LABELS[d.getDay()]} {d.getDate()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="align-top">
              <td className="px-2 py-2 text-[12px] font-bold">
                {exPlan ? exPlan.name : "—"}
                {!exPlan && canEdit && (
                  <Button
                    variant="link"
                    size="sm"
                    className="block h-auto p-0 text-[11px]"
                    onClick={() => createExPlan.mutate("Exercise Programme")}
                  >
                    Create programme
                  </Button>
                )}
              </td>
              {days.map((d, i) => {
                const dow = d.getDay();
                const date = isoDate(d);
                const day = exDays.find((x) => x.day_of_week === dow);
                const tick = tickFor(date, "exercise", "day");
                return (
                  <td key={i} className="border-l border-border px-1.5 py-2">
                    {canEdit && exPlan ? (
                      <Textarea
                        defaultValue={day?.description ?? ""}
                        placeholder="Rest"
                        rows={2}
                        className="text-[11px]"
                        onBlur={(e) =>
                          saveDay.mutate({ day_of_week: dow, description: e.target.value })
                        }
                      />
                    ) : (
                      <p className="text-[11px] text-muted-foreground">{day?.description || "Rest"}</p>
                    )}
                    {canTick && (
                      <button
                        onClick={() => handleToggle(date, "exercise", "day")}
                        className={cn(
                          "mt-1.5 flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                          tick
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary",
                        )}
                        aria-label={`Mark exercise on ${date} as done`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Vula rewards: {VULA_MATRIX.mealSlotTick} per meal ticked, {VULA_MATRIX.exerciseDayTick} per
        exercise day, {VULA_MATRIX.perKilogramLost} per kilogram lost at a weigh-in.
      </p>
    </div>
  );
}

/* --------------------------- supporting widgets --------------------------- */

function FoodPalette({
  foods,
  onAdd,
  onRemove,
}: {
  foods: MealPlanFood[];
  onAdd: (v: { food_group: string; name: string; grams: number }) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Record<string, { name: string; grams: string }>>({});

  return (
    <div className="grid gap-2 md:grid-cols-4">
      {FOOD_GROUPS.map((group) => (
        <div key={group.key} className={cn("rounded-lg border p-2", group.column)}>
          <div className="mb-1.5 text-[12px] font-bold">{group.label}</div>
          <div className="flex flex-wrap gap-1">
            {foods
              .filter((f) => f.food_group === group.key)
              .map((f) => (
                <Badge key={f.id} variant="outline" className={cn("gap-1 text-[11px]", group.badge)}>
                  {f.name} ({Number(f.grams)}g)
                  <button aria-label={`Remove ${f.name}`} onClick={() => onRemove(f.id)}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
          </div>
          <div className="mt-2 flex gap-1">
            <Input
              className="h-7 text-[11px]"
              placeholder="Food"
              value={draft[group.key]?.name ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, [group.key]: { ...(draft[group.key] || { grams: "" }), name: e.target.value } })
              }
            />
            <Input
              className="h-7 w-16 text-[11px]"
              placeholder="g"
              type="number"
              value={draft[group.key]?.grams ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, [group.key]: { ...(draft[group.key] || { name: "" }), grams: e.target.value } })
              }
            />
            <Button
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                const d = draft[group.key];
                if (!d?.name) return;
                onAdd({ food_group: group.key, name: d.name, grams: Number(d.grams) || 100 });
                setDraft({ ...draft, [group.key]: { name: "", grams: "" } });
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AddFoodButton({
  foods,
  onPick,
}: {
  foods: MealPlanFood[];
  onPick: (food: MealPlanFood) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="rounded-md border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary"
          aria-label="Add food to slot"
        >
          <Plus className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-h-64 w-56 overflow-y-auto p-1.5">
        {foods.length === 0 && (
          <p className="p-2 text-[11px] text-muted-foreground">Add foods to the palette first.</p>
        )}
        {foods.map((f) => (
          <button
            key={f.id}
            className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-[12px] hover:bg-muted"
            onClick={() => {
              onPick(f);
              setOpen(false);
            }}
          >
            <span>{f.name}</span>
            <span className="text-muted-foreground">{Number(f.grams)}g</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function SlotInstruction({
  slotKey,
  instruction,
  canEdit,
  onSave,
}: {
  slotKey: string;
  instruction?: {
    instruction_kind: string;
    instruction_text: string | null;
    target_energy: number | null;
    energy_unit: string;
  };
  canEdit: boolean;
  onSave: (v: {
    slot_key: string;
    instruction_kind: string;
    instruction_text?: string | null;
    target_energy?: number | null;
    energy_unit?: string;
  }) => void;
}) {
  const [kind, setKind] = useState(instruction?.instruction_kind ?? "choose_one");
  const [text, setText] = useState(instruction?.instruction_text ?? "");
  const [energy, setEnergy] = useState(instruction?.target_energy?.toString() ?? "");
  const [unit, setUnit] = useState(instruction?.energy_unit ?? "kJ");

  const summary =
    instruction?.instruction_kind === "energy_target"
      ? `Choose any options that add up to ${instruction.target_energy ?? 0} ${instruction.energy_unit}`
      : instruction?.instruction_kind === "free"
        ? instruction.instruction_text
        : instruction
          ? instruction.instruction_text || "Choose any one of the below"
          : null;

  if (!canEdit) {
    return summary ? (
      <p className="mt-0.5 flex gap-1 text-[11px] italic text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        {summary}
      </p>
    ) : null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="mt-0.5 text-left text-[11px] italic text-muted-foreground hover:text-primary">
          {summary || "Add instruction"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="choose_one">Choose any one of the below</SelectItem>
            <SelectItem value="energy_target">Options adding up to an energy target</SelectItem>
            <SelectItem value="free">Free instruction</SelectItem>
          </SelectContent>
        </Select>
        {kind === "energy_target" && (
          <div className="flex gap-1.5">
            <Input
              className="h-8 text-xs"
              type="number"
              placeholder="e.g. 1500"
              value={energy}
              onChange={(e) => setEnergy(e.target.value)}
            />
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kJ">kJ</SelectItem>
                <SelectItem value="kcal">kcal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {kind !== "energy_target" && (
          <Textarea
            rows={2}
            className="text-xs"
            placeholder="e.g. Eat greens first, then proteins, then carbs"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}
        <Button
          size="sm"
          className="w-full"
          onClick={() =>
            onSave({
              slot_key: slotKey,
              instruction_kind: kind,
              instruction_text: kind === "energy_target" ? null : text,
              target_energy: kind === "energy_target" ? Number(energy) || null : null,
              energy_unit: unit,
            })
          }
        >
          Save instruction
        </Button>
      </PopoverContent>
    </Popover>
  );
}
