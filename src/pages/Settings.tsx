import { useState, useEffect } from "react";
import { Calendar, Bell, Shield, Database, CheckCircle, Loader2, ShieldCheck, ShieldOff, CreditCard, Receipt, Download, Check, ExternalLink } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUserRole } from "@/hooks/useUserRole";
import { useSearchParams } from "react-router-dom";

// Plan pricing
const DOCTOR_PLANS = {
  monthly: { price: 49.99, name: 'Doctor Monthly', period: 'month' },
  annual: { price: 499.99, name: 'Doctor Annual', period: 'year', savings: 100 }
};

const PATIENT_PLANS = {
  monthly: { price: 9.99, name: 'Patient Monthly', period: 'month' },
  annual: { price: 99.99, name: 'Patient Annual', period: 'year', savings: 20 }
};

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

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { role } = useUserRole();
  const [searchParams] = useSearchParams();
  
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [loadingMfa, setLoadingMfa] = useState(true);
  const [disablingMfa, setDisablingMfa] = useState(false);
  
  // Billing state
  const [showManagePlan, setShowManagePlan] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Get the appropriate plans based on user role
  const plans = role === 'patient' ? PATIENT_PLANS : DOCTOR_PLANS;
  const planType = role === 'patient' ? 'patient' : 'doctor';

  useEffect(() => {
    if (user) {
      fetchMfaFactors();
      fetchSubscription();
    }
  }, [user]);

  // Handle payment result from URL params
  useEffect(() => {
    const paymentResult = searchParams.get('payment');
    if (paymentResult === 'success') {
      toast({
        title: "Payment Successful",
        description: "Your subscription has been activated!",
      });
      fetchSubscription();
    } else if (paymentResult === 'failed') {
      toast({
        title: "Payment Failed",
        description: "There was an issue processing your payment. Please try again.",
        variant: "destructive",
      });
    } else if (paymentResult === 'cancelled') {
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
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setSubscription(data as Subscription);
        setSelectedBillingCycle(data.billing_cycle as 'monthly' | 'annual');
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const fetchMfaFactors = async () => {
    setLoadingMfa(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data) {
        setMfaFactors(data.totp.filter(f => f.status === 'verified'));
      }
    } catch (error) {
      console.error('Error fetching MFA factors:', error);
    } finally {
      setLoadingMfa(false);
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
    setIsConnecting(provider);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (provider === "google") {
      setGoogleConnected(true);
      toast({
        title: "Google Calendar Connected",
        description: "Your appointments will now sync with Google Calendar",
      });
    } else {
      setOutlookConnected(true);
      toast({
        title: "Outlook Calendar Connected", 
        description: "Your appointments will now sync with Outlook",
      });
    }
    
    setIsConnecting(null);
  };

  const handleDisconnect = (provider: "google" | "outlook") => {
    if (provider === "google") {
      setGoogleConnected(false);
    } else {
      setOutlookConnected(false);
    }
    toast({
      title: "Calendar Disconnected",
      description: `${provider === "google" ? "Google" : "Outlook"} Calendar has been disconnected`,
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
      const response = await supabase.functions.invoke('paypal-subscription', {
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
        throw new Error('No approval URL received from PayPal');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription process",
        variant: "destructive",
      });
      setProcessingPayment(false);
    }
  };

  const getSubscriptionStatus = () => {
    if (!subscription) return 'No active subscription';
    
    if (subscription.status === 'active') {
      const endDate = subscription.current_period_end 
        ? format(new Date(subscription.current_period_end), 'MMM d, yyyy')
        : 'N/A';
      return `Active until ${endDate}`;
    }
    
    return subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1);
  };

  const getCurrentPlanName = () => {
    if (!subscription || subscription.status !== 'active') return 'Free';
    const cycle = subscription.billing_cycle as 'monthly' | 'annual';
    return plans[cycle]?.name || 'Unknown';
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your application preferences and account settings
        </p>
      </div>

      {/* Calendar Integration */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Calendar Integration</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {googleConnected && (
                <CheckCircle className="h-5 w-5 text-success" />
              )}
              <div>
                <p className="font-medium text-foreground">Google Calendar</p>
                <p className="text-sm text-muted-foreground">
                  {googleConnected 
                    ? "Connected - Appointments syncing" 
                    : "Sync appointments with Google Calendar"}
                </p>
              </div>
            </div>
            {googleConnected ? (
              <Button 
                variant="outline" 
                onClick={() => handleDisconnect("google")}
                className="text-destructive hover:text-destructive"
              >
                Disconnect
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => handleConnect("google")}
                disabled={isConnecting === "google"}
              >
                {isConnecting === "google" ? "Connecting..." : "Connect"}
              </Button>
            )}
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {outlookConnected && (
                <CheckCircle className="h-5 w-5 text-success" />
              )}
              <div>
                <p className="font-medium text-foreground">Outlook Calendar</p>
                <p className="text-sm text-muted-foreground">
                  {outlookConnected 
                    ? "Connected - Appointments syncing" 
                    : "Sync appointments with Outlook"}
                </p>
              </div>
            </div>
            {outlookConnected ? (
              <Button 
                variant="outline" 
                onClick={() => handleDisconnect("outlook")}
                className="text-destructive hover:text-destructive"
              >
                Disconnect
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => handleConnect("outlook")}
                disabled={isConnecting === "outlook"}
              >
                {isConnecting === "outlook" ? "Connecting..." : "Connect"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive email reminders for appointments</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Session Reminders</p>
              <p className="text-sm text-muted-foreground">Get notified 15 minutes before sessions</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Follow-up Alerts</p>
              <p className="text-sm text-muted-foreground">Reminders for scheduled follow-ups</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Security</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {loadingMfa ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : mfaFactors.length > 0 ? (
                <ShieldCheck className="h-5 w-5 text-success" />
              ) : (
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-foreground">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  {loadingMfa 
                    ? "Checking status..." 
                    : mfaFactors.length > 0 
                      ? "Enabled - Your account is protected" 
                      : "Add an extra layer of security"}
                </p>
              </div>
            </div>
            {loadingMfa ? null : mfaFactors.length > 0 ? (
              <Button 
                variant="outline" 
                onClick={() => disableMfa(mfaFactors[0].id)}
                disabled={disablingMfa}
                className="text-destructive hover:text-destructive"
              >
                {disablingMfa ? "Disabling..." : "Disable"}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setShow2FASetup(true)}>
                Enable
              </Button>
            )}
          </div>
          <Separator />
          <div>
            <Button variant="outline" onClick={() => window.location.href = "/forgot-password"}>
              Change Password
            </Button>
          </div>
        </div>
      </div>

      {/* Billing */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Billing</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Current Plan</p>
              <p className="text-sm text-muted-foreground">
                {loadingSubscription ? "Loading..." : getCurrentPlanName()}
              </p>
            </div>
            {subscription?.status === 'active' ? (
              <Badge variant="default" className="bg-green-600">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Subscription Status</p>
              <p className="text-sm text-muted-foreground">
                {loadingSubscription ? "Loading..." : getSubscriptionStatus()}
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowManagePlan(true)}>
              {subscription?.status === 'active' ? "Change Plan" : "Subscribe"}
            </Button>
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Data Management</h2>
        </div>
        <div className="space-y-4">
          <Button variant="outline">Export All Data</Button>
          <p className="text-sm text-muted-foreground">
            Download all your client data, documents, and session records
          </p>
        </div>
      </div>

      {/* 2FA Setup Dialog */}
      <TwoFactorSetup 
        open={show2FASetup} 
        onOpenChange={setShow2FASetup}
        onSuccess={fetchMfaFactors}
      />

      {/* Manage Plan Dialog */}
      <Dialog open={showManagePlan} onOpenChange={setShowManagePlan}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose Your Plan</DialogTitle>
            <DialogDescription>
              Select a billing cycle for your {planType} subscription. Payment is processed securely via PayPal.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup 
            value={selectedBillingCycle} 
            onValueChange={(v) => setSelectedBillingCycle(v as 'monthly' | 'annual')} 
            className="space-y-4 mt-4"
          >
            {/* Monthly Plan */}
            <div
              className={`relative flex items-start rounded-lg border p-4 cursor-pointer transition-colors ${
                selectedBillingCycle === 'monthly' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onClick={() => setSelectedBillingCycle('monthly')}
            >
              <RadioGroupItem value="monthly" id="monthly" className="mt-1" />
              <div className="ml-3 flex-1">
                <Label htmlFor="monthly" className="font-semibold text-foreground cursor-pointer">
                  Monthly
                  <span className="ml-2 text-primary">${plans.monthly.price}/{plans.monthly.period}</span>
                </Label>
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-primary" />
                    Full access to all features
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-primary" />
                    Cancel anytime
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-primary" />
                    Priority support
                  </li>
                </ul>
              </div>
            </div>

            {/* Annual Plan */}
            <div
              className={`relative flex items-start rounded-lg border p-4 cursor-pointer transition-colors ${
                selectedBillingCycle === 'annual' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onClick={() => setSelectedBillingCycle('annual')}
            >
              <RadioGroupItem value="annual" id="annual" className="mt-1" />
              <div className="ml-3 flex-1">
                <Label htmlFor="annual" className="font-semibold text-foreground cursor-pointer">
                  Annual
                  <span className="ml-2 text-primary">${plans.annual.price}/{plans.annual.period}</span>
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                    Save ${plans.annual.savings}
                  </Badge>
                </Label>
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-primary" />
                    Full access to all features
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-primary" />
                    2 months free
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-primary" />
                    Priority support
                  </li>
                </ul>
              </div>
            </div>
          </RadioGroup>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowManagePlan(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubscribe} disabled={processingPayment}>
              {processingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Pay with PayPal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}