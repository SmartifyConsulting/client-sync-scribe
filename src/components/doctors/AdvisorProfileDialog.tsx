import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";

interface DoctorProfileRow {
  id: string;
  full_name: string | null;
  specialty: string | null;
  practice_address: string | null;
  mobile_number: string | null;
  avatar_url: string | null;
  practice_number: string | null;
  about_me: string | null;
  preferred_language: string | null;
}

/**
 * Read-only advisor profile viewer, keyed by profile id. Self-fetches so any
 * screen that only has a advisor's id (or name) on hand can drill down into
 * their details without first loading the full profile record itself.
 */
export function AdvisorProfileDialog({
  advisorId,
  onOpenChange,
}: {
  advisorId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: advisor, isLoading } = useQuery({
    queryKey: ["advisor-profile-dialog", advisorId],
    enabled: !!advisorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, practice_address, mobile_number, avatar_url, practice_number, about_me, preferred_language")
        .eq("id", advisorId as string)
        .maybeSingle();
      if (error) throw error;
      return data as DoctorProfileRow | null;
    },
  });

  return (
    <Dialog open={!!advisorId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={advisor?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {advisor?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "WM"}
              </AvatarFallback>
            </Avatar>
            <span>{advisor?.full_name || "Wealth Manager"}</span>
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            {advisor?.specialty && <div><span className="text-muted-foreground">Specialty:</span> {advisor.specialty}</div>}
            {advisor?.practice_number && <div><span className="text-muted-foreground">Registration #:</span> {advisor.practice_number}</div>}
            {advisor?.preferred_language && (
              <div><span className="text-muted-foreground">Language:</span> {LANGUAGES.find((l) => l.code === advisor.preferred_language)?.name || advisor.preferred_language}</div>
            )}
            {advisor?.practice_address && <div><span className="text-muted-foreground">Address:</span> {advisor.practice_address}</div>}
            {advisor?.mobile_number && <div><span className="text-muted-foreground">Phone:</span> {advisor.mobile_number}</div>}
            <div className="hidden pt-2 border-t">
              <div className="text-muted-foreground mb-1 font-medium">About Me</div>
              {advisor?.about_me ? (
                <p className="whitespace-pre-wrap leading-relaxed">{advisor.about_me}</p>
              ) : (
                <p className="italic text-muted-foreground">Not provided yet.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
