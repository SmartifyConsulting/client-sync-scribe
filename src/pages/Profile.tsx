import { useState, useEffect, useRef, useCallback } from "react";
import { User, Building2, Upload, Plus, Trash2, Users, Camera, Loader2, DollarSign, Pencil, X, Check, Phone, Copy, Clock, Mail, Save, Award, Volume2, UserPlus, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PatientImport } from "@/components/patients/PatientImport";
import { useToast as useGlobalToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const COUNTRY_CODES = [
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+267", country: "Botswana", flag: "🇧🇼" },
  { code: "+264", country: "Namibia", flag: "🇳🇦" },
  { code: "+268", country: "Eswatini", flag: "🇸🇿" },
  { code: "+266", country: "Lesotho", flag: "🇱🇸" },
  { code: "+258", country: "Mozambique", flag: "🇲🇿" },
  { code: "+263", country: "Zimbabwe", flag: "🇿🇼" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
];

const DOCTOR_SPECIALTIES = [
  "General Practitioner", "Allergist/Immunologist", "Anesthesiologist", "Cardiologist",
  "Dermatologist", "Emergency Medicine Physician", "Endocrinologist", "Family Medicine Physician",
  "Gastroenterologist", "Geriatrician", "Hematologist", "Infectious Disease Specialist",
  "Internist", "Nephrologist", "Neurologist", "Obstetrician/Gynecologist", "Oncologist",
  "Ophthalmologist", "Orthopedic Surgeon", "Otolaryngologist (ENT)", "Pathologist",
  "Pediatrician", "Physiatrist", "Plastic Surgeon", "Podiatrist", "Psychiatrist",
  "Psychologist", "Pulmonologist", "Radiologist", "Rheumatologist",
  "Sports Medicine Physician", "Surgeon (General)", "Urologist", "Vascular Surgeon",
];

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

const CURRENCIES = [
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "BWP", symbol: "P", name: "Botswana Pula" },
  { code: "NAD", symbol: "N$", name: "Namibian Dollar" },
  { code: "SZL", symbol: "E", name: "Swazi Lilangeni" },
  { code: "LSL", symbol: "M", name: "Lesotho Loti" },
];

const SIGNATURE_FONTS = [
  { value: "fave-script", label: "Fave Script Bold", fontFamily: "'Fave Script', 'Segoe Script', cursive", fontSize: "25px", fontWeight: "bold" },
  { value: "lucida-calligraphy", label: "Lucida Calligraphy", fontFamily: "'Lucida Calligraphy', 'Lucida Handwriting', 'Apple Chancery', cursive", fontSize: "16px", fontWeight: "normal" },
  { value: "rastanty-cortez", label: "Rastanty Cortez", fontFamily: "'Rastanty Cortez', 'Brush Script MT', cursive", fontSize: "28px", fontWeight: "bold" },
  { value: "rochester", label: "Rochester", fontFamily: "'Rochester', cursive", fontSize: "18px", fontWeight: "normal" },
  { value: "edwardian-script", label: "Edwardian Script", fontFamily: "'Edwardian Script ITC', 'Segoe Script', cursive", fontSize: "26px", fontWeight: "bold" },
];

interface Partner {
  id: string;
  full_name: string;
  registration_number: string;
  mobile_number: string;
}

interface ServicePrice {
  id: string;
  service_name: string;
  default_price: number;
  currency: string;
  is_first_consultation?: boolean;
}

interface CPDCertificate {
  id: string;
  certificate_name: string;
  issuing_body: string | null;
  date_earned: string;
  cpd_points: number;
  certificate_url: string | null;
}

export default function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { profile, loading, fetchProfile, updateProfile, uploadLogo } = useProfile();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [newPartner, setNewPartner] = useState({ full_name: "", registration_number: "", mobile_number: "", email: "" });
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [showAddPartnerForm, setShowAddPartnerForm] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [editingPartner, setEditingPartner] = useState({ full_name: "", registration_number: "", mobile_number: "" });
  const [isSavingPartner, setIsSavingPartner] = useState(false);
  const [savedStatus, setSavedStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialized = useRef(false);
  const isSettingFromProfile = useRef(false);
  const profileLoadedData = useRef<typeof formData | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [newService, setNewService] = useState({ service_name: "", default_price: "", currency: "ZAR" });
  const [isAddingService, setIsAddingService] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("ZAR");
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState({ service_name: "", default_price: "" });
  const [isSavingService, setIsSavingService] = useState(false);

  // CPD state
  const [certs, setCerts] = useState<CPDCertificate[]>([]);
  const [certsLoading, setCertsLoading] = useState(true);
  const [showCertForm, setShowCertForm] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [certSaving, setCertSaving] = useState(false);
  const [certUploading, setCertUploading] = useState(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const certFileInputRef = useRef<HTMLInputElement>(null);
  const [certForm, setCertForm] = useState({ certificate_name: "", issuing_body: "", date_earned: "", cpd_points: "" });

  const [formData, setFormData] = useState({
    first_name: "", last_name: "", practice_number: "", doctor_number: "",
    practice_address: "", specialty: "", mobile_number: "", country_code: "+27",
    signature_font: "fave-script", signature_color: "black",
  });

  useEffect(() => {
    if (profile) {
      let countryCode = "+27";
      let mobileNumber = (profile as any).mobile_number || "";
      const matchedCode = COUNTRY_CODES.find(c => mobileNumber.startsWith(c.code));
      if (matchedCode) { countryCode = matchedCode.code; mobileNumber = mobileNumber.replace(matchedCode.code, "").trim(); }
      const fullName = profile.full_name || "";
      const spaceIdx = fullName.indexOf(" ");
      const firstName = spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName;
      const lastName = spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : "";
      const newFormData = {
        first_name: firstName, last_name: lastName,
        practice_number: profile.practice_number || "", doctor_number: profile.doctor_number || "",
        practice_address: profile.practice_address || "", specialty: (profile as any).specialty || "",
        mobile_number: mobileNumber, country_code: countryCode,
        signature_font: (profile as any).signature_font || "fave-script",
        signature_color: ((profile as any).signature_color === 'navy' ? 'teal' : (profile as any).signature_color) || "black",
      };
      isSettingFromProfile.current = true;
      profileLoadedData.current = newFormData;
      setFormData(newFormData);
      requestAnimationFrame(() => { hasInitialized.current = true; isSettingFromProfile.current = false; });
    }
  }, [profile]);

  const combinedFullName = `${formData.first_name} ${formData.last_name}`.trim();

  useEffect(() => {
    if (!hasInitialized.current || !user || isSettingFromProfile.current) return;
    if (profileLoadedData.current && JSON.stringify(formData) === JSON.stringify(profileLoadedData.current)) {
      profileLoadedData.current = null; return;
    }
    profileLoadedData.current = null;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setSavedStatus('saving');
      const fullMobileNumber = formData.mobile_number ? `${formData.country_code}${formData.mobile_number.replace(/^0+/, '')}` : "";
      const { error } = await updateProfile({
        full_name: combinedFullName, practice_number: formData.practice_number,
        doctor_number: formData.doctor_number, practice_address: formData.practice_address,
        specialty: formData.specialty, mobile_number: fullMobileNumber,
        signature_font: formData.signature_font, signature_color: formData.signature_color,
      } as any);
      if (error) { setSavedStatus('idle'); toast({ title: "Error", description: "Failed to save profile changes", variant: "destructive" }); }
      else { setSavedStatus('saved'); setTimeout(() => setSavedStatus('idle'), 2000); }
    }, 1500);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [formData]);

  const totalCpdPoints = certs.reduce((sum, c) => sum + (c.cpd_points || 0), 0);

  const fetchCerts = async () => {
    setCertsLoading(true);
    const { data, error } = await supabase.from("cpd_certificates").select("*").eq("user_id", user!.id).order("date_earned", { ascending: false });
    if (!error && data) setCerts(data as any);
    setCertsLoading(false);
  };

  const uploadCertificateFile = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("cpd-certificates").upload(filePath, file);
    if (error) { toast({ title: "Upload Error", description: error.message, variant: "destructive" }); return null; }
    const { data: urlData } = supabase.storage.from("cpd-certificates").getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleCertSave = async () => {
    if (!user || !certForm.certificate_name.trim() || !certForm.date_earned) {
      toast({ title: "Required", description: "Certificate name and date are required", variant: "destructive" }); return;
    }
    setCertSaving(true);
    let certificateUrl: string | null = null;
    if (certificateFile) { setCertUploading(true); certificateUrl = await uploadCertificateFile(certificateFile); setCertUploading(false); }
    const record: any = {
      certificate_name: certForm.certificate_name, issuing_body: certForm.issuing_body || null,
      date_earned: certForm.date_earned, cpd_points: parseInt(certForm.cpd_points) || 0,
    };
    if (certificateUrl) record.certificate_url = certificateUrl;
    if (editingCertId) {
      const { error } = await supabase.from("cpd_certificates").update(record).eq("id", editingCertId);
      if (error) toast({ title: "Error", description: "Failed to update", variant: "destructive" });
      else toast({ title: "Updated", description: "Certificate updated" });
    } else {
      const { error } = await supabase.from("cpd_certificates").insert({ ...record, user_id: user.id });
      if (error) toast({ title: "Error", description: "Failed to add", variant: "destructive" });
      else toast({ title: "Added", description: "Certificate added" });
    }
    setCertSaving(false); setShowCertForm(false); setEditingCertId(null);
    setCertForm({ certificate_name: "", issuing_body: "", date_earned: "", cpd_points: "" });
    setCertificateFile(null); fetchCerts();
  };

  const handleCertEdit = (cert: CPDCertificate) => {
    setEditingCertId(cert.id);
    setCertForm({ certificate_name: cert.certificate_name, issuing_body: cert.issuing_body || "", date_earned: cert.date_earned, cpd_points: String(cert.cpd_points) });
    setCertificateFile(null); setShowCertForm(true);
  };

  const handleCertDelete = async (id: string) => {
    const { error } = await supabase.from("cpd_certificates").delete().eq("id", id);
    if (!error) { setCerts(certs.filter(c => c.id !== id)); toast({ title: "Removed", description: "Certificate removed" }); }
  };

  useEffect(() => {
    if (user) { fetchPartners(); fetchServicePrices(); fetchCerts(); }
  }, [user]);

  // --- Service price functions ---
  const fetchServicePrices = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('service_prices').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    if (!error && data) {
      setServicePrices(data);
      if (data.length > 0) { setSelectedCurrency(data[0].currency); setNewService(prev => ({ ...prev, currency: data[0].currency })); }
    }
  };
  const addServicePrice = async () => {
    if (!user || !newService.service_name.trim() || !newService.default_price) { toast({ title: "Missing fields", description: "Service name and price are required", variant: "destructive" }); return; }
    setIsAddingService(true);
    const { data, error } = await supabase.from('service_prices').insert({ user_id: user.id, service_name: newService.service_name, default_price: parseFloat(newService.default_price), currency: selectedCurrency, is_first_consultation: false } as any).select().single();
    if (error) toast({ title: "Error", description: "Failed to add service", variant: "destructive" });
    else { setServicePrices([...servicePrices, data]); setNewService({ service_name: "", default_price: "", currency: selectedCurrency }); toast({ title: "Service added" }); }
    setIsAddingService(false);
  };
  const removeServicePrice = async (id: string) => {
    const { error } = await supabase.from('service_prices').delete().eq('id', id);
    if (!error) { setServicePrices(servicePrices.filter(s => s.id !== id)); toast({ title: "Service removed" }); }
  };
  const startEditingService = (service: ServicePrice) => { setEditingServiceId(service.id); setEditingService({ service_name: service.service_name, default_price: String(service.default_price) }); };
  const cancelEditingService = () => { setEditingServiceId(null); setEditingService({ service_name: "", default_price: "" }); };
  const saveEditingService = async () => {
    if (!editingServiceId || !editingService.service_name.trim() || !editingService.default_price) { toast({ title: "Missing fields", description: "Service name and price are required", variant: "destructive" }); return; }
    setIsSavingService(true);
    const { error } = await supabase.from('service_prices').update({ service_name: editingService.service_name, default_price: parseFloat(editingService.default_price) }).eq('id', editingServiceId);
    if (error) toast({ title: "Error", description: "Failed to update service", variant: "destructive" });
    else { setServicePrices(servicePrices.map(s => s.id === editingServiceId ? { ...s, service_name: editingService.service_name, default_price: parseFloat(editingService.default_price) } : s)); setEditingServiceId(null); toast({ title: "Service updated" }); }
    setIsSavingService(false);
  };
  const updateAllServicesCurrency = async (newCurrency: string) => {
    if (!user || servicePrices.length === 0) { setSelectedCurrency(newCurrency); setNewService(prev => ({ ...prev, currency: newCurrency })); return; }
    const { error } = await supabase.from('service_prices').update({ currency: newCurrency }).eq('user_id', user.id);
    if (!error) { setServicePrices(servicePrices.map(s => ({ ...s, currency: newCurrency }))); setSelectedCurrency(newCurrency); setNewService(prev => ({ ...prev, currency: newCurrency })); toast({ title: "Currency updated" }); }
  };
  const getCurrencySymbol = (code: string) => CURRENCIES.find(c => c.code === code)?.symbol || code;

  // --- Partner functions ---
  const fetchPartners = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('practice_partners').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    if (!error && data) setPartners(data);
  };
  const addPartner = async () => {
    if (!user || !newPartner.full_name.trim() || !newPartner.registration_number.trim() || !newPartner.email.trim()) {
      toast({ title: "Missing fields", description: "Partner name, registration number, and email are required", variant: "destructive" }); return;
    }
    setIsAddingPartner(true);
    const { data, error } = await supabase.from('practice_partners').insert({ user_id: user.id, full_name: newPartner.full_name, registration_number: newPartner.registration_number, mobile_number: newPartner.mobile_number || null, email: newPartner.email.trim() } as any).select().single();
    if (error) toast({ title: "Error", description: "Failed to add partner", variant: "destructive" });
    else {
      setPartners([...partners, data]);
      try {
        await supabase.functions.invoke('send-user-invitation', { body: { recipientEmail: newPartner.email.trim(), senderName: profile?.full_name || 'A colleague', message: 'You have been added as a practice partner. Join the platform to collaborate.', isPracticePartner: true, partnerName: newPartner.full_name } });
        toast({ title: "Partner added & invited", description: `${newPartner.full_name} has been added and an invitation was sent` });
      } catch { toast({ title: "Partner added", description: `${newPartner.full_name} has been added` }); }
      setNewPartner({ full_name: "", registration_number: "", mobile_number: "", email: "" }); setShowAddPartnerForm(false);
    }
    setIsAddingPartner(false);
  };
  const removePartner = async (id: string) => {
    const { error } = await supabase.from('practice_partners').delete().eq('id', id);
    if (!error) { setPartners(partners.filter(p => p.id !== id)); toast({ title: "Partner removed" }); }
  };
  const startEditingPartner = (partner: Partner) => { setEditingPartnerId(partner.id); setEditingPartner({ full_name: partner.full_name, registration_number: partner.registration_number, mobile_number: partner.mobile_number || "" }); };
  const cancelEditingPartner = () => { setEditingPartnerId(null); };
  const saveEditingPartner = async () => {
    if (!editingPartnerId || !editingPartner.full_name.trim() || !editingPartner.registration_number.trim()) { toast({ title: "Missing fields", variant: "destructive" }); return; }
    setIsSavingPartner(true);
    const { error } = await supabase.from('practice_partners').update({ full_name: editingPartner.full_name, registration_number: editingPartner.registration_number, mobile_number: editingPartner.mobile_number || null }).eq('id', editingPartnerId);
    if (error) toast({ title: "Error", variant: "destructive" });
    else { setPartners(partners.map(p => p.id === editingPartnerId ? { ...p, ...editingPartner } : p)); setEditingPartnerId(null); toast({ title: "Partner updated" }); }
    setIsSavingPartner(false);
  };

  // --- Upload handlers ---
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: "Invalid file type", variant: "destructive" }); return; }
    setIsUploadingLogo(true);
    const { error } = await uploadLogo(file); setIsUploadingLogo(false);
    if (error) toast({ title: "Upload failed", variant: "destructive" });
    else { toast({ title: "Logo uploaded" }); isSettingFromProfile.current = true; await fetchProfile(); setTimeout(() => { isSettingFromProfile.current = false; }, 200); }
  };
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast({ title: "Invalid file type", variant: "destructive" }); return; }
    setIsUploadingAvatar(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) { toast({ title: "Upload failed", variant: "destructive" }); setIsUploadingAvatar(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: `${publicUrl}?t=${Date.now()}` }).eq('id', user.id);
    setIsUploadingAvatar(false);
    if (updateError) toast({ title: "Error", variant: "destructive" });
    else { toast({ title: "Profile picture updated" }); isSettingFromProfile.current = true; await fetchProfile(); setTimeout(() => { isSettingFromProfile.current = false; }, 200); }
  };
  const handleSaveEmail = async () => {
    if (!user || !editEmail.trim()) return;
    setIsSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: editEmail.trim() }); setIsSavingEmail(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Email updated", description: "A confirmation email has been sent" }); setIsEditingEmail(false); }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getSignatureFontFamily = (v: string) => SIGNATURE_FONTS.find(f => f.value === v)?.fontFamily || SIGNATURE_FONTS[0].fontFamily;
  const getSignatureFontSize = (v: string) => SIGNATURE_FONTS.find(f => f.value === v)?.fontSize || '20px';
  const getSignatureFontWeight = (v: string) => SIGNATURE_FONTS.find(f => f.value === v)?.fontWeight || 'normal';

  const isDoctor = profile?.role === 'doctor' || (!profile?.role && !isAdmin);
  const isPatient = profile?.role === 'patient';

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your personal and practice information</p>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-1.5">
          {savedStatus === 'saving' && <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Saving...</span></>}
          {savedStatus === 'saved' && <><Check className="h-3.5 w-3.5 text-success" /><span className="text-success">Saved</span></>}
        </div>
      </div>

      {/* Profile Picture - always visible */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar className="h-16 w-16 border-2 border-border">
              <AvatarImage src={(profile as any)?.avatar_url} alt={combinedFullName || "Profile"} />
              <AvatarFallback className="text-base bg-primary/10 text-primary">{combinedFullName ? getInitials(combinedFullName) : "U"}</AvatarFallback>
            </Avatar>
            <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="h-5 w-5 text-white" />
            </label>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" id="avatar-upload" disabled={isUploadingAvatar} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{combinedFullName || "Your Name"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {isUploadingAvatar && <p className="text-xs text-muted-foreground">Uploading...</p>}
          </div>
          {isDoctor && totalCpdPoints > 0 && (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 shrink-0">
              <Award className="h-3.5 w-3.5 text-amber-600" />
              {totalCpdPoints} CPD pts
            </Badge>
          )}
        </div>
      </div>

      {/* Tabbed content */}
      {isPatient ? (
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-primary">
            <TabsTrigger value="personal" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">Personal</TabsTrigger>
            <TabsTrigger value="preferences" className="data-[state=active]:bg-white data-[state=active]:text-black text-white">Preferences</TabsTrigger>
          </TabsList>
          <TabsContent value="personal">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled className="bg-muted" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Mobile Number</Label>
                <div className="flex gap-2">
                  <Select value={formData.country_code} onValueChange={(v) => setFormData({ ...formData, country_code: v })}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRY_CODES.map(c => <SelectItem key={c.code} value={c.code}><span className="flex items-center gap-1.5">{c.flag} {c.code}</span></SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="tel" value={formatPhoneNumber(formData.mobile_number)} onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/[^0-9]/g, '') })} placeholder="82 123 4567" className="flex-1" />
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="preferences">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
              <AutoEmailToggle label="Auto-email invoice to medical aid" description="When your doctor marks an invoice as paid, it will be sent to your insurance claims email." checked={(profile as any)?.auto_email_invoice_to_insurance || false} onCheckedChange={async (c) => { await updateProfile({ auto_email_invoice_to_insurance: c } as any); toast({ title: "Preference updated" }); }} />
              <AutoEmailToggle label="Auto-email prescription to pharmacy" description="When your doctor saves a prescription, it will be sent to your primary pharmacy." checked={(profile as any)?.auto_email_prescription_to_pharmacy || false} onCheckedChange={async (c) => { await updateProfile({ auto_email_prescription_to_pharmacy: c } as any); toast({ title: "Preference updated" }); }} />
              <AutoEmailToggle label="Auto-email certificate to employer" description="When your doctor saves a medical certificate, it will be sent to your employer." checked={(profile as any)?.auto_email_certificate_to_employer || false} onCheckedChange={async (c) => { await updateProfile({ auto_email_certificate_to_employer: c } as any); toast({ title: "Preference updated" }); }} />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="practice">Practice</TabsTrigger>
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="certificates">Certificates{totalCpdPoints > 0 ? ` (${totalCpdPoints})` : ""}</TabsTrigger>
          </TabsList>

          {/* === PERSONAL TAB === */}
          <TabsContent value="personal">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Email</Label>
                  {isAdmin && isEditingEmail ? (
                    <div className="flex gap-2">
                      <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                      <Button size="icon" variant="ghost" onClick={handleSaveEmail} disabled={isSavingEmail}>{isSavingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</Button>
                      <Button size="icon" variant="ghost" onClick={() => setIsEditingEmail(false)}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input type="email" value={user?.email || ""} disabled className="bg-muted" />
                      {isAdmin && <Button size="icon" variant="ghost" onClick={() => { setEditEmail(user?.email || ""); setIsEditingEmail(true); }}><Pencil className="h-4 w-4" /></Button>}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Mobile Number</Label>
                <div className="flex gap-2">
                  <Select value={formData.country_code} onValueChange={(v) => setFormData({ ...formData, country_code: v })}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRY_CODES.map(c => <SelectItem key={c.code} value={c.code}><span className="flex items-center gap-1.5">{c.flag} {c.code}</span></SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="tel" value={formatPhoneNumber(formData.mobile_number)} onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/[^0-9]/g, '') })} placeholder="82 123 4567" className="flex-1" />
                </div>
              </div>
              <MailboxSection userId={user?.id} />
            </div>
          </TabsContent>

          {/* === PRACTICE TAB === */}
          <TabsContent value="practice">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
              <p className="text-sm text-muted-foreground">This information appears on your document templates and letterheads.</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Practice Number</Label>
                  <Input value={formData.practice_number} onChange={(e) => setFormData({ ...formData, practice_number: e.target.value })} placeholder="e.g., PR123456" />
                </div>
                <div className="space-y-1.5">
                  <Label>Registration Number</Label>
                  <Input value={formData.doctor_number} onChange={(e) => setFormData({ ...formData, doctor_number: e.target.value })} placeholder="e.g., MP123456" />
                </div>
                <div className="space-y-1.5">
                  <Label>Specialty</Label>
                  <Select value={formData.specialty} onValueChange={(v) => setFormData({ ...formData, specialty: v })}>
                    <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                    <SelectContent>{DOCTOR_SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Address of Doctor's Rooms</Label>
                <Textarea value={formData.practice_address} onChange={(e) => setFormData({ ...formData, practice_address: e.target.value })} placeholder="e.g., 123 Medical Centre, Suite 4, Cape Town" rows={2} />
              </div>

              {/* Logo */}
              <div className="space-y-1.5">
                <Label>Practice Logo</Label>
                <div className="flex items-center gap-3">
                  {profile?.logo_url && <img src={profile.logo_url} alt="Practice logo" className="h-12 w-auto object-contain rounded border border-border p-1" />}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload-profile" />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('logo-upload-profile')?.click()} disabled={isUploadingLogo} className="gap-1.5">
                    <Upload className="h-3.5 w-3.5" />{isUploadingLogo ? "Uploading..." : profile?.logo_url ? "Change" : "Upload"}
                  </Button>
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <Label>Digital Signature</Label>
                <div className="p-3 border border-border rounded-lg bg-background">
                  <p style={{ fontFamily: getSignatureFontFamily(formData.signature_font), color: formData.signature_color === 'teal' ? '#104861' : '#000000', fontSize: getSignatureFontSize(formData.signature_font), fontWeight: getSignatureFontWeight(formData.signature_font) as any }}>{combinedFullName || "Your Name"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Font</Label>
                    <Select value={formData.signature_font} onValueChange={(v) => setFormData({ ...formData, signature_font: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SIGNATURE_FONTS.map(f => <SelectItem key={f.value} value={f.value}><span style={{ fontFamily: f.fontFamily, fontSize: f.fontSize, fontWeight: f.fontWeight as any }}>{f.label}</span></SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Color</Label>
                    <Select value={formData.signature_color} onValueChange={(v) => setFormData({ ...formData, signature_color: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="black"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-black border border-border" />Black</span></SelectItem>
                        <SelectItem value="teal"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: '#104861' }} />Teal</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Country, Language, Voice */}
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
          </TabsContent>

          {/* === PARTNERS TAB === */}
          <TabsContent value="partners">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Add partners of the same practice. Their information will be available on documents.</p>
                {!showAddPartnerForm && <Button variant="outline" size="sm" onClick={() => setShowAddPartnerForm(true)} className="gap-1.5 shrink-0"><Plus className="h-3.5 w-3.5" />Add Partner</Button>}
              </div>
              {partners.length > 0 && (
                <div className="space-y-2">
                  {partners.map((partner) => (
                    <div key={partner.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      {editingPartnerId === partner.id ? (
                        <div className="flex-1 grid gap-2 sm:grid-cols-3 mr-3">
                          <Input value={editingPartner.full_name} onChange={(e) => setEditingPartner({ ...editingPartner, full_name: e.target.value })} placeholder="Full name" />
                          <Input value={editingPartner.registration_number} onChange={(e) => setEditingPartner({ ...editingPartner, registration_number: e.target.value })} placeholder="Registration number" />
                          <Input value={editingPartner.mobile_number} onChange={(e) => setEditingPartner({ ...editingPartner, mobile_number: e.target.value })} placeholder="Mobile (optional)" />
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-sm text-foreground">{partner.full_name}</p>
                          <p className="text-xs text-muted-foreground">Reg: {partner.registration_number}{partner.mobile_number && ` · ${partner.mobile_number}`}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-0.5">
                        {editingPartnerId === partner.id ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={saveEditingPartner} disabled={isSavingPartner} className="h-7 w-7 text-success">{isSavingPartner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}</Button>
                            <Button variant="ghost" size="icon" onClick={cancelEditingPartner} className="h-7 w-7"><X className="h-3.5 w-3.5" /></Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => startEditingPartner(partner)} className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" title="Invite" onClick={async () => {
                              const partnerEmail = (partner as any).email;
                              if (!partnerEmail) { toast({ title: "No email", variant: "destructive" }); return; }
                              try { await supabase.functions.invoke('send-user-invitation', { body: { recipientEmail: partnerEmail, senderName: profile?.full_name || 'A colleague', message: 'You have been invited to join Holarc as a practice partner.', isPracticePartner: true, partnerName: partner.full_name } }); toast({ title: "Invitation sent" }); } catch { toast({ title: "Error", variant: "destructive" }); }
                            }} className="h-7 w-7 text-primary"><UserPlus className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => removePartner(partner.id)} className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showAddPartnerForm && (
                <div className="space-y-3 p-3 border border-dashed border-border rounded-lg">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5"><Label>Full Name *</Label><Input value={newPartner.full_name} onChange={(e) => setNewPartner({ ...newPartner, full_name: e.target.value })} placeholder="Dr. Jane Doe" /></div>
                    <div className="space-y-1.5"><Label>Registration Number *</Label><Input value={newPartner.registration_number} onChange={(e) => setNewPartner({ ...newPartner, registration_number: e.target.value })} placeholder="e.g., MP654321" /></div>
                    <div className="space-y-1.5"><Label>Mobile (Optional)</Label><Input value={newPartner.mobile_number} onChange={(e) => setNewPartner({ ...newPartner, mobile_number: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={newPartner.email} onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })} placeholder="partner@example.com" /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addPartner} disabled={isAddingPartner} className="gap-1.5"><Save className="h-3.5 w-3.5" />{isAddingPartner ? "Saving..." : "Save"}</Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowAddPartnerForm(false); setNewPartner({ full_name: "", registration_number: "", mobile_number: "", email: "" }); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* === PRICING TAB === */}
          <TabsContent value="pricing">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
              <p className="text-sm text-muted-foreground">Define your service types and default prices for invoicing.</p>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={selectedCurrency} onValueChange={updateAllServicesCurrency}>
                  <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol} - {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {servicePrices.length > 0 && (
                <div className="space-y-2">
                  {servicePrices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      {editingServiceId === service.id ? (
                        <div className="flex-1 grid gap-2 sm:grid-cols-2 mr-3">
                          <Input value={editingService.service_name} onChange={(e) => setEditingService({ ...editingService, service_name: e.target.value })} />
                          <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{getCurrencySymbol(selectedCurrency)}</span><Input type="number" step="0.01" min="0" value={editingService.default_price} onChange={(e) => setEditingService({ ...editingService, default_price: e.target.value })} className="pl-8" /></div>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-foreground">{service.service_name}</p>
                            {(service as any).is_first_consultation && <Badge variant="secondary" className="text-xs">1st Consult</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{getCurrencySymbol(service.currency)} {Number(service.default_price).toFixed(2)}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-0.5">
                        {editingServiceId === service.id ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={saveEditingService} disabled={isSavingService} className="h-7 w-7 text-success">{isSavingService ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}</Button>
                            <Button variant="ghost" size="icon" onClick={cancelEditingService} className="h-7 w-7"><X className="h-3.5 w-3.5" /></Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" title={(service as any).is_first_consultation ? "Remove first consult" : "Set as first consult"} onClick={async () => {
                              if (!(service as any).is_first_consultation) { const f = servicePrices.find((s: any) => s.is_first_consultation); if (f) await supabase.from('service_prices').update({ is_first_consultation: false } as any).eq('id', f.id); }
                              const nv = !(service as any).is_first_consultation;
                              await supabase.from('service_prices').update({ is_first_consultation: nv } as any).eq('id', service.id);
                              setServicePrices(servicePrices.map(s => ({ ...s, is_first_consultation: s.id === service.id ? nv : (nv ? false : (s as any).is_first_consultation) })));
                              toast({ title: nv ? "First consultation fee set" : "Removed" });
                            }} className={cn("h-7 w-7", (service as any).is_first_consultation ? "text-primary" : "text-muted-foreground")}><Award className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => startEditingService(service)} className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => removeServicePrice(service.id)} className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3 p-3 border border-dashed border-border rounded-lg">
                <p className="text-sm font-medium text-foreground">Add New Service</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Service Name *</Label><Input value={newService.service_name} onChange={(e) => setNewService({ ...newService, service_name: e.target.value })} placeholder="e.g., Consultation" /></div>
                  <div className="space-y-1.5">
                    <Label>Price ({getCurrencySymbol(selectedCurrency)}) *</Label>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol(selectedCurrency)}</span><Input type="number" step="0.01" min="0" value={newService.default_price} onChange={(e) => setNewService({ ...newService, default_price: e.target.value })} className="pl-8" /></div>
                  </div>
                </div>
                <Button size="sm" onClick={addServicePrice} disabled={isAddingService} className="gap-1.5"><Plus className="h-3.5 w-3.5" />{isAddingService ? "Adding..." : "Add Service"}</Button>
              </div>
            </div>
          </TabsContent>

          {/* === CERTIFICATES TAB === */}
          <TabsContent value="certificates">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Track your continuing professional development certificates and CPD points.</p>
                <Button size="sm" onClick={() => { setShowCertForm(true); setEditingCertId(null); setCertForm({ certificate_name: "", issuing_body: "", date_earned: "", cpd_points: "" }); setCertificateFile(null); }} className="gap-1.5 shrink-0"><Plus className="h-3.5 w-3.5" />Add Certificate</Button>
              </div>

              {showCertForm && (
                <div className="space-y-3 p-3 border border-dashed border-border rounded-lg">
                  <p className="text-sm font-medium">{editingCertId ? "Edit" : "Add"} Certificate</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5"><Label>Certificate Name *</Label><Input value={certForm.certificate_name} onChange={(e) => setCertForm({ ...certForm, certificate_name: e.target.value })} placeholder="e.g., Advanced Cardiac Life Support" /></div>
                    <div className="space-y-1.5"><Label>Issuing Body</Label><Input value={certForm.issuing_body} onChange={(e) => setCertForm({ ...certForm, issuing_body: e.target.value })} placeholder="e.g., HPCSA" /></div>
                    <div className="space-y-1.5"><Label>Date Earned *</Label><Input type="date" value={certForm.date_earned} onChange={(e) => setCertForm({ ...certForm, date_earned: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>CPD Points</Label><Input type="number" min="0" value={certForm.cpd_points} onChange={(e) => setCertForm({ ...certForm, cpd_points: e.target.value })} /></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Attach Certificate</Label>
                    <div className="flex items-center gap-2">
                      <input ref={certFileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => setCertificateFile(e.target.files?.[0] || null)} />
                      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => certFileInputRef.current?.click()}><Upload className="h-3.5 w-3.5" />{certificateFile ? certificateFile.name : "Choose File"}</Button>
                      {certificateFile && <Button type="button" variant="ghost" size="sm" onClick={() => setCertificateFile(null)}>Remove</Button>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCertSave} disabled={certSaving || certUploading}>{(certSaving || certUploading) && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}{certUploading ? "Uploading..." : editingCertId ? "Update" : "Save"}</Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowCertForm(false); setEditingCertId(null); setCertificateFile(null); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {certsLoading ? (
                <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></div>
              ) : certs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No certificates recorded yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Certificate</TableHead>
                      <TableHead>Issuing Body</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Points</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certs.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium text-sm">{cert.certificate_name}</TableCell>
                        <TableCell className="text-sm">{cert.issuing_body || "-"}</TableCell>
                        <TableCell className="text-sm">{format(new Date(cert.date_earned), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-center"><Badge variant="outline">{cert.cpd_points}</Badge></TableCell>
                        <TableCell>
                          {cert.certificate_url ? (
                            <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" />View</a>
                          ) : <span className="text-muted-foreground text-xs">-</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCertEdit(cert)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleCertDelete(cert.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <PatientImport />
    </div>
  );
}

function AutoEmailToggle({ label, description, checked, onCheckedChange }: { label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
      <div className="flex-1 mr-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
}

function MailboxSection({ userId }: { userId?: string }) {
  const [mailboxId, setMailboxId] = useState<string | null>(null);
  const [mailboxAlias, setMailboxAlias] = useState<string>("");
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [isSavingAlias, setIsSavingAlias] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useGlobalToast();

  useEffect(() => {
    const fetchMailboxInfo = async () => {
      if (!userId) return;
      const { data: profile } = await supabase.from('profiles').select('mailbox_id, mailbox_alias').eq('id', userId).single();
      if (profile) { setMailboxId(profile.mailbox_id); setMailboxAlias(profile.mailbox_alias || ""); }
    };
    fetchMailboxInfo();
  }, [userId]);

  const displayEmail = mailboxAlias ? `${mailboxAlias}@holarc.com` : mailboxId ? `docs-${mailboxId.slice(0, 8)}@inbox.holarc.health` : null;
  const handleCopy = async () => { if (!displayEmail) return; await navigator.clipboard.writeText(displayEmail); setCopied(true); toast({ title: "Copied" }); setTimeout(() => setCopied(false), 2000); };
  const handleSaveAlias = async () => {
    if (!userId) return;
    const cleanAlias = aliasInput.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
    if (cleanAlias.length < 3) { toast({ title: "Invalid alias", description: "At least 3 characters", variant: "destructive" }); return; }
    if (cleanAlias.length > 30) { toast({ title: "Invalid alias", description: "30 characters max", variant: "destructive" }); return; }
    setIsSavingAlias(true);
    const { error } = await supabase.from('profiles').update({ mailbox_alias: cleanAlias }).eq('id', userId);
    setIsSavingAlias(false);
    if (error) { toast({ title: error.code === '23505' ? "Alias taken" : "Error", description: error.code === '23505' ? `"${cleanAlias}@holarc.com" is already in use` : "Failed to save", variant: "destructive" }); }
    else { setMailboxAlias(cleanAlias); setEditingAlias(false); toast({ title: "Alias saved", description: `${cleanAlias}@holarc.com` }); }
  };

  return (
    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Upload className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">Document Mailbox</p>
          <p className="text-xs text-muted-foreground mt-0.5">External parties can email documents to this address.</p>
          {displayEmail ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-foreground border border-border truncate">{displayEmail}</code>
                <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7 shrink-0">{copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}</Button>
              </div>
              {!mailboxAlias && (editingAlias ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0 flex-1">
                    <Input value={aliasInput} onChange={(e) => setAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="your-name" className="rounded-r-none max-w-[160px] h-8 text-sm" />
                    <span className="px-2 py-1.5 border border-l-0 border-border rounded-r-lg bg-muted text-xs text-muted-foreground">@holarc.com</span>
                  </div>
                  <Button size="sm" className="h-8" onClick={handleSaveAlias} disabled={isSavingAlias}>{isSavingAlias ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}</Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingAlias(false)}>Cancel</Button>
                </div>
              ) : <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setEditingAlias(true); setAliasInput(""); }}>Set custom alias</Button>)}
            </div>
          ) : <p className="text-xs text-muted-foreground mt-1">Loading...</p>}
        </div>
      </div>
    </div>
  );
}
