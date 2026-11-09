import { useState } from "react";
import { Pencil } from "lucide-react";

/** A provider reference is entered explicitly; never substitute our scenario number. */
export function QuoteOptionReference({ value, label, onChange, className = "mt-1 text-[10px] font-normal normal-case tracking-normal text-muted-foreground" }: { value: string; label: string; onChange: (value: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const finish = () => { onChange(draft); setEditing(false); };
  return <div className={className}>
    {editing ? <input autoFocus aria-label={label} maxLength={80} value={draft} placeholder="Quote number pending"
      className="h-6 w-full rounded border border-input bg-background px-1 text-[10px] font-normal"
      onChange={e => setDraft(e.target.value)} onBlur={finish}
      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); finish(); } else if (e.key === "Escape") { e.preventDefault(); setEditing(false); } }} /> :
      <button type="button" aria-label={`Edit ${label}`} title="Enter the insurer's quote number, then save with Update quote plan"
        className="inline-flex max-w-full items-center gap-1 text-left hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        onClick={() => { setDraft(value); setEditing(true); }}>
        <span className="break-all">{value ? `Quote no. ${value}` : "Quote number pending"}</span><Pencil className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
      </button>}
  </div>;
}
