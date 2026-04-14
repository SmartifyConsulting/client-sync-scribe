import holarcLogo from "@/assets/holarc-logo-clear-2.png";
import { TopBarIcons } from "./TopBarIcons";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border md:hidden">
      <div className="flex items-center gap-2">
        <img src={holarcLogo} alt="Holarc Health" className="h-[50px] w-auto object-contain" />
      </div>
      <TopBarIcons />
    </header>
  );
}
