import { useState } from "react";
import { Bug } from "lucide-react";
import holarcLogo from "@/assets/holarc-logo-clear-2.png";
import { TopBarIcons } from "./TopBarIcons";
import { ReportFixSheet } from "@/components/feedback/ReportFixSheet";

export function MobileHeader() {
  const [reportOpen, setReportOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border md:hidden">
      <div className="flex items-center gap-2">
        <img src={holarcLogo} alt="Holarc Health" className="h-[50px] w-auto object-contain" />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setReportOpen(true)}
          className="h-9 w-9 rounded-full bg-terracotta flex items-center justify-center hover:bg-terracotta-dark transition-colors"
          title="Report Bug/Fix"
        >
          <Bug className="h-4 w-4 text-white" />
        </button>
        <TopBarIcons />
      </div>
      <ReportFixSheet open={reportOpen} onOpenChange={setReportOpen} />
    </header>
  );
}
