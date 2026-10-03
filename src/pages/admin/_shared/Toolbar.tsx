import { ReactNode } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Toolbar({
  searchValue, onSearchChange, searchPlaceholder = "Search…", filters, actions, className,
}: ToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {onSearchChange && (
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--admin-text-tertiary))]" />
          <Input
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 text-xs"
          />
        </div>
      )}
      {filters}
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </div>
  );
}

export default Toolbar;
