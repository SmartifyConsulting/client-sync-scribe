import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminPanelProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
  children: ReactNode;
}

export function AdminPanel({
  title, description, actions, className, bodyClassName, noPadding, children,
}: AdminPanelProps) {
  return (
    <section className={cn("admin-panel", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-[hsl(var(--admin-border-subtle))] px-4 py-2.5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-xs font-semibold tracking-wide text-[hsl(var(--admin-text-primary))]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-2xs text-[hsl(var(--admin-text-tertiary))]">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(noPadding ? "" : "p-3", bodyClassName)}>{children}</div>
    </section>
  );
}

export default AdminPanel;
