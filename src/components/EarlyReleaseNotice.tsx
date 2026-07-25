import { useEffect, useState } from "react";
import betaLogo from "@/assets/holarc-beta-logo.png";
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
          <div className="mx-auto mb-2">
            <img src={betaLogo} alt="Holarc Health BETA" className="h-16 w-auto object-contain" />
          </div>
          <DialogTitle className="text-center">{t("earlyRelease.title")}</DialogTitle>
          <DialogDescription className="text-center leading-relaxed pt-2 text-[10px]">
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
