import { useEffect, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { renameMaeveSession } from "../hooks/useMaeveSession";

interface Props {
  sessionId: string;
  title: string | null | undefined;
  onRenamed?: (title: string | null) => void;
  /** Makes the title itself clickable (e.g. to open the exploration). */
  onTitleClick?: () => void;
  className?: string;
}

/** Inline rename control for an Ask Angel exploration. */
export function SessionTitleEditor({ sessionId, title, onRenamed, onTitleClick, className }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(title ?? "");
  }, [title]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = async () => {
    setSaving(true);
    const ok = await renameMaeveSession(sessionId, value);
    setSaving(false);
    if (!ok) {
      toast.error("Could not rename this exploration");
      return;
    }
    setEditing(false);
    onRenamed?.(value.trim() || null);
    toast.success("Exploration renamed");
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          value={value}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setValue(title ?? "");
              setEditing(false);
            }
          }}
          className="h-8 text-sm"
          placeholder="Name this exploration"
        />
        <button
          aria-label="Save name"
          onClick={save}
          disabled={saving}
          className="rounded-full p-1.5 text-maeve-dark transition hover:bg-maeve/10 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          aria-label="Cancel rename"
          onClick={() => {
            setValue(title ?? "");
            setEditing(false);
          }}
          className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {onTitleClick ? (
        <button onClick={onTitleClick} className="min-w-0 truncate text-left text-sm font-semibold text-foreground">
          {title || "New exploration"}
        </button>
      ) : (
        <span className="truncate text-sm font-semibold text-foreground">{title || "New exploration"}</span>
      )}
      <button
        aria-label="Rename exploration"
        title="Rename exploration"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className="rounded-full p-1 text-muted-foreground transition hover:bg-maeve/10 hover:text-maeve-dark"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
