import { LucideIcon, Inbox } from "lucide-react";
import { ReactNode } from "react";

export function EmptyState({
  icon: Icon = Inbox, title, description, action,
}: { icon?: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <Icon className="h-6 w-6 text-[hsl(var(--admin-text-tertiary))]" />
      <p className="text-sm font-medium text-[hsl(var(--admin-text-primary))]">{title}</p>
      {description && <p className="text-sm text-[hsl(var(--admin-text-tertiary))]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
