import { useEffect, useState } from "react";
import { Loader2, Play, Volume2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { MAEVE_VOICES, MaeveVoice, voiceById } from "../lib/voices";

interface Props {
  voiceId: string;
  onChange: (id: string, label?: string) => void;
  /** Speaks a short sample in the given voice. */
  onPreview: (id: string) => void;
}

/** Lets the patient choose (and hear) the voice Holarc speaks with. The list
 *  comes from the connected ElevenLabs account when it is readable. */
export function MaeveVoicePicker({ voiceId, onChange, onPreview }: Props) {
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState<MaeveVoice[]>(MAEVE_VOICES);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [customId, setCustomId] = useState("");
  const current = voiceById(voiceId);

  useEffect(() => {
    if (!open || loading) return;
    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke("maeve-voices")
      .then(({ data, error }) => {
        if (cancelled) return;
        const list = (data as any)?.voices as MaeveVoice[] | undefined;
        if (error || !list?.length) {
          setLoadFailed(true);
          return;
        }
        setVoices(list);
        setLoadFailed(false);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // Loads once per mount when first opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applyCustom = () => {
    const id = customId.trim();
    if (!id) return;
    onChange(id, "Custom voice");
    setCustomId("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark">
          <Volume2 className="h-3 w-3" />
          {current.label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Holarc's voice
        </p>
        {loading && (
          <div className="flex items-center gap-2 px-2 py-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading your voice library…
          </div>
        )}
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {voices.map((v) => (
            <div
              key={v.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5",
                v.id === voiceId ? "bg-maeve/10" : "hover:bg-muted",
              )}
            >
              <button
                className="flex-1 text-left"
                onClick={() => {
                  onChange(v.id, v.label);
                  setOpen(false);
                }}
              >
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
        <div className="mt-2 border-t border-border pt-2">
          {loadFailed && (
            <p className="px-2 pb-1 text-[11px] text-muted-foreground">
              Your ElevenLabs library couldn't be read. Paste a voice ID from ElevenLabs to use it here.
            </p>
          )}
          <div className="flex items-center gap-1.5 px-1">
            <Input
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyCustom()}
              placeholder="ElevenLabs voice ID"
              className="h-8 text-[11px]"
            />
            <button
              onClick={applyCustom}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-maeve hover:text-maeve-dark"
            >
              Use
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
