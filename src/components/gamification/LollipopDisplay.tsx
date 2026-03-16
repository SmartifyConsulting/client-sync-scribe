import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PatientReward } from "@/hooks/usePatientRewards";
import { format, parseISO } from "date-fns";

interface LollipopDisplayProps {
  count: number;
  rewards?: PatientReward[];
  showHistory?: boolean;
  variant?: "card" | "badge" | "compact";
}

export function LollipopDisplay({ 
  count, 
  rewards = [], 
  showHistory = false,
  variant = "card" 
}: LollipopDisplayProps) {
  if (variant === "badge") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">
              <span className="text-lg font-bold">Ⓜ</span>
              <span className="font-bold">{count}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{count} Moola{count !== 1 ? 's' : ''} earned for healthy visits!</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-xl font-bold text-emerald-600">Ⓜ</span>
        <span className="font-semibold text-foreground">{count}</span>
        <span className="text-muted-foreground">Moola{count !== 1 ? 's' : ''}</span>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-2xl font-bold text-emerald-600">Ⓜ</span>
          Moola Rewards
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-3">
          <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
            {count}
          </div>
          <div className="text-sm text-muted-foreground">
            Moola{count !== 1 ? 's' : ''} earned<br />
            for healthy visits
          </div>
        </div>
        
        {showHistory && rewards.length > 0 && (
          <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Recent rewards:</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {rewards.slice(0, 5).map((reward) => (
                <div key={reward.id} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{reward.visit_category}</span>
                  <span className="text-muted-foreground">
                    {format(parseISO(reward.awarded_at), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
