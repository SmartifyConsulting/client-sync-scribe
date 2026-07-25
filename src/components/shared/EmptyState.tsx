/**
 * EmptyState â€” shared "no data yet" block used by lists and tabs.
 * Use to replace ad-hoc <div className="text-muted-foreground"> empty
 * states scattered across the app.
 */

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  titleKey?: string;
  description?: string;
  descriptionKey?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, titleKey, description, descriptionKey, action, className }: EmptyStateProps) {
  const { t } = useTranslation();

  const displayTitle = titleKey ? t(titleKey) : title;
  const displayDescription = descriptionKey ? t(descriptionKey) : description;

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-12 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{displayTitle}</p>
        {displayDescription && <p className="text-sm text-muted-foreground max-w-sm">{displayDescription}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

