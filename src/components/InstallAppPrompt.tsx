import { Smartphone } from "lucide-react";
import { InstallAppButton } from "./InstallAppButton";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error - iOS Safari
    window.navigator.standalone === true
  );
}

interface Props {
  className?: string;
}

export function InstallAppPrompt({ className }: Props) {
  if (isStandalone()) return null;

  return (
    <div
      className={
        "rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3 " +
        (className || "")
      }
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Smartphone className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Install Holarc on your phone
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Works on iPhone and Android â€” one-tap access from your home screen.
        </p>
        <div className="mt-3">
          <InstallAppButton variant="primary" className="w-full sm:w-auto" />
        </div>
      </div>
    </div>
  );
}

