import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Smartphone, Share, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "holarc-install-dismissed-until";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error - iOS Safari
    window.navigator.standalone === true
  );
}

function detectIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  return iOS;
}

function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /FBAN|FBAV|Instagram|Line|LinkedIn|Twitter/i.test(navigator.userAgent);
}

interface Props {
  variant?: "primary" | "compact";
  className?: string;
}

export function InstallAppButton({ variant = "primary", className }: Props) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [iosOpen, setIosOpen] = useState(false);
  const isIOS = detectIOS();
  const inAppBrowser = isInAppBrowser();

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  // If we have neither a native prompt nor iOS, nothing useful to do (e.g. desktop Firefox).
  if (!deferred && !isIOS) return null;

  // Respect 7-day dismissal for compact (header) variant only.
  if (variant === "compact") {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (until && Date.now() < until) return null;
  }

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    if (isIOS) setIosOpen(true);
  };

  const label = "Install app";

  return (
    <>
      {variant === "primary" ? (
        <Button
          size="lg"
          onClick={handleClick}
          className={cn("btn-pill text-base gap-2", className)}
        >
          <Smartphone className="h-5 w-5" />
          {label}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={handleClick}
          className={cn("gap-1.5 h-9", className)}
          aria-label={label}
        >
          <Smartphone className="h-4 w-4" />
          <span className="hidden sm:inline">Install</span>
        </Button>
      )}

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install Holarc on your iPhone</DialogTitle>
            <DialogDescription>
              {inAppBrowser
                ? "You're viewing this inside another app. Tap the menu (•••) and choose \"Open in Safari\" first, then follow the steps below."
                : "iOS doesn't have a one-tap install button, but it takes 3 quick taps in Safari:"}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                1
              </span>
              <span>
                Tap the <Share className="inline h-4 w-4 align-text-bottom" /> <strong>Share</strong> icon
                at the bottom of Safari.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                2
              </span>
              <span>
                Scroll down and tap <Plus className="inline h-4 w-4 align-text-bottom" />{" "}
                <strong>Add to Home Screen</strong>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                3
              </span>
              <span>
                Tap <strong>Add</strong> in the top right. The Holarc icon will appear on your home screen.
              </span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
