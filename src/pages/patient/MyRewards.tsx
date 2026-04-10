import { useState } from "react";
import { Loader2, Trophy, Target, Flame, Gift, Star, Calendar, CheckSquare, Clock, AlertCircle, Video, Send, ArrowRightLeft, Pill, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useMyRewards, useMyStreaks } from "@/hooks/usePatientRewards";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActivityProofCapture } from "@/components/rewards/ActivityProofCapture";
import { MedicationAdherenceTab } from "@/components/rewards/MedicationAdherenceTab";
import { useToast } from "@/hooks/use-toast";
import vulaSymbol from "@/assets/vula-symbol.png";

const MILESTONES = [
  { count: 5, label: "First Steps", icon: "🌟", color: "text-yellow-500" },
  { count: 10, label: "Getting Healthy", icon: "💪", color: "text-blue-500" },
  { count: 25, label: "Health Champion", icon: "🏆", color: "text-purple-500" },
  { count: 50, label: "Wellness Warrior", icon: "⚔️", color: "text-orange-500" },
  { count: 100, label: "Health Legend", icon: "👑", color: "text-pink-500" },
];

interface PatientTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  task_type: string;
  moolas_reward: number;
  proof_url: string | null;
  patient_id: string | null;
}

interface PartnerApp {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  creator: string | null;
  signup_url: string | null;
  google_play_url: string | null;
  app_store_url: string | null;
}

interface VulaTransfer {
  id: string;
  amount: number;
  created_at: string;
  partner_app_id: string;
  moola_partner_apps?: { name: string; logo_url: string | null };
}

export default function MyRewards() {
  const { rewards, lollipopCount, loading: rewardsLoading } = useMyRewards();
  const { streaks, loading: streaksLoading } = useMyStreaks();
  const [activeTab, setActiveTab] = useState("overview");
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferAppId, setTransferAppId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Get patient record for chronic meds tab
  const { data: patientRecord } = useQuery({
    queryKey: ["my-patient-record"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("patients")
        .select("id, is_chronic")
        .eq("patient_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["patient-assigned-tasks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: patients } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", user.id);
      if (!patients || patients.length === 0) return [];
      const patientIds = patients.map((p) => p.id);
      const { data: todos, error } = await supabase
        .from("todos")
        .select("*")
        .in("patient_id", patientIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (todos || []) as PatientTask[];
    },
  });

  const { data: partnerApps = [] } = useQuery({
    queryKey: ["moola-partner-apps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moola_partner_apps")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as PartnerApp[];
    },
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["moola-transfers"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("moola_transfers")
        .select("*, moola_partner_apps(name, logo_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as VulaTransfer[];
    },
  });

  const transferMutation = useMutation({
    mutationFn: async ({ appId, amount }: { appId: string; amount: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (amount > lollipopCount) throw new Error("Insufficient Vulas");
      if (amount <= 0) throw new Error("Amount must be positive");

      // Get patient id for the deduction record
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!patient) throw new Error("No patient record found");

      // Insert transfer record
      const { error: transferError } = await supabase
        .from("moola_transfers")
        .insert({ user_id: user.id, partner_app_id: appId, amount });
      if (transferError) throw transferError;

      // Insert negative reward to deduct balance
      const { error: deductError } = await supabase
        .from("patient_rewards")
        .insert({
          patient_id: patient.id,
          awarded_by: user.id,
          lollipops_count: -amount,
          visit_category: "Vula Transfer",
          reward_type: "transfer",
        });
      if (deductError) throw deductError;
    },
    onSuccess: () => {
      toast({ title: "Transfer successful", description: "Your Vulas have been transferred." });
      queryClient.invalidateQueries({ queryKey: ["moola-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["my-rewards"] });
      setShowTransferDialog(false);
      setTransferAppId("");
      setTransferAmount("");
    },
    onError: (err: Error) => {
      toast({ title: "Transfer failed", description: err.message, variant: "destructive" });
    },
  });

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckSquare className="h-4 w-4 text-green-500" />;
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const pendingActivityTasks = tasks.filter((t) => t.task_type === "activity" && t.status !== "completed");
  const totalTransferred = transfers.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Rewards</h1>
            <p className="mt-1 text-muted-foreground text-[12px]">
              Track your Vulas, milestones, and health streaks
            </p>
          </div>
        </div>
        {partnerApps.length > 0 && (
          <Button onClick={() => setShowTransferDialog(true)} className="gap-2">
            <Send className="h-4 w-4" />
            Transfer Vulas
          </Button>
        )}
      </div>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Vulas</DialogTitle>
            <DialogDescription>
              Send your Vulas to a linked partner app. Available balance: {lollipopCount} Ⓜ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Partner App</Label>
              <Select value={transferAppId} onValueChange={setTransferAppId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an app" />
                </SelectTrigger>
                <SelectContent>
                  {partnerApps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min={1}
                max={lollipopCount}
                placeholder="Enter amount"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Max: {lollipopCount} Ⓜ</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
            <Button
              onClick={() => transferMutation.mutate({ appId: transferAppId, amount: parseInt(transferAmount) || 0 })}
              disabled={!transferAppId || !transferAmount || parseInt(transferAmount) <= 0 || parseInt(transferAmount) > lollipopCount || transferMutation.isPending}
            >
              {transferMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hero Stats — compact on mobile */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-cyan-400 dark:from-blue-700/40 dark:to-cyan-700/30 border-blue-400 dark:border-blue-600/40">
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-blue-100">Total Vulas</p>
                <p className="text-2xl md:text-4xl font-bold text-white">{lollipopCount}</p>
              </div>
              <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-white shadow-sm flex items-center justify-center">
                <img src={vulaSymbol} alt="Vulas" className="h-7 w-7 md:h-10 md:w-10 object-contain" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600 to-teal-500 dark:from-blue-800/40 dark:to-teal-700/30 border-blue-500 dark:border-blue-700/40">
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-blue-100">Current Level</p>
                <p className="text-sm md:text-xl font-bold text-white">
                  {currentMilestone?.label || "Beginner"}
                </p>
              </div>
              <span className="text-2xl md:text-4xl">{currentMilestone?.icon || "🌱"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-sky-400 to-teal-400 dark:from-sky-700/40 dark:to-teal-700/30 border-sky-400 dark:border-sky-600/40">
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-sky-100">Active Streaks</p>
                <p className="text-2xl md:text-4xl font-bold text-white">{activeStreaks.length}</p>
              </div>
              <Flame className="h-8 w-8 md:h-12 md:w-12 text-white/90" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-400 to-blue-500 dark:from-indigo-700/40 dark:to-blue-800/30 border-indigo-400 dark:border-indigo-600/40">
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-indigo-100">Transferred</p>
                <p className="text-2xl md:text-4xl font-bold text-white">{totalTransferred}</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 md:h-12 md:w-12 text-white/90" />
            </div>
            {partnerApps.length > 0 && (
              <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/20 p-0 h-auto text-[10px] md:text-xs flex items-center gap-1 mt-1 md:mt-2" onClick={() => setShowTransferDialog(true)}>
                Transfer Vulas <Send className="h-3 w-3" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-primary">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">
            Overview
          </TabsTrigger>
          {patientRecord?.is_chronic && (
            <TabsTrigger value="chronic-meds" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">
              <Pill className="h-4 w-4 mr-1" />
              Chronic Meds
            </TabsTrigger>
          )}
          <TabsTrigger value="milestones" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">
            Milestones
          </TabsTrigger>
          <TabsTrigger value="streaks" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">
            Streaks
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">
            History
          </TabsTrigger>
          <TabsTrigger value="transfers" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">
             Vulas
           </TabsTrigger>
         </TabsList>

        {patientRecord?.is_chronic && patientRecord?.id && (
          <TabsContent value="chronic-meds" className="space-y-6">
            <MedicationAdherenceTab patientId={patientRecord.id} />
          </TabsContent>
        )}

        <TabsContent value="overview" className="space-y-6">
          {nextMilestone && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Progress to Next Milestone
                </CardTitle>
                <CardDescription>
                  {lollipopCount} / {nextMilestone.count} Vulas to "{nextMilestone.label}"
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
                  <img src={vulaSymbol} alt="Vula" className="h-12 w-12 object-contain mx-auto mb-4" />
                  <p className="text-muted-foreground">No rewards yet. Start your health journey!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rewards.slice(0, 5).map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <img src={vulaSymbol} alt="Vula" className="h-7 w-7 object-contain" />
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

          {/* Assigned Tasks - merged into overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    Assigned Tasks
                    {tasks.filter(t => t.status !== "completed").length > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                        {tasks.filter(t => t.status !== "completed").length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Complete activities to earn Vulas!</CardDescription>
                </div>
                <ActivityProofCapture tasks={pendingActivityTasks} onProofSubmitted={refetchTasks} />
              </div>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : tasks.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">No tasks assigned yet.</p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg border ${task.status === "completed" ? "opacity-60 bg-muted/30" : "bg-background"}`}>
                      {getStatusIcon(task.status)}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-foreground ${task.status === "completed" ? "line-through" : ""}`}>{task.title}</p>
                        {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant={getPriorityColor(task.priority) as any} className="text-xs">{task.priority}</Badge>
                          {task.task_type === "activity" && <Badge className="bg-primary/10 text-primary text-xs gap-1"><Video className="h-3 w-3" /> Activity</Badge>}
                          {task.moolas_reward > 0 && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">+{task.moolas_reward} Ⓜ</Badge>}
                          {task.due_date && <span className="text-xs text-muted-foreground">Due: {format(new Date(task.due_date), "dd MMM yyyy")}</span>}
                          {task.proof_url && <Badge variant="outline" className="text-xs text-green-600">✓ Proof submitted</Badge>}
                        </div>
                      </div>
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
                Collect Vulas to unlock milestone badges
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
                            {milestone.count} Vulas
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
                Maintain regular health checkups to earn bonus Vulas
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

        <TabsContent value="transfers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                Transfer History
              </CardTitle>
              <CardDescription>
                Record of all Vula transfers to partner apps
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transfers.length === 0 ? (
                <div className="text-center py-8">
                  <ArrowRightLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No transfers yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Partner App</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell>
                          <div>{format(parseISO(transfer.created_at), "MMM d, yyyy")}</div>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(transfer.created_at), "h:mm a")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {transfer.moola_partner_apps?.name || "Unknown App"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-blue-600 font-semibold">
                            -{transfer.amount} Ⓜ
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {/* Partner Apps - merged into Vulas tab */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Approved Vula Partner Apps
              </CardTitle>
              <CardDescription>Apps that accept Vulas. Transfer directly below.</CardDescription>
            </CardHeader>
            <CardContent>
              {partnerApps.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">No partner apps available yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {partnerApps.map((app) => (
                    <div key={app.id} className="p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        {app.logo_url ? (
                          <img src={app.logo_url} alt={app.name} className="h-10 w-10 rounded-lg object-contain" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Gift className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">{app.name}</p>
                          {app.creator && <p className="text-xs text-muted-foreground">by {app.creator}</p>}
                        </div>
                      </div>
                      <Button size="sm" className="w-full mt-3 gap-1 text-xs" onClick={() => { setTransferAppId(app.id); setShowTransferDialog(true); }}>
                        <Send className="h-3 w-3" /> Transfer Vulas
                      </Button>
                    </div>
                  ))}
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
              <CardDescription>Complete log of all Vulas earned</CardDescription>
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
                      <TableHead className="text-right">Vulas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewards.map((reward) => (
                      <TableRow key={reward.id}>
                        <TableCell>
                          <div>{format(parseISO(reward.awarded_at), "MMM d, yyyy")}</div>
                          <span className="text-xs text-muted-foreground">{format(parseISO(reward.awarded_at), "h:mm a")}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-primary/10 text-primary">{reward.visit_category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${reward.lollipops_count < 0 ? "text-blue-600" : "text-emerald-600"}`}>
                            {reward.lollipops_count > 0 ? "+" : ""}{reward.lollipops_count} Ⓜ
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
