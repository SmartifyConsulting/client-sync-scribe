import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { LATEST_COMPANION_VERSION, useCompanionInstalled, useCompanionVersion } from "./companionDetection";
import { companionStoreUrl } from "./companionStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadAddon } from "./InsurerLogin";

export function CompanionSetup({ open, onClose, onReady }: { open: boolean; onClose: () => void; onReady?: () => void }) {
  const installed = useCompanionInstalled();
  const version = useCompanionVersion();
  const storeUrl = companionStoreUrl();
  const current = installed && version === LATEST_COMPANION_VERSION;
  const [downloaded, setDownloaded] = useState(false);
  const wasInstalled = useRef(installed);
  useEffect(() => {
    if (open && installed && !wasInstalled.current) { onClose(); onReady?.(); }
    wasInstalled.current = installed;
  }, [installed, open, onClose, onReady]);
  useEffect(() => { if (!open) setDownloaded(false); }, [open]);
  const action = installed ? "Update Companion" : "Install Companion";
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
    <DialogContent className="max-w-sm">
      <DialogHeader><DialogTitle>Holarc Wealth Companion</DialogTitle>
        <DialogDescription>Keep your insurer connection tools up to date.</DialogDescription></DialogHeader>
      <dl className="space-y-3 text-xs">
        <div className="flex justify-between gap-3"><dt className="font-semibold">Installed version</dt><dd>{installed ? version || "Older version · number unavailable" : "Not detected"}</dd></div>
        <div className="flex justify-between gap-3"><dt className="font-semibold">Latest version</dt><dd>{LATEST_COMPANION_VERSION}</dd></div>
      </dl>
      {current ? <p role="status" className="text-xs text-success">You’re up to date.</p> : <>
        {storeUrl ? <Button asChild size="sm"><a href={storeUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4" />{action}</a></Button>
          : <Button size="sm" onClick={() => { downloadAddon(); setDownloaded(true); }}><Download className="mr-2 h-4 w-4" />{action}</Button>}
        <p className="text-xs text-muted-foreground">{storeUrl ? "Chrome will guide you through installation. Refresh Holarc afterwards." : "Downloads the latest Companion package. Chrome setup is required."}</p>
        {!storeUrl && downloaded && <p role="status" className="text-xs text-muted-foreground">{installed ? "Unzip into your existing Companion folder, replace the files, and click Reload in Chrome → Extensions. Then refresh Holarc." : "Unzip the download. In Chrome → Extensions, enable Developer mode, choose Load unpacked and select the unzipped folder. Then refresh Holarc."}</p>}
      </>}
    </DialogContent>
  </Dialog>;
}
