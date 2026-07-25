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
import { useTranslation } from "react-i18next";

const STORAGE_PREFIX = "holarc_early_release_seen_";

export function EarlyReleaseNotice() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
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
          <DialogTitle className="text-center">{t("earlyRelease.title")}</DialogTitle>
          <DialogDescription className="text-center leading-relaxed pt-2">
            {t("earlyRelease.description")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose} className="w-full">{t("common.gotIt")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
