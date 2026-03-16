import { useState } from "react";
import { Loader2, Trophy, Target, Flame, Gift, Star, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO, differenceInDays } from "date-fns";
import { useMyRewards, useMyStreaks } from "@/hooks/usePatientRewards";

const MILESTONES = [
  { count: 5, label: "First Steps", icon: "🌟", color: "text-yellow-500" },
  { count: 10, label: "Getting Healthy", icon: "💪", color: "text-blue-500" },
  { count: 25, label: "Health Champion", icon: "🏆", color: "text-purple-500" },
  { count: 50, label: "Wellness Warrior", icon: "⚔️", color: "text-orange-500" },
  { count: 100, label: "Health Legend", icon: "👑", color: "text-pink-500" },
];

export default function MyRewards() {
  const { rewards, lollipopCount, loading: rewardsLoading } = useMyRewards();
  const { streaks, loading: streaksLoading } = useMyStreaks();
  const [activeTab, setActiveTab] = useState("overview");

  const loading = rewardsLoading || streaksLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentMilestone = MILESTONES.filter(m => lollipopCount >= m.count).pop();
  const nextMilestone = MILESTONES.find(m => lollipopCount < m.count);
  const progressToNext = nextMilestone 
    ? Math.round((lollipopCount / nextMilestone.count) * 100) 
    : 100;

  const activeStreaks = streaks.filter(s => s.current_streak > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Rewards</h1>
        <p className="mt-1 text-muted-foreground">
          Track your Moolas, milestones, and health streaks
        </p>
      </div>

      {/* Hero Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950/30 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Moolas</p>
                <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{lollipopCount}</p>
              </div>
              <span className="text-5xl font-bold text-emerald-600">Ⓜ</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Level</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {currentMilestone?.label || "Beginner"}
                </p>
              </div>
              <span className="text-4xl">{currentMilestone?.icon || "🌱"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Streaks</p>
                <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">{activeStreaks.length}</p>
              </div>
              <Flame className="h-12 w-12 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Visits Completed</p>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">{rewards.length}</p>
              </div>
              <Gift className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-primary">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="milestones" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">
            Milestones
          </TabsTrigger>
          <TabsTrigger value="streaks" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">
            Streaks
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Progress to Next Milestone */}
          {nextMilestone && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Progress to Next Milestone
                </CardTitle>
                <CardDescription>
                  {lollipopCount} / {nextMilestone.count} Moolas to "{nextMilestone.label}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={progressToNext} className="h-4" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{nextMilestone.count - lollipopCount} more to go!</span>
                    <span className="text-2xl">{nextMilestone.icon}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Rewards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-emerald-500" />
                Recent Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-5xl mb-4 block font-bold text-emerald-600">Ⓜ</span>
                  <p className="text-muted-foreground">No rewards yet. Start your health journey!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rewards.slice(0, 5).map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-emerald-600">Ⓜ</span>
                        <div>
                          <p className="font-medium">{reward.visit_category}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(reward.awarded_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        +{reward.lollipops_count} Ⓜ
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Milestone Achievements
              </CardTitle>
              <CardDescription>
                Collect Moolas to unlock milestone badges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {MILESTONES.map((milestone) => {
                  const unlocked = lollipopCount >= milestone.count;
                  return (
                    <div
                      key={milestone.count}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        unlocked
                          ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30"
                          : "border-muted bg-muted/20 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-4xl ${!unlocked && "grayscale"}`}>
                          {milestone.icon}
                        </span>
                        <div>
                          <p className={`font-bold ${milestone.color}`}>
                            {milestone.label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {milestone.count} Moolas
                          </p>
                        </div>
                      </div>
                      {unlocked && (
                        <Badge className="mt-3 bg-yellow-500 text-white">
                          <Star className="h-3 w-3 mr-1" /> Unlocked!
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streaks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Health Streaks
              </CardTitle>
              <CardDescription>
                Maintain regular health checkups to earn bonus Moolas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {streaks.length === 0 ? (
                <div className="text-center py-8">
                  <Flame className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No streak data yet. Complete your first preventive visit!</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {streaks.map((streak) => {
                    const daysUntilDue = streak.next_due_at 
                      ? differenceInDays(parseISO(streak.next_due_at), new Date())
                      : null;
                    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                    
                    return (
                      <div
                        key={streak.id}
                        className={`p-4 rounded-xl border ${
                          streak.current_streak > 0
                            ? "border-orange-300 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30"
                            : "border-muted bg-muted/20"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-foreground">{streak.streak_name}</p>
                            <p className="text-sm text-muted-foreground">{streak.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <Flame className={`h-5 w-5 ${streak.current_streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
                              <span className="text-2xl font-bold">{streak.current_streak}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">streak</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-muted flex items-center justify-between text-sm">
                          <div>
                            <span className="text-muted-foreground">Longest: </span>
                            <span className="font-medium">{streak.longest_streak}</span>
                          </div>
                          {daysUntilDue !== null && (
                            <Badge variant={isOverdue ? "destructive" : "secondary"}>
                              {isOverdue 
                                ? `${Math.abs(daysUntilDue)} days overdue`
                                : `Due in ${daysUntilDue} days`
                              }
                            </Badge>
                          )}
                        </div>
                        
                        <div className="mt-2 text-xs text-muted-foreground">
                          Earns: {streak.lollipops_awarded} Ⓜ per completion
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Full Reward History
              </CardTitle>
              <CardDescription>
                Complete log of all Moolas earned
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-5xl mb-4 block font-bold text-emerald-600">Ⓜ</span>
                  <p className="text-muted-foreground">No rewards yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Visit Type</TableHead>
                      <TableHead className="text-right">Moolas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewards.map((reward) => (
                      <TableRow key={reward.id}>
                        <TableCell>
                          <div>
                            {format(parseISO(reward.awarded_at), "MMM d, yyyy")}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(reward.awarded_at), "h:mm a")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            {reward.visit_category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-emerald-600 font-semibold">
                            +{reward.lollipops_count} Ⓜ
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
