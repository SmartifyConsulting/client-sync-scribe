import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Loader2, Trophy, Target, Flame, Gift, Star, Video, Send, ArrowRightLeft, Pill, ArrowLeft, Info, History, Vault } from "lucide-react";
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
import { useMyRewards, useMyStreaks, useMyChronicPatientId } from "@/hooks/usePatientRewards";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { MedicationAdherenceTab } from "@/components/rewards/MedicationAdherenceTab";
import { MonthlyAdherenceSummary } from "@/components/rewards/MonthlyAdherenceSummary";
import { TodaysMedicationsCard } from "@/components/rewards/TodaysMedicationsCard";
import { useToast } from "@/hooks/use-toast";
import { VulaExplainerDialog } from "@/features/rewards/components/VulaExplainerDialog";
import vulaVouchersLogo from "@/assets/vula-vouchers-logo-v2.png";
import vulaVaultLogo from "@/assets/vula-vault-logo.png";
import vulaVaultMerchants from "@/assets/vula-vault-merchants.png";

const VAULT_UNLOCK_THRESHOLD = 2000;

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
  vula_partner_apps?: { name: string; logo_url: string | null };
}

export default function MyRewards({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDoctor } = useUserRole();
  const { rewards, lollipopCount, loading: rewardsLoading } = useMyRewards();
  const { streaks, loading: streaksLoading } = useMyStreaks();

  const { data: doctorVulas = 0 } = useQuery({
    queryKey: ["doctor-vulas-profile", user?.id],
    enabled: !!user?.id && isDoctor,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_rewards")
        .select("vulas_count")
        .eq("doctor_id", user!.id);
      if (error || !data) return 0;
      return data.reduce((sum, r) => sum + (r.vulas_count || 0), 0);
    },
  });
  const combinedVulas = doctorVulas + lollipopCount;
  const [activeTab, setActiveTabRaw] = useState<string>(() => {
    try {
      return localStorage.getItem("rewards_last_tab_v1") || "overview";
    } catch {
      return "overview";
    }
  });
  const [focusRxId, setFocusRxId] = useState<string | null>(null);
  // Fallback for any persisted/legacy tab values that no longer exist
  const setActiveTab = (v: string) => {
    let next = v;
    if (v === "history") next = "overview";
    else if (v === "streaks" || v === "milestones" || v === "wins" || v === "wins-and-streaks") next = "wins-streaks";
    setActiveTabRaw(next);
    try { localStorage.setItem("rewards_last_tab_v1", next); } catch {}
  };
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferFromAppId, setTransferFromAppId] = useState("");
  const [transferToAppId, setTransferToAppId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [showVulaExplainer, setShowVulaExplainer] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Auto-popup disabled per user request — explainer is available via the "What are Vulas?" button.

  // Get patient record (robust selector — prefers record with active prescriptions)
  const { data: patientRecord } = useMyChronicPatientId();

  // Default chronic patients to the chronic-meds tab on first paint
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);
  useEffect(() => {
    if (hasAutoSwitched) return;
    if (!patientRecord?.is_chronic) return;
    const stored = (() => { try { return localStorage.getItem("rewards_last_tab_v1"); } catch { return null; } })();
    if (!stored || stored === "overview") {
      setActiveTabRaw("chronic-meds");
    }
    setHasAutoSwitched(true);
  }, [patientRecord, hasAutoSwitched]);

  const handleTakeMedication = (rxId: string) => {
    setFocusRxId(rxId);
    setActiveTab("chronic-meds");
  };



  const { data: partnerApps = [] } = useQuery({
    queryKey: ["vula-partner-apps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vula_partner_apps")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as PartnerApp[];
    },
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["vula-transfers"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("vula_transfers")
        .select("*, vula_partner_apps(name, logo_url)")
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

      const isVault = appId === "vault";
      // Insert transfer record (skip FK for vault)
      if (!isVault) {
        const { error: transferError } = await supabase
          .from("vula_transfers")
          .insert({ user_id: user.id, partner_app_id: appId, amount });
        if (transferError) throw transferError;
      }

      // Insert negative reward to deduct balance
      const { error: deductError } = await supabase
        .from("patient_rewards")
        .insert({
          patient_id: patient.id,
          awarded_by: user.id,
          lollipops_count: -amount,
          visit_category: isVault ? "Vula Vault" : "Vula Transfer",
          reward_type: "transfer",
        });
      if (deductError) throw deductError;
    },
    onSuccess: () => {
      toast({ title: "Transfer successful", description: "Your Vulas have been transferred." });
      queryClient.invalidateQueries({ queryKey: ["vula-transfers"] });
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

  // Build a unified Vula activity timeline (rewards + transfers) grouped by week/month
  type HistoryItem = {
    id: string;
    date: Date;
    label: string;
    amount: number;
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
        label: t.vula_partner_apps?.name
          ? `Transfer to ${t.vula_partner_apps.name}`
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

  return (
    <div className="w-full space-y-6">
      <VulaExplainerDialog open={showVulaExplainer} onOpenChange={setShowVulaExplainer} />
      {!embedded && (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isDoctor && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/patient/details")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground">My Rewards</h1>
              <button
                onClick={() => setShowVulaExplainer(true)}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                title="Learn about Vulas"
              >
                <Info className="h-3.5 w-3.5" />
                What are Vulas?
              </button>
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
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
      )}

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
                  <SelectItem value="wallet">My Vula Vault</SelectItem>
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
                  <SelectItem value="vault">Vula Vault</SelectItem>
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
      <div className={cn("grid grid-cols-2 gap-2 md:gap-4", isDoctor ? "md:grid-cols-6" : "md:grid-cols-4")}>
        {isDoctor && (
          <>
            <Card className="bg-gradient-to-br from-emerald-500 to-teal-400 dark:from-emerald-700/40 dark:to-teal-700/30 border-emerald-400 dark:border-emerald-600/40">
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-emerald-100">Doctor Vulas</p>
                    <p className="text-2xl md:text-4xl font-bold text-white">{doctorVulas}</p>
                  </div>
                  <Star className="h-8 w-8 text-white/90 shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500 to-indigo-400 dark:from-purple-700/40 dark:to-indigo-700/30 border-purple-400 dark:border-purple-600/40">
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-purple-100">Combined Vulas</p>
                    <p className="text-2xl md:text-4xl font-bold text-white">{combinedVulas}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-white/90 shrink-0" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
        <Card className="bg-gradient-to-br from-blue-500 to-cyan-400 dark:from-blue-700/40 dark:to-cyan-700/30 border-blue-400 dark:border-blue-600/40">
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-blue-100">Vulas</p>
                <p className="text-2xl md:text-4xl font-bold text-white">{lollipopCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                <img src={vulaVouchersLogo} alt="Vulas" className="h-8 w-8 object-contain" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600 to-teal-500 dark:from-blue-800/40 dark:to-teal-700/30 border-blue-500 dark:border-blue-700/40">
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-blue-100">Current Level</p>
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
                <p className="text-xs md:text-sm font-medium text-sky-100">Active Streaks</p>
                <p className="text-2xl md:text-4xl font-bold text-white">{activeStreaks.length}</p>
              </div>
              <Flame className="h-8 w-8 text-white/90 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-400 to-blue-500 dark:from-indigo-700/40 dark:to-blue-800/30 border-indigo-400 dark:border-indigo-600/40">
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-indigo-100">Vula Vault</p>
                <p className="text-2xl md:text-4xl font-bold text-white">{totalTransferred}</p>
              </div>
              <Vault className="h-8 w-8 text-white/90 shrink-0" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/90 hover:text-white hover:bg-white/20 p-0 h-auto text-xs md:text-xs flex items-center gap-1 mt-1 md:mt-2"
              onClick={() => { setTransferToAppId("vault"); setShowTransferDialog(true); }}
            >
              Transfer to Vault <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-primary flex w-full flex-nowrap overflow-x-auto justify-start">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-1.5 py-1 sm:text-xs sm:px-3 sm:py-1.5">
            Overview
          </TabsTrigger>
          {patientRecord?.is_chronic && (
            <TabsTrigger value="chronic-meds" className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-1.5 py-1 sm:text-xs sm:px-3 sm:py-1.5">
              <Pill className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Chronic Meds
            </TabsTrigger>
          )}
          <TabsTrigger value="wins-streaks" className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-1.5 py-1 sm:text-xs sm:px-3 sm:py-1.5">
            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Wins and Streaks
          </TabsTrigger>
          <TabsTrigger value="transfers" className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-1.5 py-1 sm:text-xs sm:px-3 sm:py-1.5">
             Redeem
           </TabsTrigger>
         </TabsList>

        {patientRecord?.is_chronic && patientRecord?.id && (
          <TabsContent value="chronic-meds" className="space-y-6">
            <MedicationAdherenceTab patientId={patientRecord.id} focusRxId={focusRxId} onFocusHandled={() => setFocusRxId(null)} />
          </TabsContent>
        )}

        <TabsContent value="overview" className="space-y-6">
          {patientRecord?.is_chronic && patientRecord?.id && (
            <TodaysMedicationsCard patientId={patientRecord.id} onTakeMedication={handleTakeMedication} />
          )}
          {nextMilestone && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  {t("patientRewards.progressTitle")}
                </CardTitle>
                <CardDescription>
                  {t("patientRewards.progressLabel", { current: lollipopCount, target: nextMilestone.count, milestone: nextMilestone.label })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={progressToNext} className="h-4" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("patientRewards.moreToGo", { count: nextMilestone.count - lollipopCount })}</span>
                    <span className="text-2xl">{nextMilestone.icon}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                {t("patientRewards.recentRewards")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <div className="text-center py-8">
                  <img src={vulaVouchersLogo} alt="Vulas" className="h-20 md:h-10 w-auto object-contain mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("patientRewards.empty")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rewards.slice(0, 5).map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={vulaVouchersLogo} alt="Vula" className="h-5 w-5 object-contain shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{reward.visit_category}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(reward.awarded_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">
                        +{reward.lollipops_count} <img src={vulaVouchersLogo} alt="Vula" className="h-3 w-auto object-contain inline-block ml-1" />
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vula History (replaces Assigned Tasks) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Vula History
              </CardTitle>
              <CardDescription>Earnings and transfers, grouped by week and month</CardDescription>
            </CardHeader>
            <CardContent>
              {historyGroups.every((g) => g.items.length === 0) ? (
                <p className="text-center text-muted-foreground text-sm py-6">No Vula activity yet.</p>
              ) : (
                <Accordion type="multiple" defaultValue={["this-week"]} className="w-full">
                  {historyGroups
                    .filter((g) => g.items.length > 0)
                    .map((group) => (
                      <AccordionItem key={group.key} value={group.key}>
                        <AccordionTrigger>
                          <div className="flex items-center justify-between w-full pr-2">
                            <span className="font-medium">{group.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {group.items.length} {group.items.length === 1 ? "entry" : "entries"}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {group.items.map((it) => (
                              <div
                                key={it.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {it.kind === "earn" ? (
                                    <img src={vulaVouchersLogo} alt="Vula" className="h-6 w-6 object-contain shrink-0" />
                                  ) : (
                                    <ArrowRightLeft className="h-5 w-5 text-blue-500 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{it.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(it.date, "MMM d, yyyy")}
                                    </p>
                                  </div>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className={
                                    it.amount >= 0
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                  }
                                >
                                  {it.amount >= 0 ? `+${it.amount}` : it.amount}{" "}
                                  <img
                                    src={vulaVouchersLogo}
                                    alt="Vula"
                                    className="h-3 w-auto object-contain inline-block ml-1"
                                  />
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wins-streaks" className="space-y-6">
          {/* Wins (Milestones) */}
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
                          <Star className="h-4 w-4 mr-1" /> Unlocked!
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Adherence Summary */}
          {patientRecord?.is_chronic && patientRecord?.id && (
            <MonthlyAdherenceSummary patientId={patientRecord.id} />
          )}

          {/* Streaks */}
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
          {(() => {
            const isUnlocked = lollipopCount >= VAULT_UNLOCK_THRESHOLD;
            const remaining = Math.max(0, VAULT_UNLOCK_THRESHOLD - lollipopCount);
            const progressPct = Math.min(100, (lollipopCount / VAULT_UNLOCK_THRESHOLD) * 100);
            return (
              <>
                {/* Vula Vault brand card */}
                <Card className="border-0 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/5 via-background to-teal-500/5 ring-1 ring-blue-500/30">
                  <CardHeader className="items-center text-center pb-2">
                    <img
                      src={vulaVaultLogo}
                      alt="Vula Vault"
                      className="h-28 md:h-36 w-auto object-contain mx-auto"
                    />
                    <CardDescription className="text-base text-foreground/80 max-w-md mx-auto pt-2">
                      Redeem your Vulas at participating retailers through your Vula Vault.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <img
                      src={vulaVaultMerchants}
                      alt="Use your Vulas at these merchants"
                      className="w-full max-w-3xl mx-auto h-auto object-contain"
                    />

                    <div className="flex justify-center">
                      <Button
                        disabled={!isUnlocked}
                        onClick={() => window.open("https://secure.6dot50.com/lite/default", "_blank", "noopener,noreferrer")}
                        className="gap-2 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white shadow-md"
                        size="lg"
                      >
                        <Vault className="h-4 w-4" />
                        {isUnlocked ? "Redeem at Vula Vault" : `Locked — ${VAULT_UNLOCK_THRESHOLD.toLocaleString()} Vulas required`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}

