import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileCompletionBannerProps {
  /** Optional CTA — when provided, renders a "Complete my profile" button */
  onComplete?: () => void;
  /** Override the default heading */
  title?: string;
  /** Override the default body copy */
  message?: string;
  /** sessionStorage key so the banner stays dismissed for the rest of this session */
  storageKey?: string;
}

const DEFAULT_TITLE = "Help us care for you better";
const DEFAULT_MESSAGE =
  "Please complete your profile so your providers have what they need to deliver care safely and quickly. All information is encrypted in transit and at rest, accessible only to you and the practitioners you explicitly connect with. Holarc Health is HIPAA- and POPIA-aligned and never sells or shares your data.";

export function ProfileCompletionBanner({
  onComplete,
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
  storageKey = "holarc_profile_banner_dismissed",
}: ProfileCompletionBannerProps) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {}
    setDismissed(true);
  };

  return (
    <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 relative">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss for this consultation"
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-6">
        <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
          {onComplete && (
            <Button size="sm" onClick={onComplete} className="mt-1">
              Complete my profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
