import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useTranslation } from "react-i18next";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "install-strip-dismissed";

export function InstallMobileStrip() {
  const { t } = useTranslation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  });
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    setIsStandalone(standalone);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone || dismissed) return null;
  if (!deferred && !isIOS) return null;

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else if (isIOS) {
      alert(t("install.iosInstructions"));
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="md:hidden flex items-center justify-between gap-2 bg-primary text-primary-foreground px-3 py-1.5 text-sm">
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 flex-1 text-left font-medium"
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span>{t("install.installPhone")}</span>
      </button>
      <button
        onClick={handleDismiss}
        aria-label={t("common.dismiss")}
        className="p-1 hover:bg-primary-foreground/10 rounded"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

