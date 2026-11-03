import { useState } from "react";
import { CheckCircle2, Download, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanionSetup } from "./CompanionSetup";
import { LATEST_COMPANION_VERSION, useCompanionInstalled, useCompanionVersion } from "./companionDetection";

export function CompanionStatus() {
  const installed = useCompanionInstalled();
  const version = useCompanionVersion();
  const [setupOpen, setSetupOpen] = useState(false);

  return (
    <>
      <section aria-label="Holarc Wealth Companion" className="flex flex-col gap-3 border-b border-border bg-primary/5 px-3 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          {installed ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <Puzzle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
          <div className="min-w-0 space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Holarc Wealth Companion</h2>
            <p role="status" className={`text-xs font-medium ${installed ? "text-success" : "text-muted-foreground"}`}>
              {installed ? "Companion active in this browser" : "Companion not detected on this page yet"}
            </p>
            <p className="text-xs text-muted-foreground">Installed: {installed ? version || "number unavailable" : "not detected"} · Latest: {LATEST_COMPANION_VERSION}</p>
          </div>
        </div>
        <Button variant={installed ? "outline" : "default"} size="sm" className="h-11 shrink-0 sm:w-auto" onClick={() => setSetupOpen(true)}>
          {installed ? <Puzzle className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {installed && version === LATEST_COMPANION_VERSION ? "Version details" : installed ? "Update Companion" : "Install Companion"}
        </Button>
      </section>
      <CompanionSetup open={setupOpen} onClose={() => setSetupOpen(false)} />
    </>
  );
}
