import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Smartphone, Share, Plus, MoreVertical, Menu } from "lucide-react";
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
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  return iOS;
}

function detectAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /FBAN|FBAV|Instagram|Line|LinkedIn|Twitter|TikTok/i.test(navigator.userAgent);
}

type AndroidBrowser = "chrome" | "samsung" | "firefox" | "inapp" | "other";

function detectAndroidBrowser(): AndroidBrowser {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (isInAppBrowser()) return "inapp";
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Chrome|EdgA|Edge/i.test(ua)) return "chrome";
  return "other";
}

interface Props {
  variant?: "primary" | "compact";
  className?: string;
}

export function InstallAppButton({ variant = "primary", className }: Props) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [iosOpen, setIosOpen] = useState(false);
  const [androidOpen, setAndroidOpen] = useState(false);
  const isIOS = detectIOS();
  const isAndroid = detectAndroid();
  const inAppBrowser = isInAppBrowser();
  const androidBrowser = detectAndroidBrowser();

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
    if (isIOS) {
      setIosOpen(true);
      return;
    }
    // Fallback for Android (no beforeinstallprompt fired) and desktop Chrome/Edge.
    setAndroidOpen(true);
  };

  const label = "Install app";

  const androidIntro =
    androidBrowser === "inapp"
      ? "You're viewing this inside another app. Tap the menu (â€¢â€¢â€¢) and choose \"Open in Chrome\" first, then follow the steps below."
      : "Android doesn't always show a one-tap install button. Use your browser menu:";

  const androidSteps =
    androidBrowser === "samsung"
      ? [
          { icon: <Menu className="inline h-4 w-4 align-text-bottom" />, text: <>Tap the <strong>menu</strong> icon (â˜°) in Samsung Internet.</> },
          { icon: null, text: <>Tap <strong>Add page to</strong> â†’ <strong>Home screen</strong>.</> },
          { icon: null, text: <>Tap <strong>Add</strong>. The Holarc icon appears on your home screen.</> },
        ]
      : androidBrowser === "firefox"
      ? [
          { icon: <MoreVertical className="inline h-4 w-4 align-text-bottom" />, text: <>Tap the <strong>â‹®</strong> menu in Firefox.</> },
          { icon: null, text: <>Tap <strong>Install</strong> (or <strong>Add to Home screen</strong>).</> },
          { icon: null, text: <>Confirm. The Holarc icon appears on your home screen.</> },
        ]
      : [
          { icon: <MoreVertical className="inline h-4 w-4 align-text-bottom" />, text: <>Tap the <strong>â‹®</strong> menu in your browser (top right).</> },
          { icon: <Plus className="inline h-4 w-4 align-text-bottom" />, text: <>Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</> },
          { icon: null, text: <>Tap <strong>Install</strong>. The Holarc icon appears on your home screen.</> },
        ];

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
                ? "You're viewing this inside another app. Tap the menu (â€¢â€¢â€¢) and choose \"Open in Safari\" first, then follow the steps below."
                : "iOS doesn't have a one-tap install button, but it takes 3 quick taps in Safari:"}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                1
              </span>
              <span>
                Tap the <Share className="inline h-4 w-4 align-text-bottom" /> <strong>Share</strong> icon
                at the bottom of Safari.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                2
              </span>
              <span>
                Scroll down and tap <Plus className="inline h-4 w-4 align-text-bottom" />{" "}
                <strong>Add to Home Screen</strong>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                3
              </span>
              <span>
                Tap <strong>Add</strong> in the top right. The Holarc icon will appear on your home screen.
              </span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>

      <Dialog open={androidOpen} onOpenChange={setAndroidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAndroid ? "Install Holarc on your phone" : "Install Holarc"}
            </DialogTitle>
            <DialogDescription>{androidIntro}</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground">
            {androidSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {i + 1}
                </span>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}

