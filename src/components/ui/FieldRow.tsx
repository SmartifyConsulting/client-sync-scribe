import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * Horizontal label + control row, matching the patient "My Personal
 * Information" layout: bold fixed-width label on the left, control filling the
 * rest of the row. Wrap groups in `<div className={FIELD_GRID_CLASS}>` for the
 * two-column desktop / single-column mobile grid.
 */
export const FIELD_GRID_CLASS = "grid gap-x-4 gap-y-2 sm:grid-cols-2";

interface FieldRowProps {
  label: string;
  children: ReactNode;
  /** Span both columns (long text, addresses, About Me). */
  wide?: boolean;
  className?: string;
  htmlFor?: string;
}

export function FieldRow({ label, children, wide, className, htmlFor }: FieldRowProps) {
  return (
    <div className={cn("flex items-center gap-2", wide && "sm:col-span-2", className)}>
      <Label htmlFor={htmlFor} className="w-28 shrink-0 text-sm font-medium">
        {label}
      </Label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default FieldRow;
