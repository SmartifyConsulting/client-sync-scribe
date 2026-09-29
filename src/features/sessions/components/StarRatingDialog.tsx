import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StarRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  ratedUserId: string;
  ratedUserName: string;
  raterRole: "doctor" | "patient";
  onRated?: () => void;
}

const DOCTOR_CRITERIA = [
  { key: "communication", label: "Communication" },
  { key: "expertise", label: "Expertise" },
  { key: "professionalism", label: "Professionalism" },
] as const;

function StarRow({
  label,
  rating,
  hoveredRating,
  onRate,
  onHover,
  onLeave,
}: {
  label: string;
  rating: number;
  hoveredRating: number;
  onRate: (v: number) => void;
  onHover: (v: number) => void;
  onLeave: () => void;
}) {
  const display = hoveredRating || rating;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-foreground min-w-[110px]">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRate(star)}
            onMouseEnter={() => onHover(star)}
            onMouseLeave={onLeave}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "h-7 w-7 transition-colors",
                star <= display
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function StarRatingDialog({
  open,
  onOpenChange,
  sessionId,
  ratedUserId,
  ratedUserName,
  raterRole,
  onRated,
}: StarRatingDialogProps) {
  // For patient rating doctor: multi-criteria
  const [communicationRating, setCommunicationRating] = useState(0);
  const [expertiseRating, setExpertiseRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [hoveredComm, setHoveredComm] = useState(0);
  const [hoveredExp, setHoveredExp] = useState(0);
  const [hoveredProf, setHoveredProf] = useState(0);

  // For doctor rating patient: single rating
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const isMultiCriteria = raterRole === "patient";
  const overallRating = isMultiCriteria
    ? Math.round((communicationRating + expertiseRating + professionalismRating) / 3)
    : rating;
  const canSubmit = isMultiCriteria
    ? communicationRating > 0 && expertiseRating > 0 && professionalismRating > 0
    : rating > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const insertData: any = {
        session_id: sessionId,
        rater_id: user.id,
        rated_user_id: ratedUserId,
        rating: overallRating,
        rater_role: raterRole,
      };

      if (isMultiCriteria) {
        insertData.communication_rating = communicationRating;
        insertData.expertise_rating = expertiseRating;
        insertData.professionalism_rating = professionalismRating;
      }

      const { error } = await supabase.from('visit_ratings' as any).insert(insertData);
      if (error) throw error;

      // Award vulas
      if (raterRole === "doctor") {
        const { data: session } = await supabase
          .from('sessions')
          .select('patient_id')
          .eq('id', sessionId)
          .single();

        if (session) {
        }
      } else {
        await supabase.from('doctor_rewards' as any).insert({
          doctor_id: ratedUserId,
          reward_type: 'visit_rating',
          description: `Rated ${overallRating} stars by patient`,
          vulas_count: overallRating,
          reference_id: sessionId,
        });
      }

      toast({
        title: "Rating Submitted",
        description: `You rated ${ratedUserName} ${overallRating} star${overallRating > 1 ? 's' : ''}`,
      });

      onRated?.();
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetState = () => {
    setRating(0);
    setCommunicationRating(0);
    setExpertiseRating(0);
    setProfessionalismRating(0);
  };

  const handleSkip = () => {
    onOpenChange(false);
    resetState();
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-center">Rate Your Visit</DialogTitle>
          <DialogDescription className="text-center">
            How was your experience with {ratedUserName}?
          </DialogDescription>
        </DialogHeader>

        {isMultiCriteria ? (
          <div className="space-y-4 py-4">
            <StarRow
              label="Communication"
              rating={communicationRating}
              hoveredRating={hoveredComm}
              onRate={setCommunicationRating}
              onHover={setHoveredComm}
              onLeave={() => setHoveredComm(0)}
            />
            <StarRow
              label="Expertise"
              rating={expertiseRating}
              hoveredRating={hoveredExp}
              onRate={setExpertiseRating}
              onHover={setHoveredExp}
              onLeave={() => setHoveredExp(0)}
            />
            <StarRow
              label="Professionalism"
              rating={professionalismRating}
              hoveredRating={hoveredProf}
              onRate={setProfessionalismRating}
              onHover={setHoveredProf}
              onLeave={() => setHoveredProf(0)}
            />
            {canSubmit && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                Overall: {overallRating} ★ — +{overallRating} Ⓜ️
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-2 py-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-10 w-10 transition-colors",
                      star <= displayRating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>

            {displayRating > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {displayRating === 1 && "Poor"}
                {displayRating === 2 && "Fair"}
                {displayRating === 3 && "Good"}
                {displayRating === 4 && "Very Good"}
                {displayRating === 5 && "Excellent"}
                {" — "}+{displayRating} Ⓜ️
              </p>
            )}
          </>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleSkip} className="sm:mr-auto">
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            Submit Rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
