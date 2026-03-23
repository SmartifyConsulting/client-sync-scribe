import { useState, useEffect, useRef } from "react";
import {
  Calendar, Bell, Shield, Database, CheckCircle, Loader2, ShieldCheck, ShieldOff,
  CreditCard, Receipt, Download, Check, ExternalLink, XCircle, RotateCcw, Users,
  Settings2, Volume2, Bold, Italic, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";
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

// ── Constants ──────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "af", name: "Afrikaans" }, { code: "ar", name: "Arabic" }, { code: "nl", name: "Dutch" },
  { code: "en", name: "English" }, { code: "fr", name: "French" }, { code: "de", name: "German" },
  { code: "el", name: "Greek" }, { code: "he", name: "Hebrew" }, { code: "hi", name: "Hindi" },
  { code: "id", name: "Indonesian" }, { code: "it", name: "Italian" }, { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" }, { code: "ms", name: "Malay" }, { code: "zh", name: "Mandarin Chinese" },
  { code: "pl", name: "Polish" }, { code: "pt", name: "Portuguese" }, { code: "ru", name: "Russian" },
  { code: "st", name: "Sotho" }, { code: "es", name: "Spanish" }, { code: "sw", name: "Swahili" },
  { code: "th", name: "Thai" }, { code: "tn", name: "Tswana" }, { code: "tr", name: "Turkish" },
  { code: "uk", name: "Ukrainian" }, { code: "vi", name: "Vietnamese" }, { code: "xh", name: "Xhosa" },
  { code: "zu", name: "Zulu" },
];

const SAMPLE_TEXTS: Record<string, string> = {
  af: "Hallo, dit is jou Holarc-briefingstem. Hier is 'n voorskou van hoe jou vertellings sal klink.",
  ar: "مرحبًا، هذا هو صوت إحاطة Holarc الخاص بك. إليك معاينة لكيفية صوت رواياتك.",
  nl: "Hallo, dit is je Holarc-briefingstem. Hier is een voorbeeld van hoe je vertellingen zullen klinken.",
  en: "Hello, this is your Holarc briefing voice. Here is a preview of how your narrations will sound.",
  fr: "Bonjour, ceci est votre voix de briefing Holarc. Voici un aperçu de la façon dont vos narrations sonneront.",
  de: "Hallo, dies ist Ihre Holarc-Briefingstimme. Hier ist eine Vorschau, wie Ihre Erzählungen klingen werden.",
  el: "Γεια σας, αυτή είναι η φωνή ενημέρωσης Holarc. Ακολουθεί μια προεπισκόπηση του πώς θα ακούγονται οι αφηγήσεις σας.",
  he: "שלום, זהו קול התדרוך של Holarc שלך. הנה תצוגה מקדימה של איך הקריינויות שלך יישמעו.",
  hi: "नमस्ते, यह आपकी Holarc ब्रीफिंग आवाज़ है। यहाँ एक पूर्वावलोकन है कि आपकी कथाएँ कैसी लगेंगी।",
  id: "Halo, ini adalah suara briefing Holarc Anda. Berikut pratinjau bagaimana narasi Anda akan terdengar.",
  it: "Ciao, questa è la tua voce di briefing Holarc. Ecco un'anteprima di come suoneranno le tue narrazioni.",
  ja: "こんにちは、これはあなたのHolarcブリーフィングの声です。ナレーションがどのように聞こえるかのプレビューです。",
  ko: "안녕하세요, 이것은 Holarc 브리핑 음성입니다. 내레이션이 어떻게 들릴지 미리 들어보세요.",
  ms: "Halo, ini adalah suara taklimat Holarc anda. Berikut ialah pratonton bagaimana narasi anda akan berbunyi.",
  zh: "您好，这是您的Holarc简报语音。以下是您的旁白听起来的预览。",
  pl: "Cześć, to jest Twój głos briefingowy Holarc. Oto podgląd tego, jak będą brzmieć Twoje narracje.",
  pt: "Olá, esta é a sua voz de briefing do Holarc. Aqui está uma prévia de como suas narrações soarão.",
  ru: "Здравствуйте, это ваш голос брифинга Holarc. Вот предварительный просмотр того, как будут звучать ваши повествования.",
  st: "Lumela, ena ke lentsoe la hao la Holarc. Sena ke ponelopele ea hore na litšoantšiso tsa hao li tla utloahala joang.",
  es: "Hola, esta es tu voz de briefing de Holarc. Aquí tienes una vista previa de cómo sonarán tus narraciones.",
  sw: "Habari, hii ni sauti yako ya muhtasari wa Holarc. Hapa kuna hakikisho la jinsi masimulizi yako yatasikika.",
  th: "สวัสดี นี่คือเสียงบรรยายสรุปของ Holarc ของคุณ นี่คือตัวอย่างของเสียงบรรยายของคุณ",
  tn: "Dumelang, eno ke lentswe la gago la Holarc. Se ke ponelopele ya gore dipolelo tsa gago di tla utlwala jang.",
  tr: "Merhaba, bu sizin Holarc brifing sesinizdir. İşte anlatımlarınızın nasıl duyulacağına dair bir önizleme.",
  uk: "Привіт, це ваш голос брифінгу Holarc. Ось попередній перегляд того, як звучатимуть ваші нарації.",
  vi: "Xin chào, đây là giọng tóm tắt Holarc của bạn. Đây là bản xem trước về cách tường thuật của bạn sẽ phát ra.",
  xh: "Molo, eli lilizwi lakho le-Holarc. Nantsi imboniso yokuba iibalisi zakho ziya kuvakalisa njani.",
  zu: "Sawubona, leli yizwi lakho le-Holarc. Nansi isibonelo sokuthi izindaba zakho zizozwakala kanjani.",
};

const SIGNATURE_FONTS = [
  { value: "allura", label: "Allura", fontFamily: "'Allura', serif" },
  { value: "great-vibes", label: "Great Vibes", fontFamily: "'Great Vibes', serif" },
  { value: "herr-von-muellerhoff", label: "Herr Von Muellerhoff", fontFamily: "'Herr Von Muellerhoff', serif" },
  { value: "homemade-apple", label: "Homemade Apple", fontFamily: "'Homemade Apple', serif" },
  { value: "kalam", label: "Kalam", fontFamily: "'Kalam', serif" },
  { value: "mr-dafoe", label: "Mr Dafoe", fontFamily: "'Mr Dafoe', serif" },
  { value: "petit-formal-script", label: "Petit Formal Script", fontFamily: "'Petit Formal Script', serif" },
  { value: "pinyon-script", label: "Pinyon Script", fontFamily: "'Pinyon Script', serif" },
  { value: "reenie-beanie", label: "Reenie Beanie", fontFamily: "'Reenie Beanie', serif" },
  { value: "rock-salt", label: "Rock Salt", fontFamily: "'Rock Salt', serif" },
  { value: "sacramento", label: "Sacramento", fontFamily: "'Sacramento', serif" },
];

const SIGNATURE_COLORS = [
  { value: "black", label: "Black", color: "#000000" },
  { value: "teal", label: "Teal", color: "#104861" },
  { value: "navy", label: "Navy", color: "#1a2744" },
  { value: "dark-red", label: "Dark Red", color: "#8B0000" },
  { value: "dark-green", label: "Dark Green", color: "#006400" },
];

// ── Interfaces ──────────────────────────────────────────────────────
interface PlanConfig { price: number; name: string; period: string; savings?: number; }
interface PricingPlans { monthly: PlanConfig; annual: PlanConfig; }
interface Subscription { id: string; user_id: string; plan_type: string; billing_cycle: string; status: string; paypal_subscription_id: string | null; current_period_start: string | null; current_period_end: string | null; created_at: string; }
interface PaymentHistoryItem { id: string; user_id: string; subscription_id: string | null; paypal_transaction_id: string | null; amount: number; currency: string; description: string; status: string; created_at: string; }

// ── Main Component ──────────────────────────────────────────────────
export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { role, isAdmin } = useUserRole();
  const { profile, loading, fetchProfile, updateProfile } = useProfile();
  const [searchParams] = useSearchParams();
  const { isConnected: googleRealConnected, isConnecting: googleRealConnecting, connect: googleConnect, disconnect: googleDisconnect } = useGoogleCalendar();

  const isDoctor = role === "doctor";
  const isPatientRole = role === "patient";

  // ── Signature form state (auto-save) ──
  const [savedStatus, setSavedStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialized = useRef(false);
  const isSettingFromProfile = useRef(false);
  const profileLoadedData = useRef<any>(null);

  const [sigFormData, setSigFormData] = useState({
    signature_font: "allura", signature_color: "black",
    signature_font_size: 24, signature_bold: false, signature_italic: false,
  });

  // ── Calendar / Security / Billing state ──
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [loadingMfa, setLoadingMfa] = useState(true);
  const [disablingMfa, setDisablingMfa] = useState(false);
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

  // ── Profile data sync (signature only) ──
  useEffect(() => {
    if (profile) {
      const newSigData = {
        signature_font: (profile as any).signature_font || "allura",
        signature_color: (profile as any).signature_color || "black",
        signature_font_size: (profile as any).signature_font_size ?? 24,
        signature_bold: (profile as any).signature_bold ?? false,
        signature_italic: (profile as any).signature_italic ?? false,
      };
      isSettingFromProfile.current = true;
      profileLoadedData.current = newSigData;
      setSigFormData(newSigData);
      requestAnimationFrame(() => { hasInitialized.current = true; isSettingFromProfile.current = false; });
    }
  }, [profile]);

  const combinedFullName = profile?.full_name || "Your Name";

  // ── Auto-save signature debounce ──
  useEffect(() => {
    if (!hasInitialized.current || !user || isSettingFromProfile.current) return;
    if (profileLoadedData.current && JSON.stringify(sigFormData) === JSON.stringify(profileLoadedData.current)) {
      profileLoadedData.current = null; return;
    }
    profileLoadedData.current = null;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setSavedStatus('saving');
      const { error } = await updateProfile({
        signature_font: sigFormData.signature_font, signature_color: sigFormData.signature_color,
        signature_font_size: sigFormData.signature_font_size, signature_bold: sigFormData.signature_bold,
        signature_italic: sigFormData.signature_italic,
      } as any);
      if (error) { setSavedStatus('idle'); toast({ title: "Error", description: "Failed to save", variant: "destructive" }); }
      else { setSavedStatus('saved'); setTimeout(() => setSavedStatus('idle'), 2000); }
    }, 1500);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [sigFormData]);

  // ── Fetch data ──
  useEffect(() => {
    if (user) { fetchMfaFactors(); fetchSubscription(); fetchPaymentHistory(); if (isDoctor) fetchInactiveThreshold(); }
  }, [user, isDoctor]);

  useEffect(() => { fetchPricing(); }, [role]);

  // Payment result from URL
  useEffect(() => {
    const paymentResult = searchParams.get("payment");
    if (paymentResult === "success") { toast({ title: "Payment Successful", description: "Your subscription has been activated!" }); fetchSubscription(); fetchPaymentHistory(); }
    else if (paymentResult === "failed") { toast({ title: "Payment Failed", description: "There was an issue processing your payment.", variant: "destructive" }); }
    else if (paymentResult === "cancelled") { toast({ title: "Payment Cancelled", description: "Your payment was cancelled." }); }
  }, [searchParams]);

  const getSignatureFontFamily = (v: string) => SIGNATURE_FONTS.find(f => f.value === v)?.fontFamily || SIGNATURE_FONTS[0].fontFamily;
  const getSignatureColor = (v: string) => SIGNATURE_COLORS.find(c => c.value === v)?.color || "#000000";
  const planType = role === "patient" ? "patient" : "doctor";

  // ── Fetch functions ──
  const fetchPricing = async () => {
    setLoadingPricing(true);
    try {
      const roleType = role === "patient" ? "patient" : "doctor";
      const { data, error } = await supabase.from("pricing_config").select("*").eq("role", roleType);
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
    } catch (error) { console.error("Error fetching MFA factors:", error); } finally { setLoadingMfa(false); }
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

  // ── Calendar / MFA / Billing handlers ──
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
      toast({ title: "Subscription Cancelled", description: "You will retain access until the end of your billing period." });
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

  // ── RENDER ──
  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your preferences, security, and billing</p>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-1.5">
          {savedStatus === 'saving' && <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Saving...</span></>}
          {savedStatus === 'saved' && <><Check className="h-3.5 w-3.5 text-success" /><span className="text-success">Saved</span></>}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="flex w-full flex-wrap bg-primary justify-start">
          <TabsTrigger value="preferences" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Preferences</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Notifications</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Security</TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs">Billing</TabsTrigger>
        </TabsList>

        {/* === PREFERENCES TAB === */}
        <TabsContent value="preferences" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Preferences</h2>
            </div>

            {isPatientRole && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex-1 mr-3">
                    <p className="text-[10px] font-medium text-foreground">Auto-email invoice to medical aid</p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">When your doctor marks an invoice as paid, it will be sent to your insurance claims email.</p>
                  </div>
                  <Switch checked={(profile as any)?.auto_email_invoice_to_insurance || false} onCheckedChange={async (c) => { await updateProfile({ auto_email_invoice_to_insurance: c } as any); toast({ title: "Preference updated" }); }} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex-1 mr-3">
                    <p className="text-[10px] font-medium text-foreground">Auto-email prescription to pharmacy</p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">When your doctor saves a prescription, it will be sent to your primary pharmacy.</p>
                  </div>
                  <Switch checked={(profile as any)?.auto_email_prescription_to_pharmacy || false} onCheckedChange={async (c) => { await updateProfile({ auto_email_prescription_to_pharmacy: c } as any); toast({ title: "Preference updated" }); }} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex-1 mr-3">
                    <p className="text-[10px] font-medium text-foreground">Auto-email certificate to employer</p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">When your doctor saves a medical certificate, it will be sent to your employer.</p>
                  </div>
                  <Switch checked={(profile as any)?.auto_email_certificate_to_employer || false} onCheckedChange={async (c) => { await updateProfile({ auto_email_certificate_to_employer: c } as any); toast({ title: "Preference updated" }); }} />
                </div>
              </div>
            )}

            {isDoctor && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="text-[9px] font-semibold text-foreground">Patient Management</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-[10px]">Patient Inactivity Threshold</p>
                    <p className="text-[8px] text-muted-foreground">Automatically mark patients as inactive after this period without a visit</p>
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

            {/* Language Sub-frame */}
            <Separator />
            <div className="space-y-3">
              <h3 className="text-[9px] font-semibold text-foreground">Language</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Select value={(profile as any)?.country || "ZA"} onValueChange={async (v) => { await updateProfile({ country: v } as any); toast({ title: "Country updated" }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZA">🇿🇦 South Africa</SelectItem><SelectItem value="US">🇺🇸 United States</SelectItem>
                      <SelectItem value="GB">🇬🇧 United Kingdom</SelectItem><SelectItem value="AU">🇦🇺 Australia</SelectItem>
                      <SelectItem value="CA">🇨🇦 Canada</SelectItem><SelectItem value="IN">🇮🇳 India</SelectItem>
                      <SelectItem value="DE">🇩🇪 Germany</SelectItem><SelectItem value="FR">🇫🇷 France</SelectItem>
                      <SelectItem value="AE">🇦🇪 UAE</SelectItem><SelectItem value="BW">🇧🇼 Botswana</SelectItem>
                      <SelectItem value="NA">🇳🇦 Namibia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Language</Label>
                  <Select value={(profile as any)?.preferred_language || "en"} onValueChange={async (v) => { await updateProfile({ preferred_language: v } as any); toast({ title: "Language updated" }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Narration Voice</Label>
                  <div className="flex gap-2">
                    <Select value={(profile as any)?.narration_voice || "nova"} onValueChange={async (v) => { await updateProfile({ narration_voice: v } as any); toast({ title: "Voice updated" }); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alloy">Alloy</SelectItem><SelectItem value="echo">Echo</SelectItem>
                        <SelectItem value="fable">Fable</SelectItem><SelectItem value="nova">Nova</SelectItem>
                        <SelectItem value="onyx">Onyx</SelectItem><SelectItem value="shimmer">Shimmer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" className="shrink-0" onClick={async () => {
                      const voice = (profile as any)?.narration_voice || "nova";
                      toast({ title: "Generating preview..." });
                      try {
                        const langCode = profile?.preferred_language || "en";
                        const sampleText = SAMPLE_TEXTS[langCode] || SAMPLE_TEXTS.en;
                        const audio = new Audio(); audio.play().catch(() => {});
                        const { data: { session } } = await supabase.auth.getSession();
                        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrate-briefing`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ text: sampleText, voice }) });
                        if (!response.ok) throw new Error('Failed');
                        const blob = await response.blob(); const url = URL.createObjectURL(blob); audio.src = url; await audio.play(); audio.onended = () => URL.revokeObjectURL(url);
                      } catch (err: any) { toast({ title: "Preview failed", description: err.message, variant: "destructive" }); }
                    }}><Volume2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar Integration Sub-frame */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-[9px] font-semibold text-foreground">Calendar Integration</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {googleRealConnected && <CheckCircle className="h-4 w-4 text-success" />}
                    <div>
                      <p className="font-medium text-foreground text-[10px]">Google Calendar</p>
                      <p className="text-[8px] text-muted-foreground">{googleRealConnected ? "Connected - Appointments syncing" : "Sync appointments with Google Calendar"}</p>
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
                      <p className="font-medium text-foreground text-[10px]">Outlook Calendar</p>
                      <p className="text-[8px] text-muted-foreground">{outlookConnected ? "Connected - Appointments syncing" : "Sync appointments with Outlook"}</p>
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

            {/* Digital Signature Sub-frame */}
            {isDoctor && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Digital Signature</Label>
                  <div className="p-3 border border-border rounded-lg bg-background">
                    <p style={{ fontFamily: getSignatureFontFamily(sigFormData.signature_font), color: getSignatureColor(sigFormData.signature_color), fontSize: `${sigFormData.signature_font_size}px`, fontWeight: sigFormData.signature_bold ? 'bold' : 'normal', fontStyle: sigFormData.signature_italic ? 'italic' : 'normal' }}>{combinedFullName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Font</Label>
                    <Select value={sigFormData.signature_font} onValueChange={(v) => setSigFormData({ ...sigFormData, signature_font: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SIGNATURE_FONTS.map(f => <SelectItem key={f.value} value={f.value}><span style={{ fontFamily: f.fontFamily, fontSize: '18px' }}>{f.label}</span></SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Color</Label>
                      <Select value={sigFormData.signature_color} onValueChange={(v) => setSigFormData({ ...sigFormData, signature_color: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SIGNATURE_COLORS.map(c => (
                            <SelectItem key={c.value} value={c.value}>
                              <span className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: c.color }} />
                                {c.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Size: {sigFormData.signature_font_size}px</Label>
                      <Slider min={16} max={48} step={2} value={[sigFormData.signature_font_size]} onValueChange={([v]) => setSigFormData({ ...sigFormData, signature_font_size: v })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Toggle pressed={sigFormData.signature_bold} onPressedChange={(v) => setSigFormData({ ...sigFormData, signature_bold: v })} size="sm" aria-label="Bold" className="h-8 w-8 p-0"><Bold className="h-4 w-4" /></Toggle>
                    <Toggle pressed={sigFormData.signature_italic} onPressedChange={(v) => setSigFormData({ ...sigFormData, signature_italic: v })} size="sm" aria-label="Italic" className="h-8 w-8 p-0"><Italic className="h-4 w-4" /></Toggle>
                  </div>
                </div>
              </>
            )}
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

        {/* === SECURITY TAB (with Data Management) === */}
        <TabsContent value="security" className="mt-4 space-y-4">
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

          {/* Data Management frame */}
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

        {/* === BILLING TAB (two distinct frames) === */}
        <TabsContent value="billing" className="mt-4 space-y-4">
          {/* Subscription Frame */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Subscription</h2>
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

          {/* Payment History Frame */}
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
