import { useState, useEffect } from "react";
import {
  Calendar,
  Bell,
  Shield,
  Database,
  CheckCircle,
  Loader2,
  ShieldCheck,
  ShieldOff,
  CreditCard,
  Receipt,
  Download,
  Check,
  ExternalLink,
  XCircle,
  RotateCcw,
  Users,
  User,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useSearchParams } from "react-router-dom";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Plan pricing will be loaded from database
interface PlanConfig {
  price: number;
  name: string;
  period: string;
  savings?: number;
}

interface PricingPlans {
  monthly: PlanConfig;
  annual: PlanConfig;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  billing_cycle: string;
  status: string;
  paypal_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
}

interface PaymentHistoryItem {
  id: string;
  user_id: string;
  subscription_id: string | null;
  paypal_transaction_id: string | null;
  amount: number;
  currency: string;
  description: string;
  status: string;
  created_at: string;
}

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { role, isPatient } = useUserRole();
  const { profile, updateProfile } = useProfile();
  const [searchParams] = useSearchParams();
  const { isConnected: googleRealConnected, isConnecting: googleRealConnecting, connect: googleConnect, disconnect: googleDisconnect } = useGoogleCalendar();

  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [loadingMfa, setLoadingMfa] = useState(true);
  const [disablingMfa, setDisablingMfa] = useState(false);

  // Billing state
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
  const [plans, setPlans] = useState<PricingPlans>({
    monthly: { price: 0, name: "Loading...", period: "month" },
    annual: { price: 0, name: "Loading...", period: "year", savings: 0 },
  });
  const [loadingPricing, setLoadingPricing] = useState(true);

  // Patient management state (doctors only)
  const [inactiveThreshold, setInactiveThreshold] = useState<number>(12);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Personal info state
  const [personalFirstName, setPersonalFirstName] = useState("");
  const [personalLastName, setPersonalLastName] = useState("");
  const [personalMobile, setPersonalMobile] = useState("");
  const [personalCountryCode, setPersonalCountryCode] = useState("+27");
  const [savingPersonal, setSavingPersonal] = useState(false);

  const COUNTRY_CODES = [
    { code: "+27", country: "South Africa", flag: "🇿🇦" },
    { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
    { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
    { code: "+49", country: "Germany", flag: "🇩🇪" },
    { code: "+33", country: "France", flag: "🇫🇷" },
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+971", country: "UAE", flag: "🇦🇪" },
  ];

  // Load personal info from profile
  useEffect(() => {
    if (profile) {
      const fullName = profile.full_name || "";
      const spaceIdx = fullName.indexOf(" ");
      setPersonalFirstName(spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName);
      setPersonalLastName(spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : "");
      let mobile = (profile as any).mobile_number || "";
      const matchedCode = COUNTRY_CODES.find(c => mobile.startsWith(c.code));
      if (matchedCode) {
        setPersonalCountryCode(matchedCode.code);
        mobile = mobile.replace(matchedCode.code, "").trim();
      }
      setPersonalMobile(mobile);
    }
  }, [profile]);

  const savePersonalInfo = async () => {
    if (!user) return;
    setSavingPersonal(true);
    const fullName = `${personalFirstName} ${personalLastName}`.trim();
    const fullMobile = personalMobile ? `${personalCountryCode}${personalMobile.replace(/^0+/, '')}` : "";
    await updateProfile({ full_name: fullName, mobile_number: fullMobile } as any);
    setSavingPersonal(false);
    toast({ title: "Personal info saved" });
  };

  // Get the appropriate plan type based on user role
  const planType = role === "patient" ? "patient" : "doctor";

  useEffect(() => {
    if (user) {
      fetchMfaFactors();
      fetchSubscription();
      fetchPaymentHistory();
      if (role === "doctor") {
        fetchInactiveThreshold();
      }
    }
  }, [user, role]);

  useEffect(() => {
    fetchPricing();
  }, [role]);

  const fetchPricing = async () => {
    setLoadingPricing(true);
    try {
      const roleType = role === "patient" ? "patient" : "doctor";
      const { data, error } = await supabase.from("pricing_config").select("*").eq("role", roleType);

      if (!error && data && data.length > 0) {
        const monthlyPlan = data.find((p) => p.billing_cycle === "monthly");
        const annualPlan = data.find((p) => p.billing_cycle === "annual");

        setPlans({
          monthly: {
            price: monthlyPlan?.price || 0,
            name: monthlyPlan?.name || "Monthly",
            period: "month",
          },
          annual: {
            price: annualPlan?.price || 0,
            name: annualPlan?.name || "Annual",
            period: "year",
            savings: annualPlan?.savings || 0,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching pricing:", error);
    } finally {
      setLoadingPricing(false);
    }
  };

  // Handle payment result from URL params
  useEffect(() => {
    const paymentResult = searchParams.get("payment");
    if (paymentResult === "success") {
      toast({
        title: "Payment Successful",
        description: "Your subscription has been activated!",
      });
      fetchSubscription();
      fetchPaymentHistory();
    } else if (paymentResult === "failed") {
      toast({
        title: "Payment Failed",
        description: "There was an issue processing your payment. Please try again.",
        variant: "destructive",
      });
    } else if (paymentResult === "cancelled") {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled.",
      });
    }
  }, [searchParams]);

  const fetchSubscription = async () => {
    if (!user) return;

    setLoadingSubscription(true);
    try {
      const { data, error } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();

      if (!error && data) {
        setSubscription(data as Subscription);
        setSelectedBillingCycle(data.billing_cycle as "monthly" | "annual");
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!user) return;

    setLoadingPaymentHistory(true);
    try {
      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPaymentHistory(data as PaymentHistoryItem[]);
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
    } finally {
      setLoadingPaymentHistory(false);
    }
  };

  const fetchMfaFactors = async () => {
    setLoadingMfa(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data) {
        setMfaFactors(data.totp.filter((f) => f.status === "verified"));
      }
    } catch (error) {
      console.error("Error fetching MFA factors:", error);
    } finally {
      setLoadingMfa(false);
    }
  };

  const fetchInactiveThreshold = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("inactive_threshold_months")
        .eq("id", user.id)
        .single();

      if (!error && data?.inactive_threshold_months) {
        setInactiveThreshold(data.inactive_threshold_months);
      }
    } catch (error) {
      console.error("Error fetching inactive threshold:", error);
    }
  };

  const saveInactiveThreshold = async (months: number) => {
    if (!user) return;
    setSavingThreshold(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ inactive_threshold_months: months })
        .eq("id", user.id);

      if (error) throw error;
      
      setInactiveThreshold(months);
      toast({
        title: "Setting saved",
        description: `Patients will be marked inactive after ${months} months without a visit.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save setting",
        variant: "destructive",
      });
    } finally {
      setSavingThreshold(false);
    }
  };

  const disableMfa = async (factorId: string) => {
    setDisablingMfa(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled",
      });
      fetchMfaFactors();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable 2FA",
        variant: "destructive",
      });
    } finally {
      setDisablingMfa(false);
    }
  };

  const handleConnect = async (provider: "google" | "outlook") => {
    if (provider === "google") {
      await googleConnect();
      return;
    }
    
    setIsConnecting(provider);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setOutlookConnected(true);
    toast({
      title: "Outlook Calendar Connected",
      description: "Your appointments will now sync with Outlook",
    });
    setIsConnecting(null);
  };

  const handleDisconnect = async (provider: "google" | "outlook") => {
    if (provider === "google") {
      await googleDisconnect();
      return;
    }
    setOutlookConnected(false);
    toast({
      title: "Calendar Disconnected",
      description: "Outlook Calendar has been disconnected",
    });
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to subscribe",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await supabase.functions.invoke("paypal-subscription", {
        body: {
          planType,
          billingCycle: selectedBillingCycle,
          userId: user.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { approvalUrl } = response.data;

      if (approvalUrl) {
        // Redirect to PayPal for payment
        window.location.href = approvalUrl;
      } else {
        throw new Error("No approval URL received from PayPal");
      }
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription process",
        variant: "destructive",
      });
      setProcessingPayment(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;

    setCancellingSubscription(true);
    try {
      const response = await supabase.functions.invoke("paypal-subscription", {
        body: {
          action: "cancel",
          userId: user.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Subscription Cancelled",
        description:
          "Your subscription has been cancelled. You will retain access until the end of your billing period.",
      });

      setShowCancelDialog(false);
      fetchSubscription();
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setCancellingSubscription(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!user || !subscription) return;

    setReactivatingSubscription(true);
    try {
      const response = await supabase.functions.invoke("paypal-subscription", {
        body: {
          action: "reactivate",
          planType: subscription.plan_type || planType,
          billingCycle: subscription.billing_cycle || selectedBillingCycle,
          userId: user.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { approvalUrl } = response.data;

      if (approvalUrl) {
        window.location.href = approvalUrl;
      } else {
        throw new Error("No approval URL received from PayPal");
      }
    } catch (error: any) {
      console.error("Reactivation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate subscription",
        variant: "destructive",
      });
      setReactivatingSubscription(false);
    }
  };

  const handleDownloadReceipt = (payment: PaymentHistoryItem) => {
    const receiptContent = `
PAYMENT RECEIPT
================

Transaction ID: ${payment.paypal_transaction_id || "N/A"}
Date: ${format(new Date(payment.created_at), "MMMM d, yyyy 'at' h:mm a")}
Description: ${payment.description}
Amount: $${payment.amount.toFixed(2)} ${payment.currency}
Status: ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}

Thank you for your payment!
Holarc
    `.trim();

    const blob = new Blob([receiptContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${format(new Date(payment.created_at), "yyyy-MM-dd")}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Receipt Downloaded",
      description: `Receipt for ${format(new Date(payment.created_at), "MMMM yyyy")} has been downloaded`,
    });
  };

  const getSubscriptionStatus = () => {
    if (!subscription) return "No active subscription";

    if (subscription.status === "active") {
      const endDate = subscription.current_period_end
        ? format(new Date(subscription.current_period_end), "MMM d, yyyy")
        : "N/A";
      return `Active until ${endDate}`;
    }

    if (subscription.status === "cancelled") {
      const endDate = subscription.current_period_end
        ? format(new Date(subscription.current_period_end), "MMM d, yyyy")
        : "N/A";
      return `Cancelled - Access until ${endDate}`;
    }

    return subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1);
  };

  const getCurrentPlanName = () => {
    if (!subscription || (subscription.status !== "active" && subscription.status !== "cancelled")) return "Free";
    const cycle = subscription.billing_cycle as "monthly" | "annual";
    return plans[cycle]?.name || "Unknown";
  };

  const billingSubTab = useState<"plan" | "history">("plan");
  const [activeBillingTab, setActiveBillingTab] = billingSubTab;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your application preferences and account settings</p>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="flex w-full flex-wrap bg-primary">
          <TabsTrigger value="personal" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Personal</TabsTrigger>
          <TabsTrigger value="preferences" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Preferences</TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Calendar</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Notifications</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Security</TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Billing</TabsTrigger>
          <TabsTrigger value="data" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Data</TabsTrigger>
        </TabsList>

        {/* === PERSONAL TAB === */}
        <TabsContent value="personal" className="space-y-4 mt-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={personalFirstName} onChange={(e) => setPersonalFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={personalLastName} onChange={(e) => setPersonalLastName(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mobile Number</Label>
              <div className="flex gap-2">
                <Select value={personalCountryCode} onValueChange={setPersonalCountryCode}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRY_CODES.map(c => <SelectItem key={c.code} value={c.code}><span className="flex items-center gap-1.5">{c.flag} {c.code}</span></SelectItem>)}</SelectContent>
                </Select>
                <Input type="tel" value={personalMobile} onChange={(e) => setPersonalMobile(e.target.value.replace(/[^0-9]/g, ''))} placeholder="82 123 4567" className="flex-1" />
              </div>
            </div>
            <Button onClick={savePersonalInfo} disabled={savingPersonal} size="sm">
              {savingPersonal ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save"}
            </Button>
          </div>
        </TabsContent>

        {/* === PREFERENCES TAB === */}
        <TabsContent value="preferences" className="space-y-4 mt-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">My Preferences</h2>
            </div>
            {isPatient && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex-1 mr-3">
                    <p className="text-sm font-medium text-foreground">Auto-email invoice to medical aid</p>
                    <p className="text-xs text-muted-foreground mt-0.5">When your doctor marks an invoice as paid, it will be sent to your insurance claims email.</p>
                  </div>
                  <Switch checked={(profile as any)?.auto_email_invoice_to_insurance || false} onCheckedChange={async (c) => { await updateProfile({ auto_email_invoice_to_insurance: c } as any); toast({ title: "Preference updated" }); }} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex-1 mr-3">
                    <p className="text-sm font-medium text-foreground">Auto-email prescription to pharmacy</p>
                    <p className="text-xs text-muted-foreground mt-0.5">When your doctor saves a prescription, it will be sent to your primary pharmacy.</p>
                  </div>
                  <Switch checked={(profile as any)?.auto_email_prescription_to_pharmacy || false} onCheckedChange={async (c) => { await updateProfile({ auto_email_prescription_to_pharmacy: c } as any); toast({ title: "Preference updated" }); }} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex-1 mr-3">
                    <p className="text-sm font-medium text-foreground">Auto-email certificate to employer</p>
                    <p className="text-xs text-muted-foreground mt-0.5">When your doctor saves a medical certificate, it will be sent to your employer.</p>
                  </div>
                  <Switch checked={(profile as any)?.auto_email_certificate_to_employer || false} onCheckedChange={async (c) => { await updateProfile({ auto_email_certificate_to_employer: c } as any); toast({ title: "Preference updated" }); }} />
                </div>
              </div>
            )}
            {!isPatient && (
              <p className="text-sm text-muted-foreground">No preferences available for your role at this time.</p>
            )}

            {/* Patient Management (Doctors only) */}
            {role === "doctor" && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-semibold text-foreground">Patient Management</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Patient Inactivity Threshold</p>
                    <p className="text-sm text-muted-foreground">Automatically mark patients as inactive after this period without a visit</p>
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
          </div>
        </TabsContent>

        {/* === CALENDAR TAB === */}
        <TabsContent value="calendar" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Calendar Integration</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {googleRealConnected && <CheckCircle className="h-5 w-5 text-success" />}
                  <div>
                    <p className="font-medium text-foreground">Google Calendar</p>
                    <p className="text-sm text-muted-foreground">{googleRealConnected ? "Connected - Appointments syncing" : "Sync appointments with Google Calendar"}</p>
                  </div>
                </div>
                {googleRealConnected ? (
                  <Button variant="outline" onClick={() => handleDisconnect("google")} className="text-destructive hover:text-destructive">Disconnect</Button>
                ) : (
                  <Button variant="outline" onClick={() => handleConnect("google")} disabled={googleRealConnecting}>{googleRealConnecting ? "Connecting..." : "Connect"}</Button>
                )}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {outlookConnected && <CheckCircle className="h-5 w-5 text-success" />}
                  <div>
                    <p className="font-medium text-foreground">Outlook Calendar</p>
                    <p className="text-sm text-muted-foreground">{outlookConnected ? "Connected - Appointments syncing" : "Sync appointments with Outlook"}</p>
                  </div>
                </div>
                {outlookConnected ? (
                  <Button variant="outline" onClick={() => handleDisconnect("outlook")} className="text-destructive hover:text-destructive">Disconnect</Button>
                ) : (
                  <Button variant="outline" onClick={() => handleConnect("outlook")} disabled={isConnecting === "outlook"}>{isConnecting === "outlook" ? "Connecting..." : "Connect"}</Button>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* === NOTIFICATIONS TAB === */}
        <TabsContent value="notifications" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-foreground">Email Notifications</p><p className="text-sm text-muted-foreground">Receive email reminders for appointments</p></div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-foreground">Session Reminders</p><p className="text-sm text-muted-foreground">Get notified 15 minutes before sessions</p></div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><p className="font-medium text-foreground">Follow-up Alerts</p><p className="text-sm text-muted-foreground">Reminders for scheduled follow-ups</p></div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* === SECURITY TAB === */}
        <TabsContent value="security" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Security</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {loadingMfa ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : mfaFactors.length > 0 ? <ShieldCheck className="h-5 w-5 text-success" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
                  <div>
                    <p className="font-medium text-foreground">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">{loadingMfa ? "Checking status..." : mfaFactors.length > 0 ? "Enabled - Your account is protected" : "Add an extra layer of security"}</p>
                  </div>
                </div>
                {loadingMfa ? null : mfaFactors.length > 0 ? (
                  <Button variant="outline" onClick={() => disableMfa(mfaFactors[0].id)} disabled={disablingMfa} className="text-destructive hover:text-destructive">{disablingMfa ? "Disabling..." : "Disable"}</Button>
                ) : (
                  <Button variant="outline" onClick={() => setShow2FASetup(true)}>Enable</Button>
                )}
              </div>
              <Separator />
              <div><Button variant="outline" onClick={() => (window.location.href = "/forgot-password")}>Change Password</Button></div>
            </div>
          </div>
        </TabsContent>

        {/* === BILLING TAB (with Payment History sub-tab) === */}
        <TabsContent value="billing" className="mt-4 space-y-4">
          <div className="flex gap-2 mb-2">
            <Button variant={activeBillingTab === "plan" ? "default" : "outline"} size="sm" onClick={() => setActiveBillingTab("plan")}>Subscription</Button>
            <Button variant={activeBillingTab === "history" ? "default" : "outline"} size="sm" onClick={() => setActiveBillingTab("history")}>Payment History</Button>
          </div>

          {activeBillingTab === "plan" && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Billing</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium text-foreground">Current Plan</p><p className="text-sm text-muted-foreground">{loadingSubscription ? "Loading..." : getCurrentPlanName()}</p></div>
                  {subscription?.status === "active" ? <Badge variant="default" className="bg-green-600">Active</Badge> : subscription?.status === "cancelled" ? <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Cancelled</Badge> : <Badge variant="secondary">Inactive</Badge>}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div><p className="font-medium text-foreground">Subscription Status</p><p className="text-sm text-muted-foreground">{loadingSubscription ? "Loading..." : getSubscriptionStatus()}</p></div>
                  <div className="flex gap-2">
                    {subscription?.status === "active" && <Button variant="outline" onClick={() => setShowCancelDialog(true)} className="text-destructive hover:text-destructive">Cancel</Button>}
                    {subscription?.status === "cancelled" && (
                      <Button variant="outline" onClick={handleReactivateSubscription} disabled={reactivatingSubscription} className="text-green-600 hover:text-green-700">
                        {reactivatingSubscription ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reactivating...</> : <><RotateCcw className="h-4 w-4 mr-2" />Reactivate</>}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setShowManagePlan(true)}>{subscription?.status === "active" ? "Change Plan" : subscription?.status === "cancelled" ? "Change Plan" : "Subscribe"}</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeBillingTab === "history" && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Receipt className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Payment History</h2>
              </div>
              {loadingPaymentHistory ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : paymentHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payment history yet</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
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
          )}
        </TabsContent>

        {/* === DATA MANAGEMENT TAB === */}
        <TabsContent value="data" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Data Management</h2>
            </div>
            <div className="space-y-4">
              <Button variant="outline">Export All Data</Button>
              <p className="text-sm text-muted-foreground">Download all your client data, documents, and session records</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 2FA Setup Dialog */}
      <TwoFactorSetup open={show2FASetup} onOpenChange={setShow2FASetup} onSuccess={fetchMfaFactors} />

      {/* Manage Plan Dialog */}
      <Dialog open={showManagePlan} onOpenChange={setShowManagePlan}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose Your Plan</DialogTitle>
            <DialogDescription>Select a billing cycle for your {planType} subscription. Payment is processed securely via PayPal.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedBillingCycle} onValueChange={(v) => setSelectedBillingCycle(v as "monthly" | "annual")} className="space-y-4 mt-4">
            <div className={`relative flex items-start rounded-lg border p-4 cursor-pointer transition-colors ${selectedBillingCycle === "monthly" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`} onClick={() => setSelectedBillingCycle("monthly")}>
              <RadioGroupItem value="monthly" id="monthly" className="mt-1" />
              <div className="ml-3 flex-1">
                <Label htmlFor="monthly" className="font-semibold text-foreground cursor-pointer">Monthly <span className="ml-2 text-primary">${plans.monthly.price}/{plans.monthly.period}</span></Label>
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />Full access to all features</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />Cancel anytime</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />Priority support</li>
                </ul>
              </div>
            </div>
            <div className={`relative flex items-start rounded-lg border p-4 cursor-pointer transition-colors ${selectedBillingCycle === "annual" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`} onClick={() => setSelectedBillingCycle("annual")}>
              <RadioGroupItem value="annual" id="annual" className="mt-1" />
              <div className="ml-3 flex-1">
                <Label htmlFor="annual" className="font-semibold text-foreground cursor-pointer">Annual <span className="ml-2 text-primary">${plans.annual.price}/{plans.annual.period}</span> <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">Save ${plans.annual.savings}</Badge></Label>
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />Full access to all features</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />2 months free</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />Priority support</li>
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

      {/* Cancel Subscription Dialog */}
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
    </div>
  );
}
