import { useState, useEffect } from "react";
import { Calendar, Bell, Shield, Database, CheckCircle, Loader2, ShieldCheck, ShieldOff, CreditCard, Receipt, Download, Check } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Mock payment history data
const paymentHistory = [
  { id: "1", date: new Date(2024, 10, 1), description: "Professional Plan - Monthly", amount: 49.99, status: "paid" },
  { id: "2", date: new Date(2024, 9, 1), description: "Professional Plan - Monthly", amount: 49.99, status: "paid" },
  { id: "3", date: new Date(2024, 8, 1), description: "Professional Plan - Monthly", amount: 49.99, status: "paid" },
  { id: "4", date: new Date(2024, 7, 1), description: "Professional Plan - Monthly", amount: 49.99, status: "paid" },
  { id: "5", date: new Date(2024, 6, 1), description: "Professional Plan - Monthly", amount: 49.99, status: "paid" },
];

const plans = [
  { id: "basic", name: "Basic", price: 19.99, features: ["Up to 50 patients", "Basic templates", "Email support"] },
  { id: "professional", name: "Professional", price: 49.99, features: ["Unlimited patients", "All templates", "Priority support", "Calendar sync"] },
  { id: "enterprise", name: "Enterprise", price: 99.99, features: ["Everything in Pro", "Custom branding", "API access", "Dedicated support"] },
];

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [loadingMfa, setLoadingMfa] = useState(true);
  const [disablingMfa, setDisablingMfa] = useState(false);
  
  // Billing state
  const [showManagePlan, setShowManagePlan] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMfaFactors();
    }
  }, [user]);

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

  const handleSavePlan = async () => {
    setIsSavingPlan(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSavingPlan(false);
    setShowManagePlan(false);
    const plan = plans.find(p => p.id === selectedPlan);
    toast({
      title: "Plan Updated",
      description: `You are now on the ${plan?.name} plan`,
    });
  };

  const handleSavePayment = async () => {
    if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all card details",
        variant: "destructive",
      });
      return;
    }
    setIsSavingPayment(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setPaymentMethod(`•••• •••• •••• ${cardNumber.slice(-4)}`);
    setIsSavingPayment(false);
    setShowAddPayment(false);
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setCardName("");
    toast({
      title: "Payment Method Added",
      description: "Your card has been saved successfully",
    });
  };

  const handleDownloadReceipt = (payment: typeof paymentHistory[0]) => {
    toast({
      title: "Downloading Receipt",
      description: `Receipt for ${format(payment.date, "MMMM yyyy")} is being downloaded`,
    });
    // Simulate download
    const link = document.createElement('a');
    link.href = `data:text/plain;charset=utf-8,Receipt for ${payment.description}%0ADate: ${format(payment.date, "MMMM d, yyyy")}%0AAmount: $${payment.amount.toFixed(2)}%0AStatus: ${payment.status}`;
    link.download = `receipt-${format(payment.date, "yyyy-MM")}.txt`;
    link.click();
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
                {plans.find(p => p.id === selectedPlan)?.name} Plan - Active
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowManagePlan(true)}>
              Manage Plan
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Payment Method</p>
              <p className="text-sm text-muted-foreground">
                {paymentMethod || "No payment method added"}
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowAddPayment(true)}>
              {paymentMethod ? "Update Payment" : "Add Payment"}
            </Button>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Receipt className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Payment History</h2>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentHistory.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {format(payment.date, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{payment.description}</TableCell>
                  <TableCell>${payment.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={payment.status === "paid" ? "default" : "destructive"} className="capitalize">
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadReceipt(payment)}>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {paymentHistory.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No payment history yet</p>
        )}
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
            <DialogTitle>Manage Your Plan</DialogTitle>
            <DialogDescription>
              Choose the plan that best fits your practice needs
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="space-y-4 mt-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex items-start rounded-lg border p-4 cursor-pointer transition-colors ${
                  selectedPlan === plan.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <RadioGroupItem value={plan.id} id={plan.id} className="mt-1" />
                <div className="ml-3 flex-1">
                  <Label htmlFor={plan.id} className="font-semibold text-foreground cursor-pointer">
                    {plan.name}
                    <span className="ml-2 text-primary">${plan.price}/mo</span>
                  </Label>
                  <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </RadioGroup>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowManagePlan(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan} disabled={isSavingPlan}>
              {isSavingPlan ? "Saving..." : "Update Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{paymentMethod ? "Update Payment Method" : "Add Payment Method"}</DialogTitle>
            <DialogDescription>
              Enter your card details to {paymentMethod ? "update" : "add"} a payment method
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="cardName">Cardholder Name</Label>
              <Input
                id="cardName"
                placeholder="John Doe"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardExpiry">Expiry Date</Label>
                <Input
                  id="cardExpiry"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    if (value.length > 2) {
                      value = value.slice(0, 2) + "/" + value.slice(2);
                    }
                    setCardExpiry(value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardCvc">CVC</Label>
                <Input
                  id="cardCvc"
                  placeholder="123"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowAddPayment(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePayment} disabled={isSavingPayment}>
              {isSavingPayment ? "Saving..." : "Save Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
