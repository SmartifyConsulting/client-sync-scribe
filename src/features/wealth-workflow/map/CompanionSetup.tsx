import { useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { checkCompanion } from "./companionDetection";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadAddon } from "./InsurerLogin";

export function CompanionSetup({ open, onClose, onReady }: { open: boolean; onClose: () => void; onReady?: () => void }) {
  const [checking, setChecking] = useState(false);
  const [notDetected, setNotDetected] = useState(false);
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
    <DialogContent className="max-w-sm">
      <DialogHeader><DialogTitle>Holarc Wealth Companion</DialogTitle>
        <DialogDescription>Already installed? Reconnect the Companion below. Installation is only needed once per browser profile.</DialogDescription></DialogHeader>
      <Button size="sm" disabled={checking} onClick={async () => {
        setChecking(true); setNotDetected(false);
        const installed = await checkCompanion();
        setChecking(false);
        if (installed) { onClose(); onReady?.(); } else setNotDetected(true);
      }}>{checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Already installed — check again</Button>
      {notDetected && <p role="status" className="text-xs text-muted-foreground">Not detected on this page yet. You do not need to reinstall. Check that the Companion is enabled in this browser profile and has access to Holarc, then refresh this page and try again.</p>}
      <details className="text-xs">
      <summary className="cursor-pointer font-medium">Installing for the first time?</summary>
      <ol className="list-decimal space-y-2 pl-4 text-xs">
        <li>Download and unzip the Companion.</li>
        <li>Open <span className="font-medium">chrome://extensions</span> and enable Developer mode.</li>
        <li>Choose Load unpacked and select the unzipped folder.</li>
        <li>Refresh Holarc Wealth.</li>
      </ol>
      <p className="text-xs text-muted-foreground">Only repeat setup for another browser or device, or if you remove the Companion. A store installation is not available yet.</p>
      <Button size="sm" onClick={downloadAddon}><Download className="mr-2 h-4 w-4" />Download Companion</Button>
      </details>
      <Button size="sm" variant="ghost" onClick={onClose}><ExternalLink className="mr-2 h-4 w-4" />Continue without Companion</Button>
    </DialogContent>
  </Dialog>;
}
