import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Send, Loader2, Trophy, Target, Flame, Gift, Star, ArrowRightLeft, Calendar as CalendarIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, differenceInDays } from "date-fns";
import { useMyRewards, useMyStreaks } from "@/hooks/usePatientRewards";
import { VulaExplainerDialog } from "@/components/rewards/VulaExplainerDialog";
import vulaVouchersLogo from "@/assets/vula-vouchers-logo-v2.png";
import { cn } from "@/lib/utils";

const MILESTONES = [
  { count: 5, label: "First Steps", icon: "ðŸŒŸ", color: "text-yellow-500" },
  { count: 10, label: "Getting Healthy", icon: "ðŸ’ª", color: "text-blue-500" },
  { count: 25, label: "Health Champion", icon: "ðŸ†", color: "text-purple-500" },
  { count: 50, label: "Wellness Warrior", icon: "âš”ï¸", color: "text-orange-500" },
  { count: 100, label: "Health Legend", icon: "ðŸ‘‘", color: "text-pink-500" },
];

export default function DoctorRewards({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferFromAppId, setTransferFromAppId] = useState("");
  const [transferToAppId, setTransferToAppId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showVulaExplainer, setShowVulaExplainer] = useState(false);
  const queryClient = useQueryClient();

  // Auto-open the explainer the first time a user lands on the rewards page.
  useEffect(() => {
    try {
      if (!localStorage.getItem("vulas_explainer_seen_v1")) {
        setShowVulaExplainer(true);
        localStorage.setItem("vulas_explainer_seen_v1", "1");
      }
    } catch {}
  }, []);

  const { rewards, lollipopCount: patientLollipopCount, loading: rewardsLoading } = useMyRewards();
  const { streaks, loading: streaksLoading } = useMyStreaks();

  const { data: doctorVulas = 0 } = useQuery({
    queryKey: ["doctor-vulas-profile"],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase.from("doctor_rewards").select("vulas_count").eq("doctor_id", user.id);
      if (error || !data) return 0;
      return data.reduce((sum, r) => sum + (r.vulas_count || 0), 0);
    },
  });

  const { data: patientVulas = 0 } = useQuery({
    queryKey: ["patient-vulas-profile"],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data: patient } = await supabase.from("patients").select("id").eq("patient_user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!patient) return 0;
      const { data: rewardsData, error } = await supabase.from("patient_rewards").select("lollipops_count").eq("patient_id", patient.id);
      if (error || !rewardsData) return 0;
      return rewardsData.reduce((sum, r) => sum + (r.lollipops_count || 0), 0);
    },
  });

  const totalVulas = doctorVulas + patientVulas;

  const { data: partnerApps = [] } = useQuery({
    queryKey: ["vula-partner-apps-doctor"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vula_partner_apps").select("*").eq("is_active", true).order("name");
      if (error) return [];
      return data || [];
    },
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["vula-transfers-doctor"],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("vula_transfers").select("*, vula_partner_apps(name, logo_url)").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  const totalTransferred = transfers.reduce((sum: number, t: any) => sum + t.amount, 0);

  const handleTransfer = async () => {
    if (!user?.id) return;
    const amount = parseInt(transferAmount) || 0;
    if (amount <= 0 || amount > totalVulas) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    const { data: patient } = await supabase.from("patients").select("id").eq("patient_user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!patient) { toast({ title: "No patient record found", variant: "destructive" }); return; }
    const isVault = transferToAppId === "vault";
    if (!isVault) {
      const { error: transferError } = await supabase.from("vula_transfers").insert({ user_id: user.id, partner_app_id: transferToAppId, amount });
      if (transferError) { toast({ title: "Transfer failed", variant: "destructive" }); return; }
    }
    const { error: deductError } = await supabase.from("patient_rewards").insert({
      patient_id: patient.id, awarded_by: user.id, lollipops_count: -amount,
      visit_category: isVault ? "Vula Vault" : "Vula Transfer", reward_type: "transfer",
    });
    if (deductError) { toast({ title: "Deduction failed", variant: "destructive" }); return; }
    toast({ title: "Transfer successful", description: `${amount} Vulas transferred.` });
    queryClient.invalidateQueries({ queryKey: ["vula-transfers-doctor"] });
    queryClient.invalidateQueries({ queryKey: ["patient-vulas-profile"] });
    queryClient.invalidateQueries({ queryKey: ["doctor-vulas-profile"] });
    setShowTransferDialog(false);
    setTransferFromAppId("");
    setTransferToAppId("");
    setTransferAmount("");
  };

  const currentMilestone = MILESTONES.filter(m => totalVulas >= m.count).pop();
  const nextMilestone = MILESTONES.find(m => totalVulas < m.count);
  const progressToNext = nextMilestone ? Math.round((totalVulas / nextMilestone.count) * 100) : 100;
  const activeStreaks = streaks.filter(s => s.current_streak > 0);

  return (
    <div className={cn("space-y-6 animate-fade-in", !embedded && "max-w-3xl")}>
      <VulaExplainerDialog open={showVulaExplainer} onOpenChange={setShowVulaExplainer} />
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground">{t("doctorRewards.title")}</h1>
              <button
                onClick={() => setShowVulaExplainer(true)}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                title="Learn about Vulas"
              >
                <Info className="h-3.5 w-3.5" />
                What are Vulas?
              </button>
            </div>
            <p className="text-muted-foreground text-sm">Manage your Vulas balance, milestones, and streaks</p>
          </div>
          {partnerApps.length > 0 && (
            <Button onClick={() => setShowTransferDialog(true)} className="gap-2"><Send className="h-4 w-4" /> Transfer Vulas</Button>
          )}
        </div>
      )}

      {/* Balance Cards - 2x2 grid: Doctor/Patient top, Combined/Transferred bottom */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Doctor Vulas</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{doctorVulas}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                <img src={vulaVouchersLogo} alt="Vula Vouchers" className="h-8 w-8 object-contain" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Patient Vulas</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{patientVulas}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                <img src={vulaVouchersLogo} alt="Vula Vouchers" className="h-8 w-8 object-contain" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-300 to-lime-400 dark:from-yellow-600/40 dark:to-lime-700/30 border-yellow-400 dark:border-yellow-600/40">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Combined</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{totalVulas}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                <img src={vulaVouchersLogo} alt="Vulas" className="h-8 w-8 object-contain" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-sky-400 to-cyan-500 dark:from-sky-700/40 dark:to-cyan-800/30 border-sky-400 dark:border-sky-600/40">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-sky-100">Redeemed</p>
                <p className="text-2xl font-bold text-white">{totalTransferred}</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-white/90 shrink-0" />
            </div>
            <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/20 p-0 h-auto text-sm flex items-center gap-1 mt-2" onClick={() => setShowTransferDialog(true)}>
              Redeem Vulas <Send className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs â€” same as patient view */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-primary flex w-full flex-nowrap overflow-x-auto justify-start">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-sm px-1.5 py-1 sm:text-sm sm:px-3 sm:py-1.5">{t("doctorRewards.tabOverview")}</TabsTrigger>
          <TabsTrigger value="milestones" className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-sm px-1.5 py-1 sm:text-sm sm:px-3 sm:py-1.5">{t("doctorRewards.tabMilestones")}</TabsTrigger>
          <TabsTrigger value="streaks" className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-sm px-1.5 py-1 sm:text-sm sm:px-3 sm:py-1.5">{t("doctorRewards.tabStreaks")}</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-sm px-1.5 py-1 sm:text-sm sm:px-3 sm:py-1.5">{t("doctorRewards.tabHistory")}</TabsTrigger>
          <TabsTrigger value="transfers" className="data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-sm px-1.5 py-1 sm:text-sm sm:px-3 sm:py-1.5">{t("doctorRewards.tabRedeem")}</TabsTrigger>
         </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {nextMilestone && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Progress to Next Milestone</CardTitle>
                <CardDescription>{totalVulas} / {nextMilestone.count} Vulas to "{nextMilestone.label}"</CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={progressToNext} className="h-4" />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>{nextMilestone.count - totalVulas} more to go!</span>
                  <span className="text-2xl">{nextMilestone.icon}</span>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-emerald-500" />Recent Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <div className="text-center py-8">
                   <img src={vulaVouchersLogo} alt="Vula" className="h-8 w-8 object-contain mx-auto mb-4" />
                  <p className="text-muted-foreground">No rewards yet. Start your health journey!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rewards.slice(0, 5).map((reward) => (
                    <div key={reward.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <img src={vulaVouchersLogo} alt="Vula" className="h-5 w-5 object-contain" />
                        <div>
                          <p className="font-medium">{reward.visit_category}</p>
                          <p className="text-sm text-muted-foreground">{format(parseISO(reward.awarded_at), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">+{reward.lollipops_count} <img src={vulaVouchersLogo} alt="Vula" className="h-2.5 w-2.5 inline-block" /></Badge>
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
              <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" />Milestone Achievements</CardTitle>
              <CardDescription>Collect Vulas to unlock milestone badges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {MILESTONES.map((milestone) => {
                  const unlocked = totalVulas >= milestone.count;
                  return (
                    <div key={milestone.count} className={`p-4 rounded-xl border-2 transition-all ${unlocked ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30" : "border-muted bg-muted/20 opacity-60"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-4xl ${!unlocked && "grayscale"}`}>{milestone.icon}</span>
                        <div>
                          <p className={`font-bold ${milestone.color}`}>{milestone.label}</p>
                          <p className="text-sm text-muted-foreground">{milestone.count} Vulas</p>
                        </div>
                      </div>
                      {unlocked && <Badge className="mt-3 bg-yellow-500 text-white"><Star className="h-4 w-4 mr-1" /> Unlocked!</Badge>}
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
              <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-orange-500" />Health Streaks</CardTitle>
              <CardDescription>Maintain regular health checkups to earn bonus Vulas</CardDescription>
            </CardHeader>
            <CardContent>
              {streaks.length === 0 ? (
                <div className="text-center py-8">
                  <Flame className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No streak data yet.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {streaks.map((streak) => {
                    const daysUntilDue = streak.next_due_at ? differenceInDays(parseISO(streak.next_due_at), new Date()) : null;
                    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                    return (
                      <div key={streak.id} className={`p-4 rounded-xl border ${streak.current_streak > 0 ? "border-orange-300 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30" : "border-muted bg-muted/20"}`}>
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
                            <p className="text-sm text-muted-foreground">streak</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-muted flex items-center justify-between text-sm">
                          <div><span className="text-muted-foreground">Longest: </span><span className="font-medium">{streak.longest_streak}</span></div>
                          {daysUntilDue !== null && <Badge variant={isOverdue ? "destructive" : "secondary"}>{isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `Due in ${daysUntilDue} days`}</Badge>}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">Earns: {streak.lollipops_awarded} <img src={vulaVouchersLogo} alt="Vula" className="h-2.5 w-2.5 inline-block" /> per completion</div>
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
              <CardTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-primary" />Full Reward History</CardTitle>
              <CardDescription>Complete log of all Vulas earned</CardDescription>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <div className="text-center py-8"><img src={vulaVouchersLogo} alt="Vula" className="h-8 w-8 object-contain mx-auto mb-4" /><p className="text-muted-foreground">No rewards yet</p></div>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Visit Type</TableHead><TableHead className="text-right">Vulas</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {rewards.map((reward) => (
                      <TableRow key={reward.id}>
                        <TableCell><div>{format(parseISO(reward.awarded_at), "MMM d, yyyy")}</div><span className="text-sm text-muted-foreground">{format(parseISO(reward.awarded_at), "h:mm a")}</span></TableCell>
                        <TableCell><Badge variant="secondary" className="bg-primary/10 text-primary">{reward.visit_category}</Badge></TableCell>
                        <TableCell className="text-right"><span className={`font-semibold ${reward.lollipops_count < 0 ? "text-blue-600" : "text-emerald-600"}`}>{reward.lollipops_count > 0 ? "+" : ""}{reward.lollipops_count} <img src={vulaVouchersLogo} alt="Vula" className="h-4 w-4 inline-block" /></span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-6">
          {/* Vula Vault */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" />Vula Vault</CardTitle>
              <CardDescription>Sign in to your Vula Vault to redeem your Vulas at participating retailers.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => window.open("https://secure.6dot50.com/lite/default", "_blank", "noopener,noreferrer")}
                className="gap-2"
              >
                <Gift className="h-4 w-4" /> Redeem at Vula Vault
              </Button>
            </CardContent>
          </Card>

          {/* Partner Apps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" />Vula Partner Apps</CardTitle>
              <CardDescription>Apps and services that accept Vulas as currency</CardDescription>
            </CardHeader>
            <CardContent>
              {partnerApps.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">No partner apps available yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {partnerApps.map((app: any) => (
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
                          {app.creator && <p className="text-sm text-muted-foreground">by {app.creator}</p>}
                        </div>
                      </div>
                      <Button size="sm" className="w-full mt-3 gap-1 text-sm" onClick={() => { setTransferToAppId(app.id); setShowTransferDialog(true); }}>
                        <Send className="h-4 w-4" /> Transfer Vulas
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transfer to Vula Vault */}
          <Card className="border-indigo-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-indigo-600" />Transfer to Vula Vault</CardTitle>
              <CardDescription>Move your Vulas to the Vula Vault for safekeeping.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => { setTransferToAppId("vault"); setShowTransferDialog(true); }} className="gap-2">
                <ArrowRightLeft className="h-4 w-4" /> Transfer to Vault
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

       {/* Transfer Dialog */}
      {showTransferDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
         <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-lg space-y-4">
            <h3 className="text-sm font-semibold">Transfer Vulas</h3>
            <p className="text-sm text-muted-foreground">Available balance: {totalVulas} <img src={vulaVouchersLogo} alt="Vula" className="h-4 w-4 inline-block" /></p>
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={transferFromAppId} onValueChange={setTransferFromAppId}>
                <SelectTrigger><SelectValue placeholder="Select source app" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wallet">My Vula Vault</SelectItem>
                  {partnerApps.map((app: any) => <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Select value={transferToAppId} onValueChange={setTransferToAppId}>
                <SelectTrigger><SelectValue placeholder="Select destination app" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vault">Vula Vault</SelectItem>
                  {partnerApps.map((app: any) => <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min={1} max={totalVulas} placeholder="Enter amount" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
              <Button onClick={handleTransfer} disabled={!transferToAppId || !transferAmount || parseInt(transferAmount) <= 0 || parseInt(transferAmount) > totalVulas}>
                <Send className="h-4 w-4 mr-2" /> Transfer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

