import React from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// Shared horizontal field layout: bold 12px label on the left, compact control
// on the right. Used by every section so Personal / Addresses / Employer /
// Emergency Contacts / Medical all share one typography scale.
export const FIELD_ROW_CLASS =
  "[&>div]:flex [&>div]:items-center [&>div]:gap-2 [&>div]:space-y-0 [&_label]:w-28 [&_label]:shrink-0 [&_label]:text-xs [&_label]:font-bold [&_input]:h-8 [&_input]:text-xs [&_button]:h-8 [&_button]:text-xs [&_[role=combobox]]:h-8 [&_[role=combobox]]:text-xs";
export const FIELD_GRID_CLASS =
  "grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 " + FIELD_ROW_CLASS;
export const FIELD_GRID_2_CLASS =
  "grid gap-x-6 gap-y-2 sm:grid-cols-2 " + FIELD_ROW_CLASS;
export const FIELD_GRID_4_CLASS =
  "grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4 " + FIELD_ROW_CLASS;

// Reusable collapsible section header with optional inline edit pencil.
// Always green with white text — collapsed and expanded.
export const SectionHeader = ({
  icon: Icon,
  label,
  extra,
  onEdit,
  titleClassName,
}: {
  icon: any;
  label: string;
  extra?: React.ReactNode;
  onEdit?: () => void;
  titleClassName?: string;
}) => (
  <CollapsibleTrigger className="patient-section-trigger flex w-full items-center justify-between transition-colors px-4 py-3 group bg-primary hover:bg-primary/90 text-white [&_*:not(.section-count-pill)]:!text-white">
    <h3
      className={cn(
        "text-xs font-semibold tracking-wide flex items-center gap-2 text-left text-white",
        titleClassName
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 text-white" />}
      {label}
    </h3>
    <div className="flex items-center gap-2">
      {extra}
      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1 rounded hover:bg-white/15 text-white transition-colors"
          aria-label={`Edit ${label}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <ChevronDown className="h-4 w-4 text-white transition-transform duration-200 group-data-[state=open]:rotate-180" />
    </div>
  </CollapsibleTrigger>
);
