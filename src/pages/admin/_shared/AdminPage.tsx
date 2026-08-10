import { ReactNode } from "react";

interface AdminPageProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminPage({ eyebrow, title, description, actions, children }: AdminPageProps) {
  return (
    <div className="admin-shell min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto max-w-[1400px] p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[hsl(var(--admin-border-subtle))] pb-3">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--admin-text-tertiary))]">
                {eyebrow}
              </p>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--admin-text-primary))]">
              {title}
            </h1>
            {description && (
              <p className="text-[12.5px] text-[hsl(var(--admin-text-secondary))]">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

export default AdminPage;
