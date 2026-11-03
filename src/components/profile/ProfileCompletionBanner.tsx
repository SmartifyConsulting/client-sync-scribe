import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

const DEFAULT_TITLE = "Help us serve you better";
const DEFAULT_MESSAGE =
  "Please complete your profile so your Wealth Manager has what they need to advise you accurately and quickly. All information is encrypted in transit and at rest, accessible only to you and the advisors you explicitly connect with. Holarc Wealth is POPIA-aligned and never sells or shares your data.";

export function ProfileCompletionBanner({
  onComplete,
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
  storageKey = "holarc_profile_banner_dismissed",
}: ProfileCompletionBannerProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const scopedKey = `${storageKey}:${user?.id ?? "guest"}`;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(scopedKey) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed || user?.user_metadata?.profile_reminder_dismissals?.[storageKey]) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(scopedKey, "1");
    } catch {}
    setDismissed(true);
  };

  const dismissPermanently = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: {
      profile_reminder_dismissals: { ...user.user_metadata?.profile_reminder_dismissals, [storageKey]: true },
    } });
    setSaving(false);
    if (error) { toast.error("Couldn't save your preference. Please try again."); return; }
    setDismissed(true);
  };

  return (
    <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 relative">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Ignore for now"
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-6">
        <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
          <div className="flex flex-wrap gap-2 items-center">
          {onComplete && (
            <Button size="sm" onClick={onComplete} className="mt-1">
              Complete my profile
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={dismiss}>Ignore for now</Button>
          {user && <Button size="sm" variant="ghost" disabled={saving} onClick={dismissPermanently}>Do not remind me again</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
