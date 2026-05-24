import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_PREFIX = "holarc_early_release_seen_";

export function EarlyReleaseNotice() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    const key = `${STORAGE_PREFIX}${user.id}`;
    try {
      if (!localStorage.getItem(key)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [loading, user]);

  const handleClose = () => {
    if (user) {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${user.id}`, "1");
      } catch {}
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Welcome to the Early Release</DialogTitle>
          <DialogDescription className="text-center leading-relaxed pt-2">
            You are participating in an early release of Holarc Health. As we continue to expand
            functionality and improve the platform, some features may evolve and occasional issues
            may occur. Your feedback is invaluable and can be submitted through the Bug Log feature
            found next to the notification button.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose} className="w-full">Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
