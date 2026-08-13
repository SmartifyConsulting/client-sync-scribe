import { useState } from "react";
import { Play, Volume2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MAEVE_VOICES, voiceById } from "../lib/voices";

interface Props {
  voiceId: string;
  onChange: (id: string) => void;
  /** Speaks a short sample in the given voice. */
  onPreview: (id: string) => void;
}

/** Lets the patient choose (and hear) the voice Maeve speaks with. */
export function MaeveVoicePicker({ voiceId, onChange, onPreview }: Props) {
  const [open, setOpen] = useState(false);
  const current = voiceById(voiceId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark">
          <Volume2 className="h-3 w-3" />
          {current.label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Maeve's voice
        </p>
        <div className="space-y-0.5">
          {MAEVE_VOICES.map((v) => (
            <div
              key={v.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5",
                v.id === voiceId ? "bg-maeve/10" : "hover:bg-muted",
              )}
            >
              <button className="flex-1 text-left" onClick={() => { onChange(v.id); setOpen(false); }}>
                <span className="block text-xs font-semibold text-foreground">{v.label}</span>
                <span className="block text-[11px] text-muted-foreground">{v.description}</span>
              </button>
              <button
                aria-label={`Preview ${v.label}`}
                onClick={() => onPreview(v.id)}
                className="rounded-full border border-border p-1.5 text-muted-foreground transition hover:border-maeve hover:text-maeve-dark"
              >
                <Play className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
