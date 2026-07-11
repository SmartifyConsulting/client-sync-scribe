import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface GamificationCategory {
  id: string;
  visit_category: string;
  lollipops_awarded: number;
  description: string | null;
}

const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  { category: "GP Visit", keywords: ["general", "consultation", "check-up", "checkup", "gp visit", "general practitioner"] },
  { category: "Optometrist", keywords: ["eye", "vision", "optom", "ophthal", "glasses", "sight"] },
  { category: "Vital Signs Check", keywords: ["vital signs", "blood pressure", "bp check", "heart rate", "temperature"] },
  { category: "Cholesterol Test", keywords: ["cholesterol", "lipid", "ldl", "hdl", "triglyceride"] },
  { category: "Blood Sugar Test", keywords: ["blood sugar", "glucose", "diabetes", "hba1c", "insulin", "diabetic"] },
  { category: "HIV Test", keywords: ["hiv", "aids", "antiretroviral"] },
  { category: "Pap Smear", keywords: ["pap smear", "cervical", "pap test"] },
  { category: "Mammogram", keywords: ["mammogram", "breast exam", "breast cancer", "breast screen"] },
  { category: "Prostate Exam", keywords: ["prostate", "psa"] },
  { category: "Vaccination", keywords: ["vaccin", "immuniz", "immunis", "inject", "booster", "flu shot", "jab"] },
  { category: "Annual Physical", keywords: ["annual", "physical", "wellness check", "yearly"] },
  { category: "Health Screening", keywords: ["screening", "health screen", "preventive", "preventative"] },
];

function guessCategories(transcript: string): string[] {
  if (!transcript) return [];
  const lower = transcript.toLowerCase();
  const matches: string[] = [];
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some(kw => lower.includes(kw))) {
      matches.push(category);
    }
  }
  return matches;
}

interface VisitCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (categories: string[] | null) => void;
  patientName?: string;
  transcript?: string;
}

export function VisitCategoryDialog({
  open,
  onOpenChange,
  onConfirm,
  patientName,
  transcript,
}: VisitCategoryDialogProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [customCategory, setCustomCategory] = useState("");
  const [gamificationCategories, setGamificationCategories] = useState<GamificationCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Fetch gamification_config categories
  useEffect(() => {
    if (open) {
      setLoading(true);
      supabase
        .from('gamification_config')
        .select('id, visit_category, lollipops_awarded, description')
        .eq('is_active', true)
        .order('visit_category')
        .then(({ data }) => {
          setGamificationCategories(data || []);
          setLoading(false);
        });
    }
  }, [open]);

  // Auto-guess categories from transcript when dialog opens
  useEffect(() => {
    if (open && transcript) {
      const guesses = guessCategories(transcript);
      if (guesses.length > 0) {
        setSelectedCategories(new Set(guesses));
      }
      setTimeout(() => confirmRef.current?.focus(), 150);
    }
  }, [open, transcript]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const totalVulas = gamificationCategories
    .filter(c => selectedCategories.has(c.visit_category))
    .reduce((sum, c) => sum + c.lollipops_awarded, 0);

  const handleConfirm = async () => {
    const cats = Array.from(selectedCategories);
    const otherText = customCategory.trim();
    if (otherText) {
      // "Other" suggestions are NOT awarded as a real Vula — they're sent to
      // platform admins as a suggested new reward category for review.
      try {
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        const adminIds = (admins || []).map((a: any) => a.user_id).filter(Boolean);
        if (adminIds.length > 0) {
          await supabase.from("notifications").insert(
            adminIds.map((uid: string) => ({
              user_id: uid,
              title: "Suggested Vula reward",
              description: `A doctor suggested a new reward category: "${otherText}"${patientName ? ` (for ${patientName})` : ""}. Review and add to gamification config if appropriate.`,
              type: "admin_suggestion",
            }))
          );
        }
      } catch (e) {
        console.error("Failed to notify admins of Vula suggestion:", e);
      }
    }
    onConfirm(cats.length > 0 ? cats : null);
    setSelectedCategories(new Set());
    setCustomCategory("");
  };

  const handleSkip = () => {
    onConfirm(null);
    setSelectedCategories(new Set());
    setCustomCategory("");
  };

  // Build display list: gamification_config categories + fallback defaults
  const displayCategories = gamificationCategories.length > 0
    ? gamificationCategories
    : CATEGORY_KEYWORDS.map(ck => ({
        id: ck.category,
        visit_category: ck.category,
        lollipops_awarded: 1,
        description: null,
      }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">Ⓜ️</span>
            Award Vula?
          </DialogTitle>
          <DialogDescription>
            Select all visit types that apply to award {patientName || "the patient"} vula. Multiple selections allowed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-2 max-h-[350px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            displayCategories.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedCategories.has(cat.visit_category)}
                  onCheckedChange={() => toggleCategory(cat.visit_category)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{cat.visit_category}</p>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  )}
                </div>
                <span className="text-xs font-medium text-primary shrink-0">
                  +{cat.lollipops_awarded} Ⓜ️
                </span>
              </label>
            ))
          )}

          <div className="pt-2 border-t border-border">
            <Label className="text-xs text-muted-foreground">Other (suggest a new category)</Label>
            <Input
              placeholder="Suggest a new reward type..."
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Suggestions are sent to an admin for review — no Vula is awarded for "Other".
            </p>
          </div>
        </div>

        {selectedCategories.size > 0 && (
          <div className="text-sm font-medium text-primary text-center">
            Total: {totalVulas} Ⓜ️ for {selectedCategories.size} categor{selectedCategories.size === 1 ? 'y' : 'ies'}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleSkip} className="sm:mr-auto">
            Skip (No vula)
          </Button>
          <Button
            ref={confirmRef}
            onClick={handleConfirm}
            disabled={selectedCategories.size === 0 && !customCategory.trim()}
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            Ⓜ️ Award Vula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
