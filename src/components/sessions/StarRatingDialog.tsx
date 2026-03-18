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

export function StarRatingDialog({
  open,
  onOpenChange,
  sessionId,
  ratedUserId,
  ratedUserName,
  raterRole,
  onRated,
}: StarRatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert the rating
      const { error } = await supabase.from('visit_ratings' as any).insert({
        session_id: sessionId,
        rater_id: user.id,
        rated_user_id: ratedUserId,
        rating,
        rater_role: raterRole,
      });

      if (error) throw error;

      // Award moolas based on rating to the rated user
      if (raterRole === "doctor") {
        // Patient gets moolas based on doctor's rating
        // Find the patient record to get patient_id
        const { data: session } = await supabase
          .from('sessions')
          .select('patient_id')
          .eq('id', sessionId)
          .single();

        if (session) {
          await supabase.from('patient_rewards').insert({
            patient_id: session.patient_id,
            session_id: sessionId,
            visit_category: 'Visit Rating',
            lollipops_count: rating,
            awarded_by: user.id,
          });
        }
      } else {
        // Doctor gets moolas based on patient's rating
        await supabase.from('doctor_rewards' as any).insert({
          doctor_id: ratedUserId,
          reward_type: 'visit_rating',
          description: `Rated ${rating} stars by patient`,
          moolas_count: rating,
          reference_id: sessionId,
        });
      }

      toast({
        title: "Rating Submitted",
        description: `You rated ${ratedUserName} ${rating} star${rating > 1 ? 's' : ''}`,
      });

      onRated?.();
      onOpenChange(false);
      setRating(0);
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

  const handleSkip = () => {
    onOpenChange(false);
    setRating(0);
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-center">Rate Your Visit</DialogTitle>
          <DialogDescription className="text-center">
            How was your experience with {ratedUserName}?
          </DialogDescription>
        </DialogHeader>

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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleSkip} className="sm:mr-auto">
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
          >
            Submit Rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
