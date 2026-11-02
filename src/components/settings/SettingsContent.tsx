import { useState, useEffect, useRef } from "react";
import {
  Calendar, Shield, Database, CheckCircle, Loader2, ShieldCheck, ShieldOff,
  CreditCard, Receipt, Download, Check, ExternalLink, XCircle, RotateCcw, Users,
  Settings2, Camera, UserRound, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";
import { PhoneNumberInput } from "@/components/forms/PhoneNumberInput";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PlanConfig { price: number; name: string; period: string; savings?: number; }
interface PricingPlans { monthly: PlanConfig; annual: PlanConfig; }
interface Subscription { id: string; user_id: string; plan_type: string; billing_cycle: string; status: string; paypal_subscription_id: string | null; current_period_start: string | null; current_period_end: string | null; created_at: string; }
interface PaymentHistoryItem { id: string; user_id: string; subscription_id: string | null; paypal_transaction_id: string | null; amount: number; currency: string; description: string; status: string; created_at: string; }

// MVP: temporarily disable MFA UI (TOTP enroll, disable, and login-code toggle).
// Flip to false to restore.
const MVP_MFA_DISABLED = true;

export function SettingsContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { role, isAdmin } = useUserRole();
  const { profile, loading, fetchProfile, updateProfile } = useProfile();
  const [searchParams] = useSearchParams();
  const { isConnected: googleRealConnected, isConnecting: googleRealConnecting, connect: googleConnect, disconnect: googleDisconnect } = useGoogleCalendar();

  const isAdvisor = role === "broker";
  const isPatientRole = role === "client";

  const [outlookConnected, setOutlookConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [loadingMfa, setLoadingMfa] = useState(true);
  const [disablingMfa, setDisablingMfa] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [savingMfaRequired, setSavingMfaRequired] = useState(false);
  const [showManagePlan, setShowManagePlan] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [reactivatingSubscription, setReactivatingSubscription] = useState(false);
  const [plans, setPlans] = useState<PricingPlans>({ monthly: { price: 0, name: "Loading...", period: "month" }, annual: { price: 0, name: "Loading...", period: "year", savings: 0 } });
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [inactiveThreshold, setInactiveThreshold] = useState<number>(12);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [detailsFirstName, setDetailsFirstName] = useState("");
  const [detailsLastName, setDetailsLastName] = useState("");
  const detailsName = [detailsFirstName.trim(), detailsLastName.trim()].filter(Boolean).join(" ");
  const [detailsPhone, setDetailsPhone] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) { fetchMfaFactors(); fetchSubscription(); fetchPaymentHistory(); if (isAdvisor) fetchInactiveThreshold(); }
  }, [user, isAdvisor]);

  useEffect(() => {
    const metadata = user?.user_metadata ?? {};
    const fullName = (profile?.full_name?.trim() || metadata.full_name || metadata.name || "").trim();
    const parts = fullName.split(/\s+/);
    const useSignupParts = !profile?.full_name?.trim() || metadata.full_name?.trim() === fullName;
    setDetailsFirstName((useSignupParts ? metadata.first_name : undefined) ?? (parts.length > 1 ? parts.slice(0, -1).join(" ") : fullName));
    setDetailsLastName((useSignupParts ? metadata.last_name : undefined) ?? (parts.length > 1 ? parts.at(-1) : ""));
    setDetailsPhone(profile?.mobile_number || "");
  }, [profile?.full_name, profile?.mobile_number, user?.id, user?.user_metadata?.first_name, user?.user_metadata?.last_name, user?.user_metadata?.full_name, user?.user_metadata?.name]);

  useEffect(() => { fetchPricing(); }, [role]);

  useEffect(() => {
    const paymentResult = searchParams.get("payment");
    if (paymentResult === "success") { toast({ title: "Payment Successful", description: "Your subscription has been activated!" }); fetchSubscription(); fetchPaymentHistory(); }
    else if (paymentResult === "failed") { toast({ title: "Payment Failed", description: "There was an issue processing your payment.", variant: "destructive" }); }
    else if (paymentResult === "cancelled") { toast({ title: "Payment Cancelled", description: "Your payment was cancelled." }); }
  }, [searchParams]);

  const planType: "advisor" | "client" = role === "client" ? "client" : "advisor";

  const fetchPricing = async () => {
    setLoadingPricing(true);
    try {
      const { data, error } = await supabase.from("pricing_config").select("*").eq("role", planType);
      if (!error && data && data.length > 0) {
        const monthlyPlan = data.find((p) => p.billing_cycle === "monthly");
        const annualPlan = data.find((p) => p.billing_cycle === "annual");
        setPlans({ monthly: { price: monthlyPlan?.price || 0, name: monthlyPlan?.name || "Monthly", period: "month" }, annual: { price: annualPlan?.price || 0, name: annualPlan?.name || "Annual", period: "year", savings: annualPlan?.savings || 0 } });
      }
    } catch (error) { console.error("Error fetching pricing:", error); } finally { setLoadingPricing(false); }
  };

  const fetchSubscription = async () => {
    if (!user) return;
    setLoadingSubscription(true);
    try {
      const { data, error } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
      if (!error && data) { setSubscription(data as Subscription); setSelectedBillingCycle(data.billing_cycle as "monthly" | "annual"); }
    } catch (error) { console.error("Error fetching subscription:", error); } finally { setLoadingSubscription(false); }
  };

  const fetchPaymentHistory = async () => {
    if (!user) return;
    setLoadingPaymentHistory(true);
    try {
      const { data, error } = await supabase.from("payment_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (!error && data) setPaymentHistory(data as PaymentHistoryItem[]);
    } catch (error) { console.error("Error fetching payment history:", error); } finally { setLoadingPaymentHistory(false); }
  };

  const fetchMfaFactors = async () => {
    setLoadingMfa(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data) setMfaFactors(data.totp.filter((f) => f.status === "verified"));
      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("mfa_required")
          .eq("id", user.id)
          .maybeSingle();
        setMfaRequired(Boolean((prof as any)?.mfa_required));
      }
    } catch (error) { console.error("Error fetching MFA factors:", error); } finally { setLoadingMfa(false); }
  };

  const handleToggleMfaRequired = async (next: boolean) => {
    if (!user) return;
    if (next && mfaFactors.length === 0) {
      toast({
        title: "Set up Two-Factor Authentication first",
        description: "Enable 2FA below, then turn this on.",
      });
      setShow2FASetup(true);
      return;
    }
    setSavingMfaRequired(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ mfa_required: next } as any)
        .eq("id", user.id);
      if (error) throw error;
      setMfaRequired(next);
      toast({
        title: next ? "Login code required" : "Login code disabled",
        description: next
          ? "You'll be asked for a 6-digit code each time you sign in."
          : "You'll only enter your password at sign-in.",
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingMfaRequired(false);
    }
  };


  const fetchInactiveThreshold = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("profiles").select("inactive_threshold_months").eq("id", user.id).single();
      if (!error && data?.inactive_threshold_months) setInactiveThreshold(data.inactive_threshold_months);
    } catch (error) { console.error("Error fetching inactive threshold:", error); }
  };

  const saveInactiveThreshold = async (months: number) => {
    if (!user) return;
    setSavingThreshold(true);
    try {
      const { error } = await supabase.from("profiles").update({ inactive_threshold_months: months }).eq("id", user.id);
      if (error) throw error;
      setInactiveThreshold(months);
      toast({ title: "Setting saved", description: `Patients will be marked inactive after ${months} months without a visit.` });
    } catch { toast({ title: "Error", description: "Failed to save setting", variant: "destructive" }); } finally { setSavingThreshold(false); }
  };

  const getInitials = () => {
    const n = (detailsName || profile?.full_name || "").trim();
    if (!n) return "U";
    return n.split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Unsupported file", description: "Please choose an image file (JPG, PNG or WebP).", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please choose a JPG or PNG under 5 MB.", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const fileExt = (file.name.split(".").pop() || "jpg").toLowerCase();
      const fileName = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const newUrl = `${data.publicUrl}?t=${Date.now()}`;
      const { error } = await updateProfile({ avatar_url: newUrl } as any);
      if (error) throw error;
      toast({ title: "Photo updated" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveMyDetails = async () => {
    if (!detailsFirstName.trim() || !detailsLastName.trim()) { toast({ title: "First name and last name required", variant: "destructive" }); return; }
    setSavingDetails(true);
    const { error: nameError } = await supabase.auth.updateUser({ data: { first_name: detailsFirstName.trim(), last_name: detailsLastName.trim(), full_name: detailsName } });
    if (nameError) { setSavingDetails(false); toast({ title: "Error", description: nameError.message, variant: "destructive" }); return; }
    const { error } = await updateProfile({ full_name: detailsName.trim(), mobile_number: detailsPhone || null } as any);
    setSavingDetails(false);
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Details saved" });
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke("self-delete-account", {});
      if (error || data?.error) throw new Error(data?.error || error?.message || "Please try again.");
      await supabase.auth.signOut();
      window.location.href = "/auth";
    } catch (e: any) {
      toast({ title: "Couldn't delete account", description: e.message, variant: "destructive" });
      setDeletingAccount(false);
    }
  };

  const disableMfa = async (factorId: string) => {
    setDisablingMfa(true);
    try { const { error } = await supabase.auth.mfa.unenroll({ factorId }); if (error) throw error; toast({ title: "2FA Disabled" }); fetchMfaFactors(); }
    catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); } finally { setDisablingMfa(false); }
  };

  const handleConnect = async (provider: "google" | "outlook") => {
    if (provider === "google") { await googleConnect(); return; }
    setIsConnecting(provider);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setOutlookConnected(true);
    toast({ title: "Outlook Calendar Connected" });
    setIsConnecting(null);
  };

  const handleDisconnect = async (provider: "google" | "outlook") => {
    if (provider === "google") { await googleDisconnect(); return; }
    setOutlookConnected(false);
    toast({ title: "Calendar Disconnected" });
  };

  const handleSubscribe = async () => {
    if (!user) { toast({ title: "Error", description: "You must be logged in to subscribe", variant: "destructive" }); return; }
    setProcessingPayment(true);
    try {
      const response = await supabase.functions.invoke("paypal-subscription", { body: { planType, billingCycle: selectedBillingCycle, userId: user.id } });
      if (response.error) throw new Error(response.error.message);
      const { approvalUrl } = response.data;
      if (approvalUrl) window.location.href = approvalUrl;
      else throw new Error("No approval URL received");
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); setProcessingPayment(false); }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    setCancellingSubscription(true);
    try {
      const response = await supabase.functions.invoke("paypal-subscription", { body: { action: "cancel", userId: user.id } });
      if (response.error) throw new Error(response.error.message);
      toast({ title: "Subscription Cancelled", description: "You will retain access until the end of your fees period." });
      setShowCancelDialog(false); fetchSubscription();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); } finally { setCancellingSubscription(false); }
  };

  const handleReactivateSubscription = async () => {
    if (!user || !subscription) return;
    setReactivatingSubscription(true);
    try {
      const response = await supabase.functions.invoke("paypal-subscription", { body: { action: "reactivate", planType: subscription.plan_type || planType, billingCycle: subscription.billing_cycle || selectedBillingCycle, userId: user.id } });
      if (response.error) throw new Error(response.error.message);
      const { approvalUrl } = response.data;
      if (approvalUrl) window.location.href = approvalUrl;
      else throw new Error("No approval URL received");
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); setReactivatingSubscription(false); }
  };

  const handleDownloadReceipt = (payment: PaymentHistoryItem) => {
    const receiptContent = `PAYMENT RECEIPT\n================\n\nTransaction ID: ${payment.paypal_transaction_id || "N/A"}\nDate: ${format(new Date(payment.created_at), "MMMM d, yyyy 'at' h:mm a")}\nDescription: ${payment.description}\nAmount: $${payment.amount.toFixed(2)} ${payment.currency}\nStatus: ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}\n\nThank you for your payment!\nHolarc`;
    const blob = new Blob([receiptContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${format(new Date(payment.created_at), "yyyy-MM-dd")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Receipt Downloaded" });
  };

  const getSubscriptionStatus = () => {
    if (!subscription) return "No active subscription";
    if (subscription.status === "active") { const endDate = subscription.current_period_end ? format(new Date(subscription.current_period_end), "MMM d, yyyy") : "N/A"; return `Active until ${endDate}`; }
    if (subscription.status === "cancelled") { const endDate = subscription.current_period_end ? format(new Date(subscription.current_period_end), "MMM d, yyyy") : "N/A"; return `Cancelled - Access until ${endDate}`; }
    return subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1);
  };

  const getCurrentPlanName = () => {
    if (!subscription || (subscription.status !== "active" && subscription.status !== "cancelled")) return "Free";
    const cycle = subscription.billing_cycle as "monthly" | "annual";
    return plans[cycle]?.name || "Unknown";
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Tabs key={isPatientRole ? "client" : "staff"} defaultValue="profile" className="w-full">
        <TabsList className="flex w-full flex-wrap bg-primary/80 justify-start rounded-lg">
          <TabsTrigger value="profile" className="tab-brand text-xs">Profile</TabsTrigger>
          <TabsTrigger value="preferences" className="tab-brand text-xs">Preferences</TabsTrigger>
          {!isPatientRole && <TabsTrigger value="billing" className="tab-brand text-xs">Subscription</TabsTrigger>}
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <div className="frame p-4 space-y-4">
            <div className="frame-header -mx-4 -mt-4 mb-4 gap-3">
              <UserRound className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">My details</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage key={profile?.avatar_url} src={profile?.avatar_url || undefined} alt={detailsName || "User"} />
                  <AvatarFallback className="bg-muted text-foreground text-base">{getInitials()}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90"
                  aria-label="Change profile photo"
                >
                  {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <p className="text-sm text-muted-foreground">JPG or PNG, up to 5 MB.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-first-name">First name</Label>
                <Input id="settings-first-name" value={detailsFirstName} onChange={(e) => setDetailsFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-last-name">Last name</Label>
                <Input id="settings-last-name" value={detailsLastName} onChange={(e) => setDetailsLastName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Mobile number</Label>
                <PhoneNumberInput value={detailsPhone} onChange={setDetailsPhone} />
              </div>
            </div>
            <Button size="sm" onClick={saveMyDetails} disabled={savingDetails}>
              {savingDetails ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save details"}
            </Button>
          </div>

          <div className="frame p-4">
            <div className="frame-header -mx-4 -mt-4 mb-4 gap-3">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Security</h2>
            </div>
            <p className="text-sm text-muted-foreground">Manage your authentication and account protection</p>
            <div className="space-y-4">
              {!MVP_MFA_DISABLED && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {loadingMfa ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : mfaFactors.length > 0 ? <ShieldCheck className="h-5 w-5 text-success" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
                      <div>
                        <p className="font-medium text-foreground">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">{loadingMfa ? "Checking status..." : mfaFactors.length > 0 ? "Enabled - Your account is protected" : "Add an extra layer of security"}</p>
                      </div>
                    </div>
                    {loadingMfa ? null : mfaFactors.length > 0 ? (
                      <Button
                        variant="outline"
                        disabled={disablingMfa}
                        onClick={() => disableMfa(mfaFactors[0].id)}
                      >
                        {disablingMfa ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable"}
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => setShow2FASetup(true)}>Enable</Button>
                    )}
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Ask for a login code every time I sign in</p>
                      <p className="text-sm text-muted-foreground">
                        When off, you'll only enter your password. When on, you'll also enter a 6-digit code from your authenticator app at every sign-in.
                      </p>
                    </div>
                    <Switch
                      checked={mfaRequired}
                      disabled={savingMfaRequired || loadingMfa}
                      onCheckedChange={handleToggleMfaRequired}
                    />
                  </div>
                  <Separator />
                </>
              )}
              <div><Button variant="outline" onClick={() => (window.location.href = "/forgot-password")}>Change Password</Button></div>
              <Separator />
            </div>
          </div>

          <div className="frame p-4">
            <div className="frame-header -mx-4 -mt-4 mb-4 gap-3">
              <Database className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Data Management</h2>
            </div>
            <div className="space-y-4">
              <Button variant="outline">Export All Data</Button>
              <p className="text-sm text-muted-foreground">Download all your client data, documents, and consultation records</p>
            </div>
          </div>

          <div className="rounded-xl border border-destructive bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <Trash2 className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-semibold text-destructive">Delete account</h2>
            </div>
            <p className="text-sm text-muted-foreground">Permanently deletes your account and profile. This cannot be undone.</p>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteDialog(true)}>Delete my account</Button>
          </div>
        </TabsContent>

        {/* PREFERENCES */}
        <TabsContent value="preferences" className="mt-4">
          <div className="space-y-4">
            <div className="frame p-4 space-y-4">
              <div className="frame-header -mx-4 -mt-4 mb-4 gap-3">
                <Settings2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Preferences</h2>
              </div>
              <p className="text-muted-foreground text-sm">Manage your application preferences and integrations</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Screen tips</p>
                  <p className="text-sm text-muted-foreground">Show the first-visit orientation tip on every screen again.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const { resetAllScreenTips } = await import("@/hooks/useScreenTip");
                    const { error } = await resetAllScreenTips();
                    toast({ title: error ? "Failed" : "Tips reset", description: error ?? "You'll see them again on each screen." });
                  }}
                >
                  Reset tips
                </Button>
              </div>


            </div>

            {isAdvisor && (
              <div className="frame p-4 space-y-4">
                <div className="frame-header -mx-4 -mt-4 mb-4 gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Client Management</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">Client Inactivity Threshold</p>
                    <p className="text-sm text-muted-foreground">Automatically mark clients as inactive after this period without a visit</p>
                  </div>
                  <Select value={inactiveThreshold.toString()} onValueChange={(value) => saveInactiveThreshold(parseInt(value))} disabled={savingThreshold}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select period" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="9">9 months</SelectItem>
                      <SelectItem value="12">12 months (default)</SelectItem>
                      <SelectItem value="18">18 months</SelectItem>
                      <SelectItem value="24">24 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="frame p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Calendar Integration</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {googleRealConnected && <CheckCircle className="h-4 w-4 text-success" />}
                    <div>
                      <p className="font-medium text-foreground text-sm">Google Calendar</p>
                      <p className="text-sm text-muted-foreground">{googleRealConnected ? "Connected - Appointments syncing" : "Sync appointments with Google Calendar"}</p>
                    </div>
                  </div>
                  {googleRealConnected ? (
                    <Button variant="outline" size="sm" onClick={() => handleDisconnect("google")} className="text-destructive hover:text-destructive">Disconnect</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleConnect("google")} disabled={googleRealConnecting}>{googleRealConnecting ? "Connecting..." : "Connect"}</Button>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {outlookConnected && <CheckCircle className="h-4 w-4 text-success" />}
                    <div>
                      <p className="font-medium text-foreground text-sm">Outlook Calendar</p>
                      <p className="text-sm text-muted-foreground">{outlookConnected ? "Connected - Appointments syncing" : "Sync appointments with Outlook"}</p>
                    </div>
                  </div>
                  {outlookConnected ? (
                    <Button variant="outline" size="sm" onClick={() => handleDisconnect("outlook")} className="text-destructive hover:text-destructive">Disconnect</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleConnect("outlook")} disabled={isConnecting === "outlook"}>{isConnecting === "outlook" ? "Connecting..." : "Connect"}</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* BILLING */}
        <TabsContent value="billing" className="mt-4 space-y-4">
          <div className="frame p-4">
            <div className="frame-header -mx-4 -mt-4 mb-4 gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Subscription</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-foreground">Current Plan</p><p className="text-sm text-muted-foreground">{loadingSubscription ? "Loading..." : getCurrentPlanName()}</p></div>
                {subscription?.status === "active" ? <Badge variant="default" className="bg-primary">Active</Badge> : subscription?.status === "cancelled" ? <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Cancelled</Badge> : <Badge variant="secondary">Inactive</Badge>}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-foreground">Subscription Status</p><p className="text-sm text-muted-foreground">{loadingSubscription ? "Loading..." : getSubscriptionStatus()}</p></div>
                <div className="flex gap-2">
                  {subscription?.status === "active" && <Button variant="outline" onClick={() => setShowCancelDialog(true)} className="text-destructive hover:text-destructive">Cancel</Button>}
                  {subscription?.status === "cancelled" && (
                    <Button variant="outline" onClick={handleReactivateSubscription} disabled={reactivatingSubscription} className="text-primary hover:text-primary">
                      {reactivatingSubscription ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reactivating...</> : <><RotateCcw className="h-4 w-4 mr-2" />Reactivate</>}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setShowManagePlan(true)}>{subscription?.status === "active" ? "Change Plan" : subscription?.status === "cancelled" ? "Change Plan" : "Subscribe"}</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="frame p-4">
            <div className="frame-header -mx-4 -mt-4 mb-4 gap-3">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Payment History</h2>
            </div>
            {loadingPaymentHistory ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : paymentHistory.length === 0 ? (
              <p className="empty-state">No payment history yet</p>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table className="data-table">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{format(new Date(payment.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell>${payment.amount.toFixed(2)}</TableCell>
                        <TableCell><Badge variant={payment.status === "completed" ? "default" : "destructive"} className="capitalize">{payment.status}</Badge></TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleDownloadReceipt(payment)}><Download className="h-4 w-4 mr-1" />Download</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <TwoFactorSetup open={show2FASetup} onOpenChange={setShow2FASetup} onSuccess={fetchMfaFactors} />

      <Dialog open={showManagePlan} onOpenChange={setShowManagePlan}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose Your Plan</DialogTitle>
            <DialogDescription>Select a billing cycle for your {planType} subscription. Payment is processed securely via PayPal.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedBillingCycle} onValueChange={(v) => setSelectedBillingCycle(v as "monthly" | "annual")} className="space-y-4 mt-4">
            <div className={`relative flex items-start rounded-xl border p-4 cursor-pointer transition-colors ${selectedBillingCycle === "monthly" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`} onClick={() => setSelectedBillingCycle("monthly")}>
              <RadioGroupItem value="monthly" id="monthly" className="mt-1" />
              <div className="ml-3 flex-1">
                <Label htmlFor="monthly" className="font-semibold text-foreground cursor-pointer">Monthly <span className="ml-2 text-primary">${plans.monthly.price}/{plans.monthly.period}</span></Label>
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Full access to all features</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Cancel anytime</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Priority support</li>
                </ul>
              </div>
            </div>
            <div className={`relative flex items-start rounded-xl border p-4 cursor-pointer transition-colors ${selectedBillingCycle === "annual" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`} onClick={() => setSelectedBillingCycle("annual")}>
              <RadioGroupItem value="annual" id="annual" className="mt-1" />
              <div className="ml-3 flex-1">
                <Label htmlFor="annual" className="font-semibold text-foreground cursor-pointer">Annual <span className="ml-2 text-primary">${plans.annual.price}/{plans.annual.period}</span> <Badge variant="secondary" className="ml-2 bg-sky-50 text-primary">Save ${plans.annual.savings}</Badge></Label>
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Full access to all features</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />2 months free</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Priority support</li>
                </ul>
              </div>
            </div>
          </RadioGroup>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowManagePlan(false)}>Cancel</Button>
            <Button onClick={handleSubscribe} disabled={processingPayment}>
              {processingPayment ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><ExternalLink className="h-4 w-4 mr-2" />Pay with PayPal</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You will retain access until the end of your current billing period
              {subscription?.current_period_end && <span className="font-medium"> ({format(new Date(subscription.current_period_end), "MMMM d, yyyy")})</span>}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSubscription} disabled={cancellingSubscription} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cancellingSubscription ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cancelling...</> : <><XCircle className="h-4 w-4 mr-2" />Cancel Subscription</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={(v) => { setShowDeleteDialog(v); if (!v) setDeleteConfirm(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account, profile and sign-in — it cannot be undone. Type DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== "DELETE" || deletingAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAccount ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : <><Trash2 className="h-4 w-4 mr-2" />Delete my account</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
