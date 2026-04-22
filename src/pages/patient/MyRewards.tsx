import { useState, useEffect, useMemo } from "react";
import { Loader2, Trophy, Target, Flame, Gift, Star, Video, Send, ArrowRightLeft, Pill, ArrowLeft, Info, History } from "lucide-react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format, parseISO, differenceInDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useMyRewards, useMyStreaks } from "@/hooks/usePatientRewards";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MedicationAdherenceTab } from "@/components/rewards/MedicationAdherenceTab";
import { useToast } from "@/hooks/use-toast";
import { VulaExplainerDialog } from "@/components/rewards/VulaExplainerDialog";
import vulaVouchersLogo from "@/assets/vula-vouchers-logo-v2.png";

const MILESTONES = [
  { count: 5, label: "First Steps", icon: "🌟", color: "text-yellow-500" },
  { count: 10, label: "Getting Healthy", icon: "💪", color: "text-blue-500" },
  { count: 25, label: "Health Champion", icon: "🏆", color: "text-purple-500" },
  { count: 50, label: "Wellness Warrior", icon: "⚔️", color: "text-orange-500" },
  { count: 100, label: "Health Legend", icon: "👑", color: "text-pink-500" },
];


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
  const [activeTab, setActiveTabRaw] = useState("overview");
  // Fallback for any persisted/legacy tab values that no longer exist
  const setActiveTab = (v: string) => {
    if (v === "history" || v === "streaks") setActiveTabRaw("overview");
    else setActiveTabRaw(v);
  };
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferFromAppId, setTransferFromAppId] = useState("");
  const [transferToAppId, setTransferToAppId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [showVulaExplainer, setShowVulaExplainer] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // First-time launch: auto-open the explainer once per user/device.
  useEffect(() => {
    try {
      if (!localStorage.getItem("vulas_explainer_seen_v1")) {
        setShowVulaExplainer(true);
        localStorage.setItem("vulas_explainer_seen_v1", "1");
      }
    } catch {}
  }, []);

  // Get patient record for chronic meds tab — prefer the record with active prescriptions
  const { data: patientRecord } = useQuery({
    queryKey: ["my-patient-record-with-rx"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: patients } = await supabase
        .from("patients")
        .select("id, is_chronic, created_at")
        .eq("patient_user_id", user.id);
      if (!patients?.length) return null;

      const ids = patients.map((p) => p.id);
      const { data: rxRows } = await supabase
        .from("prescriptions")
        .select("patient_id")
        .in("patient_id", ids)
        .eq("status", "active");

      const idWithRx = rxRows?.[0]?.patient_id;
      const sortedNewestFirst = [...patients].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return (
        patients.find((p) => p.id === idWithRx) ??
        sortedNewestFirst.find((p) => p.is_chronic) ??
        sortedNewestFirst[0]
      );
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
      setTransferFromAppId("");
      setTransferToAppId("");
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

  const totalTransferred = transfers.reduce((sum, t) => sum + t.amount, 0);

  // Build a unified Vula activity timeline (rewards + transfers) grouped by week/month
  type HistoryItem = {
    id: string;
    date: Date;
    label: string;
    amount: number; // positive earn, negative transfer
    kind: "earn" | "transfer";
  };

  const historyGroups = useMemo(() => {
    const items: HistoryItem[] = [];
    rewards.forEach((r) => {
      items.push({
        id: `r-${r.id}`,
        date: parseISO(r.awarded_at),
        label: r.visit_category,
        amount: r.lollipops_count,
        kind: r.lollipops_count >= 0 ? "earn" : "transfer",
      });
    });
    transfers.forEach((t) => {
      items.push({
        id: `t-${t.id}`,
        date: parseISO(t.created_at),
        label: t.moola_partner_apps?.name
          ? `Transfer to ${t.moola_partner_apps.name}`
          : "Vula Transfer",
        amount: -Math.abs(t.amount),
        kind: "transfer",
      });
    });
    items.sort((a, b) => b.date.getTime() - a.date.getTime());

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const groups: { key: string; label: string; items: HistoryItem[] }[] = [];
    const monthBuckets = new Map<string, HistoryItem[]>();
    const thisWeek: HistoryItem[] = [];

    items.forEach((it) => {
      if (isWithinInterval(it.date, { start: weekStart, end: weekEnd })) {
        thisWeek.push(it);
      } else {
        const k = format(it.date, "yyyy-MM");
        if (!monthBuckets.has(k)) monthBuckets.set(k, []);
        monthBuckets.get(k)!.push(it);
      }
    });

    groups.push({ key: "this-week", label: "This Week", items: thisWeek });
    Array.from(monthBuckets.keys())
      .sort((a, b) => b.localeCompare(a))
      .forEach((k) => {
        const arr = monthBuckets.get(k)!;
        groups.push({ key: k, label: format(arr[0].date, "MMMM yyyy"), items: arr });
      });
    return groups;
  }, [rewards, transfers]);

  return (
    <div className="space-y-6 animate-fade-in">
      <VulaExplainerDialog open={showVulaExplainer} onOpenChange={setShowVulaExplainer} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patient/details")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">My Rewards</h1>
              <button
                onClick={() => setShowVulaExplainer(true)}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                title="Learn about Vulas"
              >
                <Info className="h-3.5 w-3.5" />
                What are Vulas?
              </button>
            </div>
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
              Send your Vulas to a linked partner app. Available balance: {lollipopCount} <img src={vulaVouchersLogo} alt="Vula" className="h-4 w-auto object-contain inline-block" />
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={transferFromAppId} onValueChange={setTransferFromAppId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source app" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wallet">My Vula Wallet</SelectItem>
                  {partnerApps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Select value={transferToAppId} onValueChange={setTransferToAppId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination app" />
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
              <p className="text-xs text-muted-foreground">Max: {lollipopCount} <img src={vulaVouchersLogo} alt="Vula" className="h-3 w-auto object-contain inline-block" /></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
            <Button
              onClick={() => transferMutation.mutate({ appId: transferToAppId, amount: parseInt(transferAmount) || 0 })}
              disabled={!transferToAppId || !transferAmount || parseInt(transferAmount) <= 0 || parseInt(transferAmount) > lollipopCount || transferMutation.isPending}
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
                <p className="text-[10px] md:text-sm font-medium text-blue-100">Vula Vouchers</p>
                <p className="text-2xl md:text-4xl font-bold text-white">{lollipopCount}</p>
              </div>
              <div className="h-12 w-12 md:h-11 md:w-11 rounded-full bg-white shadow-sm flex items-center justify-center">
                <img src={vulaVouchersLogo} alt="Vulas" className="h-9 w-9 md:h-8 md:w-8 object-contain" />
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
            Wins
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
              <CardTitle>
                Recent Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <div className="text-center py-8">
                  <img src={vulaVouchersLogo} alt="Vula Vouchers" className="h-20 md:h-10 w-auto object-contain mx-auto mb-4" />
                  <p className="text-muted-foreground">No rewards yet. Start your health journey!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rewards.slice(0, 5).map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <img src={vulaVouchersLogo} alt="Vula" className="h-9 w-9 md:h-5 md:w-5 object-contain" />
                        <div>
                          <p className="font-medium">{reward.visit_category}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(reward.awarded_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        +{reward.lollipops_count} <img src={vulaVouchersLogo} alt="Vula" className="h-6 md:h-3 w-auto object-contain inline-block ml-1" />
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
                          {task.moolas_reward > 0 && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">+{task.moolas_reward} <img src={vulaVouchersLogo} alt="Vula" className="h-5 md:h-3 w-auto object-contain inline-block ml-0.5" /></Badge>}
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
                Wins
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

          {/* Streaks merged under Wins */}
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
                          Earns: {streak.lollipops_awarded} <img src={vulaVouchersLogo} alt="Vula" className="h-4 w-auto object-contain inline-block" /> per completion
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
          {/* Partner Apps - at top */}
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
                      <Button size="sm" className="w-full mt-3 gap-1 text-xs" onClick={() => { setTransferToAppId(app.id); setShowTransferDialog(true); }}>
                        <Send className="h-3 w-3" /> Transfer Vulas
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transfer History */}
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
                            -{transfer.amount} <img src={vulaVouchersLogo} alt="Vula" className="h-4 w-auto object-contain inline-block ml-0.5" />
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
