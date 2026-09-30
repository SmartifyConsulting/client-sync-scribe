import { Logo } from "@/components/brand/Logo";
import { TopBarIcons } from "./TopBarIcons";
import { InstallAppButton } from "@/components/InstallAppButton";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 bg-background border-b border-border md:hidden">
      <div className="flex items-center gap-2 self-center">
        <Logo size="md" className="self-center" />
      </div>
      <div className="flex items-center gap-2">
        <InstallAppButton variant="compact" />
        <TopBarIcons />
      </div>
    </header>
  );
}
