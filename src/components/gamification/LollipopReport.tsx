import { format, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Gift, Calendar, Award } from "lucide-react";
import type { PatientReward } from "@/hooks/usePatientRewards";

interface LollipopReportProps {
  rewards: PatientReward[];
  loading?: boolean;
  totalCount: number;
}

export function LollipopReport({ rewards, loading, totalCount }: LollipopReportProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-3xl font-bold text-blue-600">â“‚</span>
            Vula Summary
          </CardTitle>
          <CardDescription>
            Total rewards earned for healthy visits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white/50 dark:bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Award className="h-4 w-4" />
                Vula Vouchers
              </div>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {totalCount}
              </div>
            </div>
            <div className="rounded-lg bg-white/50 dark:bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Gift className="h-4 w-4" />
                Rewards Earned
              </div>
              <div className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">
                {rewards.length}
              </div>
            </div>
            <div className="rounded-lg bg-white/50 dark:bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                Last Reward
              </div>
              <div className="text-lg font-semibold text-foreground">
                {rewards.length > 0 
                  ? format(parseISO(rewards[0].awarded_at), "MMM d, yyyy")
                  : "No rewards yet"
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-blue-500" />
            Reward History
          </CardTitle>
          <CardDescription>
            Detailed log of all Vulas earned
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-5xl mb-4 block font-bold text-blue-600">â“‚</span>
              <p className="text-muted-foreground">No Vulas earned yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Attend healthy visits to start collecting Vulas!
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Visit Type</TableHead>
                  <TableHead>Vulas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(parseISO(reward.awarded_at), "MMM d, yyyy")}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(parseISO(reward.awarded_at), "h:mm a")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {reward.visit_category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                        +{reward.lollipops_count || 1} â“‚
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

