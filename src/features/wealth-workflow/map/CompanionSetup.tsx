import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadAddon } from "./InsurerLogin";

export function CompanionSetup({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
    <DialogContent className="max-w-sm">
      <DialogHeader><DialogTitle>Holarc Wealth Companion</DialogTitle>
        <DialogDescription>One-time setup for this Chrome, Edge or Brave browser profile. Your saved logins stay protected.</DialogDescription></DialogHeader>
      <ol className="list-decimal space-y-2 pl-4 text-xs">
        <li>Download and unzip the Companion.</li>
        <li>Open <span className="font-medium">chrome://extensions</span> and enable Developer mode.</li>
        <li>Choose Load unpacked and select the unzipped folder.</li>
        <li>Refresh Holarc Wealth.</li>
      </ol>
      <p className="text-xs text-muted-foreground">Only repeat setup for another browser or device, or if you remove the Companion. A store installation is not available yet.</p>
      <Button size="sm" onClick={downloadAddon}><Download className="mr-2 h-4 w-4" />Download Companion</Button>
      <Button size="sm" variant="ghost" onClick={onClose}><ExternalLink className="mr-2 h-4 w-4" />Continue without Companion</Button>
    </DialogContent>
  </Dialog>;
}