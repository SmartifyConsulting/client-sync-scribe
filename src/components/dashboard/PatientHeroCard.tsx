import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Camera, Loader2 } from "lucide-react";

import vulaVouchersLogo from "@/assets/vula-vouchers-logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyRewards } from "@/hooks/usePatientRewards";
import { useToast } from "@/hooks/use-toast";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function AnimatedCounter({ target }: { target: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return <>{value}</>;
}

/** Plain-language message for an avatar upload failure. */
function uploadErrorMessage(err: unknown): string {
  const raw = (err as any)?.message ? String((err as any).message) : "";
  const lower = raw.toLowerCase();

  if (!navigator.onLine) {
    return "You appear to be offline. Reconnect and try uploading your photo again.";
  }
  if (lower.includes("exceeded the maximum allowed size") || lower.includes("payload too large") || lower.includes("413")) {
    return "That image is too large. Please choose a JPG or PNG under 5 MB.";
  }
  if (lower.includes("row-level security") || lower.includes("unauthorized") || lower.includes("permission") || lower.includes("403")) {
    return "You don't have permission to update this photo. Try signing out and back in.";
  }
  if (lower.includes("jwt") || lower.includes("session") || lower.includes("401")) {
    return "Your session has expired. Please sign in again and retry the upload.";
  }
  if (lower.includes("bucket") || lower.includes("not found") || lower.includes("404")) {
    return "Photo storage isn't available right now. Please try again in a few minutes.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "The upload couldn't reach our servers. Check your connection and try again.";
  }
  return raw ? `We couldn't save your photo: ${raw}` : "We couldn't save your photo. Please try again.";
}

export function PatientHeroCard({
  action,
  emotionalLine,
}: {
  action?: React.ReactNode;
  /** Dynamic, data-derived sentence shown under the greeting. */
  emotionalLine?: string;
}) {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { toast } = useToast();
  const { lollipopCount, loading: rewardsLoading } = useMyRewards();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
  }, [profile?.avatar_url]);

  const fullName = profile?.full_name || (profileLoading ? "" : user?.email?.split("@")[0] || "");
  // Strip an honorific ("Dr", "Prof", "Mr"…) so "Dr Gianna Buttons" greets "Gianna", not "Dr".
  const firstName =
    fullName
      .replace(/^(dr|prof|mr|mrs|ms|miss|sr|snr)\.?\s+/i, "")
      .trim()
      .split(/\s+/)[0] || "";

  const initials =
    fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always reset so the same file can be picked again after a failure.
    e.target.value = "";
    if (!file) return;

    if (!user?.id) {
      toast({
        title: "Upload failed",
        description: "You need to be signed in to change your profile photo.",
        variant: "destructive",
      });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Unsupported file",
        description: "Please choose an image file (JPG, PNG or WebP).",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({
        title: "Image too large",
        description: `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please choose a JPG or PNG under 5 MB.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = (file.name.split(".").pop() || "jpg").toLowerCase();
      const fileName = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const newUrl = `${data.publicUrl}?t=${Date.now()}`;
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: newUrl })
        .eq("id", user.id);
      if (profileError) throw profileError;

      setAvatarUrl(newUrl);
      toast({ title: "Photo updated", description: "Your profile picture has been updated." });
    } catch (err) {
      toast({ title: "Upload failed", description: uploadErrorMessage(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <section className="rounded-xl border border-primary bg-gradient-to-br from-primary/5 via-card to-card p-4 md:p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <button
          type="button"
          className="flex flex-col items-center gap-1 shrink-0"
          onClick={() => inputRef.current?.click()}
          aria-label="Change profile photo"
        >
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-primary">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-background">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </span>
          </div>
          <span className="text-xs font-medium text-primary mt-0.5">
            {avatarUrl ? "Change photo" : "Add photo"}
          </span>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          {emotionalLine && (
            <p className="text-sm text-foreground mt-0.5">{emotionalLine}</p>
          )}
          <p className="text-muted-foreground text-xs">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          {action && <div className="mt-3">{action}</div>}
        </div>

        {!rewardsLoading && (
          <div className="hidden lg:flex shrink-0 items-center gap-3 ml-auto rounded-xl bg-background/70 border border-border px-4 py-2">
            <img src={vulaVouchersLogo} alt="Vulas" className="h-[52px] w-auto object-contain" />
            <span className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
              <AnimatedCounter target={lollipopCount || 0} />
            </span>
          </div>
        )}
      </div>

      {!rewardsLoading && (
        <div className="mt-3 border-t border-border pt-3 lg:hidden">
          <div className="flex items-center justify-center gap-2">
            <img src={vulaVouchersLogo} alt="Vulas" className="h-[52px] w-auto object-contain" />
            <span className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
              <AnimatedCounter target={lollipopCount || 0} />
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export default PatientHeroCard;
