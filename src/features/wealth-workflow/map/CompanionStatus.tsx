import { useEffect, useState } from "react";
import { CheckCircle2, Download, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanionSetup } from "./CompanionSetup";
import { addonInstalled } from "./InsurerLogin";

export function CompanionStatus() {
  const [installed, setInstalled] = useState(addonInstalled);
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => {
    const updateStatus = () => setInstalled(addonInstalled());
    const observer = new MutationObserver(updateStatus);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-holarc-addon"],
    });
    updateStatus();
    window.addEventListener("focus", updateStatus);
    return () => {
      observer.disconnect();
      window.removeEventListener("focus", updateStatus);
    };
  }, []);

  return (
    <>
      <section aria-label="Holarc Wealth Companion" className="flex flex-col gap-3 border-b border-border bg-primary/5 px-3 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          {installed ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <Puzzle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
          <div className="min-w-0 space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Holarc Wealth Companion</h2>
            <p role="status" className={`text-xs font-medium ${installed ? "text-success" : "text-muted-foreground"}`}>
              {installed ? "Companion active in this browser" : "Companion not installed in this browser"}
            </p>
            <p className="text-xs text-muted-foreground">One-time setup per Chrome, Edge or Brave browser profile. Refresh Holarc Wealth after installation.</p>
          </div>
        </div>
        <Button variant={installed ? "outline" : "default"} size="sm" className="h-11 shrink-0 sm:w-auto" onClick={() => setSetupOpen(true)}>
          {installed ? <Puzzle className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {installed ? "Setup details" : "Set up Companion"}
        </Button>
      </section>
      <CompanionSetup open={setupOpen} onClose={() => setSetupOpen(false)} />
    </>
  );
}