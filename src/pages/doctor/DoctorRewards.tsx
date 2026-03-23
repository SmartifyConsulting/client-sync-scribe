import { useState } from "react";
import { Send, Loader2, Trophy, Target, Flame, Gift, Star, ArrowRightLeft, Calendar as CalendarIcon } from "lucide-react";
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
import moolaSymbol from "@/assets/moola-symbol.png";

const MILESTONES = [
  { count: 5, label: "First Steps", icon: "🌟", color: "text-yellow-500" },
  { count: 10, label: "Getting Healthy", icon: "💪", color: "text-blue-500" },
  { count: 25, label: "Health Champion", icon: "🏆", color: "text-purple-500" },
  { count: 50, label: "Wellness Warrior", icon: "⚔️", color: "text-orange-500" },
  { count: 100, label: "Health Legend", icon: "👑", color: "text-pink-500" },
];

export default function DoctorRewards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferAppId, setTransferAppId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();

  const { rewards, lollipopCount: patientLollipopCount, loading: rewardsLoading } = useMyRewards();
  const { streaks, loading: streaksLoading } = useMyStreaks();

  const { data: doctorMoolas = 0 } = useQuery({
    queryKey: ["doctor-moolas-profile"],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase.from("doctor_rewards").select("moolas_count").eq("doctor_id", user.id);
      if (error || !data) return 0;
      return data.reduce((sum, r) => sum + (r.moolas_count || 0), 0);
    },
  });

  const { data: patientMoolas = 0 } = useQuery({
    queryKey: ["patient-moolas-profile"],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data: patient } = await supabase.from("patients").select("id").eq("patient_user_id", user.id).maybeSingle();
      if (!patient) return 0;
      const { data: rewardsData, error } = await supabase.from("patient_rewards").select("lollipops_count").eq("patient_id", patient.id);
      if (error || !rewardsData) return 0;
      return rewardsData.reduce((sum, r) => sum + (r.lollipops_count || 0), 0);
    },
  });

  const totalMoolas = doctorMoolas + patientMoolas;

  const { data: partnerApps = [] } = useQuery({
    queryKey: ["moola-partner-apps-doctor"],
    queryFn: async () => {
      const { data, error } = await supabase.from("moola_partner_apps").select("*").eq("is_active", true).order("name");
      if (error) return [];
      return data || [];
    },
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["moola-transfers-doctor"],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("moola_transfers").select("*, moola_partner_apps(name, logo_url)").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  const totalTransferred = transfers.reduce((sum: number, t: any) => sum + t.amount, 0);

  const handleTransfer = async () => {
    if (!user?.id) return;
    const amount = parseInt(transferAmount) || 0;
    if (amount <= 0 || amount > totalMoolas) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    const { data: patient } = await supabase.from("patients").select("id").eq("patient_user_id", user.id).maybeSingle();
    if (!patient) { toast({ title: "No patient record found", variant: "destructive" }); return; }
    const { error: transferError } = await supabase.from("moola_transfers").insert({ user_id: user.id, partner_app_id: transferAppId, amount });
    if (transferError) { toast({ title: "Transfer failed", variant: "destructive" }); return; }
    const { error: deductError } = await supabase.from("patient_rewards").insert({
      patient_id: patient.id, awarded_by: user.id, lollipops_count: -amount,
      visit_category: "Moola Transfer", reward_type: "transfer",
    });
    if (deductError) { toast({ title: "Deduction failed", variant: "destructive" }); return; }
    toast({ title: "Transfer successful", description: `${amount} Moolas transferred.` });
    queryClient.invalidateQueries({ queryKey: ["moola-transfers-doctor"] });
    queryClient.invalidateQueries({ queryKey: ["patient-moolas-profile"] });
    queryClient.invalidateQueries({ queryKey: ["doctor-moolas-profile"] });
    setShowTransferDialog(false);
    setTransferAppId("");
    setTransferAmount("");
  };

  const currentMilestone = MILESTONES.filter(m => totalMoolas >= m.count).pop();
  const nextMilestone = MILESTONES.find(m => totalMoolas < m.count);
  const progressToNext = nextMilestone ? Math.round((totalMoolas / nextMilestone.count) * 100) : 100;
  const activeStreaks = streaks.filter(s => s.current_streak > 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Rewards</h1>
          <p className="text-muted-foreground text-[12px]">Manage your Moolas balance, milestones, and streaks</p>
        </div>
        {partnerApps.length > 0 && (
          <Button onClick={() => setShowTransferDialog(true)} className="gap-2"><Send className="h-4 w-4" /> Transfer Moolas</Button>
        )}
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="bg-gradient-to-br from-yellow-300 to-lime-400 dark:from-yellow-600/40 dark:to-lime-700/30 border-yellow-400 dark:border-yellow-600/40">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Combined</p>
                <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{totalMoolas}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                <img src={moolaSymbol} alt="Moolas" className="h-9 w-9 object-contain" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Doctor Moolas</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{doctorMoolas} <span className="text-base">Ⓜ</span></p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Patient Moolas</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{patientMoolas} <span className="text-base">Ⓜ</span></p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-sky-400 to-cyan-500 dark:from-sky-700/40 dark:to-cyan-800/30 border-sky-400 dark:border-sky-600/40">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-sky-100">Transferred</p>
                <p className="text-3xl font-bold text-white">{totalTransferred}</p>
              </div>
              <ArrowRightLeft className="h-10 w-10 text-white/90" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs — same as patient view */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-primary">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">Overview</TabsTrigger>
          <TabsTrigger value="milestones" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">Milestones</TabsTrigger>
          <TabsTrigger value="streaks" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">Streaks</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">History</TabsTrigger>
          <TabsTrigger value="transfers" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">Transfers</TabsTrigger>
          <TabsTrigger value="moola-apps" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">Moola Apps</TabsTrigger>
         </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {nextMilestone && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Progress to Next Milestone</CardTitle>
                <CardDescription>{totalMoolas} / {nextMilestone.count} Moolas to "{nextMilestone.label}"</CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={progressToNext} className="h-4" />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>{nextMilestone.count - totalMoolas} more to go!</span>
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
                          <p className="text-sm text-muted-foreground">{format(parseISO(reward.awarded_at), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">+{reward.lollipops_count} Ⓜ</Badge>
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
              <CardDescription>Collect Moolas to unlock milestone badges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {MILESTONES.map((milestone) => {
                  const unlocked = totalMoolas >= milestone.count;
                  return (
                    <div key={milestone.count} className={`p-4 rounded-xl border-2 transition-all ${unlocked ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30" : "border-muted bg-muted/20 opacity-60"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-4xl ${!unlocked && "grayscale"}`}>{milestone.icon}</span>
                        <div>
                          <p className={`font-bold ${milestone.color}`}>{milestone.label}</p>
                          <p className="text-sm text-muted-foreground">{milestone.count} Moolas</p>
                        </div>
                      </div>
                      {unlocked && <Badge className="mt-3 bg-yellow-500 text-white"><Star className="h-3 w-3 mr-1" /> Unlocked!</Badge>}
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
              <CardDescription>Maintain regular health checkups to earn bonus Moolas</CardDescription>
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
                            <p className="text-xs text-muted-foreground">streak</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-muted flex items-center justify-between text-sm">
                          <div><span className="text-muted-foreground">Longest: </span><span className="font-medium">{streak.longest_streak}</span></div>
                          {daysUntilDue !== null && <Badge variant={isOverdue ? "destructive" : "secondary"}>{isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `Due in ${daysUntilDue} days`}</Badge>}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">Earns: {streak.lollipops_awarded} Ⓜ per completion</div>
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
              <CardDescription>Complete log of all Moolas earned</CardDescription>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <div className="text-center py-8"><span className="text-5xl mb-4 block font-bold text-emerald-600">Ⓜ</span><p className="text-muted-foreground">No rewards yet</p></div>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Visit Type</TableHead><TableHead className="text-right">Moolas</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {rewards.map((reward) => (
                      <TableRow key={reward.id}>
                        <TableCell><div>{format(parseISO(reward.awarded_at), "MMM d, yyyy")}</div><span className="text-xs text-muted-foreground">{format(parseISO(reward.awarded_at), "h:mm a")}</span></TableCell>
                        <TableCell><Badge variant="secondary" className="bg-primary/10 text-primary">{reward.visit_category}</Badge></TableCell>
                        <TableCell className="text-right"><span className={`font-semibold ${reward.lollipops_count < 0 ? "text-blue-600" : "text-emerald-600"}`}>{reward.lollipops_count > 0 ? "+" : ""}{reward.lollipops_count} Ⓜ</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-blue-500" />Transfer History</CardTitle>
              <CardDescription>Record of all Moola transfers to partner apps</CardDescription>
            </CardHeader>
            <CardContent>
              {transfers.length === 0 ? (
                <div className="text-center py-8"><ArrowRightLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No transfers yet</p></div>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Partner App</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {transfers.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell>{format(new Date(t.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell><Badge variant="secondary">{t.moola_partner_apps?.name || "Partner App"}</Badge></TableCell>
                        <TableCell className="text-right"><span className="text-blue-600 font-semibold">-{t.amount} Ⓜ</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moola-apps" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" />Moola Apps</CardTitle>
              <CardDescription>Apps and services that accept Moolas as currency</CardDescription>
            </CardHeader>
            <CardContent>
              {partnerApps.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No partner apps available yet. Check back soon!</p>
                </div>
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
                          {app.creator && (
                            <p className="text-xs text-muted-foreground">by {app.creator}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-0 text-[10px]">Active</Badge>
                            {app.signup_url && (
                              <a href={app.signup_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline hover:text-primary/80">
                                Sign up
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

       {/* Transfer Dialog */}
      {showTransferDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-lg space-y-4">
            <h3 className="text-lg font-semibold">Transfer Moolas</h3>
            <p className="text-sm text-muted-foreground">Available balance: {totalMoolas} Ⓜ</p>
            <div className="space-y-2">
              <Label>Partner App</Label>
              <Select value={transferAppId} onValueChange={setTransferAppId}>
                <SelectTrigger><SelectValue placeholder="Select an app" /></SelectTrigger>
                <SelectContent>{partnerApps.map((app: any) => <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min={1} max={totalMoolas} placeholder="Enter amount" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
              <Button onClick={handleTransfer} disabled={!transferAppId || !transferAmount || parseInt(transferAmount) <= 0 || parseInt(transferAmount) > totalMoolas}>
                <Send className="h-4 w-4 mr-2" /> Transfer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
