import { cn } from "@/lib/utils";

const MOODS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "Struggling" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

export function MoodPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (mood: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {MOODS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          title={m.label}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full border text-xl transition",
            value === m.value
              ? "border-maeve bg-maeve/20 scale-110"
              : "border-border hover:border-maeve hover:bg-maeve/10",
          )}
        >
          {m.emoji}
        </button>
      ))}
    </div>
  );
}
