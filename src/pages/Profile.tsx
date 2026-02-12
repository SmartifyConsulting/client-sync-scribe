import { useState, useEffect, useRef, useCallback } from "react";
import { User, Building2, Upload, Plus, Trash2, Users, Camera, Loader2, DollarSign, Pencil, X, Check, Phone, Copy, Clock, Mail, Save } from "lucide-react";
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
  "General Practitioner",
  "Allergist/Immunologist",
  "Anesthesiologist",
  "Cardiologist",
  "Dermatologist",
  "Emergency Medicine Physician",
  "Endocrinologist",
  "Family Medicine Physician",
  "Gastroenterologist",
  "Geriatrician",
  "Hematologist",
  "Infectious Disease Specialist",
  "Internist",
  "Nephrologist",
  "Neurologist",
  "Obstetrician/Gynecologist",
  "Oncologist",
  "Ophthalmologist",
  "Orthopedic Surgeon",
  "Otolaryngologist (ENT)",
  "Pathologist",
  "Pediatrician",
  "Physiatrist",
  "Plastic Surgeon",
  "Podiatrist",
  "Psychiatrist",
  "Psychologist",
  "Pulmonologist",
  "Radiologist",
  "Rheumatologist",
  "Sports Medicine Physician",
  "Surgeon (General)",
  "Urologist",
  "Vascular Surgeon",
];

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
  
  // Partner editing state
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [editingPartner, setEditingPartner] = useState({ full_name: "", registration_number: "", mobile_number: "" });
  const [isSavingPartner, setIsSavingPartner] = useState(false);
  
  // Autosave state
  const [savedStatus, setSavedStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);
  const isSettingFromProfile = useRef(false);
  
  // Admin email editing
  const [editEmail, setEditEmail] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  
  // Pricing state
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [newService, setNewService] = useState({ service_name: "", default_price: "", currency: "ZAR" });
  const [isAddingService, setIsAddingService] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("ZAR");
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState({ service_name: "", default_price: "" });
  const [isSavingService, setIsSavingService] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    practice_number: "",
    doctor_number: "",
    practice_address: "",
    specialty: "",
    mobile_number: "",
    country_code: "+27",
    signature_font: "fave-script",
    signature_color: "black",
  });

  useEffect(() => {
    if (profile) {
      // Parse existing mobile number if it has a country code
      let countryCode = "+27";
      let mobileNumber = (profile as any).mobile_number || "";
      
      const matchedCode = COUNTRY_CODES.find(c => mobileNumber.startsWith(c.code));
      if (matchedCode) {
        countryCode = matchedCode.code;
        mobileNumber = mobileNumber.replace(matchedCode.code, "").trim();
      }

      // Split full_name into first and last
      const fullName = profile.full_name || "";
      const spaceIdx = fullName.indexOf(" ");
      const firstName = spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName;
      const lastName = spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : "";
      
      isSettingFromProfile.current = true;
      setFormData({
        first_name: firstName,
        last_name: lastName,
        practice_number: profile.practice_number || "",
        doctor_number: profile.doctor_number || "",
        practice_address: profile.practice_address || "",
        specialty: (profile as any).specialty || "",
        mobile_number: mobileNumber,
        country_code: countryCode,
        signature_font: (profile as any).signature_font || "fave-script",
        signature_color: ((profile as any).signature_color === 'navy' ? 'teal' : (profile as any).signature_color) || "black",
      });
      
      // Mark as initialized after profile loads
      setTimeout(() => {
        hasInitialized.current = true;
        isSettingFromProfile.current = false;
      }, 100);
    }
  }, [profile]);

  const combinedFullName = `${formData.first_name} ${formData.last_name}`.trim();

  // Autosave effect
  useEffect(() => {
    if (!hasInitialized.current || !user || isSettingFromProfile.current) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setSavedStatus('saving');
      
      const fullMobileNumber = formData.mobile_number 
        ? `${formData.country_code}${formData.mobile_number.replace(/^0+/, '')}` 
        : "";
      
      const { error } = await updateProfile({
        full_name: combinedFullName,
        practice_number: formData.practice_number,
        doctor_number: formData.doctor_number,
        practice_address: formData.practice_address,
        specialty: formData.specialty,
        mobile_number: fullMobileNumber,
        signature_font: formData.signature_font,
        signature_color: formData.signature_color,
      } as any);

      if (error) {
        setSavedStatus('idle');
        toast({
          title: "Error",
          description: "Failed to save profile changes",
          variant: "destructive",
        });
      } else {
        setSavedStatus('saved');
        setTimeout(() => setSavedStatus('idle'), 2000);
      }
    }, 1500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [formData]);

  useEffect(() => {
    if (user) {
      fetchPartners();
      fetchServicePrices();
    }
  }, [user]);

  const fetchServicePrices = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('service_prices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setServicePrices(data);
      if (data.length > 0) {
        setSelectedCurrency(data[0].currency);
        setNewService(prev => ({ ...prev, currency: data[0].currency }));
      }
    }
  };

  const addServicePrice = async () => {
    if (!user || !newService.service_name.trim() || !newService.default_price) {
      toast({ title: "Missing fields", description: "Service name and price are required", variant: "destructive" });
      return;
    }
    setIsAddingService(true);
    const { data, error } = await supabase
      .from('service_prices')
      .insert({ user_id: user.id, service_name: newService.service_name, default_price: parseFloat(newService.default_price), currency: selectedCurrency })
      .select().single();
    if (error) {
      toast({ title: "Error", description: "Failed to add service", variant: "destructive" });
    } else {
      setServicePrices([...servicePrices, data]);
      setNewService({ service_name: "", default_price: "", currency: selectedCurrency });
      toast({ title: "Service added", description: `${newService.service_name} has been added` });
    }
    setIsAddingService(false);
  };

  const removeServicePrice = async (id: string) => {
    const { error } = await supabase.from('service_prices').delete().eq('id', id);
    if (!error) {
      setServicePrices(servicePrices.filter(s => s.id !== id));
      toast({ title: "Service removed", description: "Service has been removed from your pricing list" });
    }
  };

  const startEditingService = (service: ServicePrice) => {
    setEditingServiceId(service.id);
    setEditingService({ service_name: service.service_name, default_price: String(service.default_price) });
  };

  const cancelEditingService = () => {
    setEditingServiceId(null);
    setEditingService({ service_name: "", default_price: "" });
  };

  const saveEditingService = async () => {
    if (!editingServiceId || !editingService.service_name.trim() || !editingService.default_price) {
      toast({ title: "Missing fields", description: "Service name and price are required", variant: "destructive" });
      return;
    }
    setIsSavingService(true);
    const { error } = await supabase.from('service_prices').update({ service_name: editingService.service_name, default_price: parseFloat(editingService.default_price) }).eq('id', editingServiceId);
    if (error) {
      toast({ title: "Error", description: "Failed to update service", variant: "destructive" });
    } else {
      setServicePrices(servicePrices.map(s => s.id === editingServiceId ? { ...s, service_name: editingService.service_name, default_price: parseFloat(editingService.default_price) } : s));
      setEditingServiceId(null);
      setEditingService({ service_name: "", default_price: "" });
      toast({ title: "Service updated", description: "Service has been updated" });
    }
    setIsSavingService(false);
  };

  const updateAllServicesCurrency = async (newCurrency: string) => {
    if (!user || servicePrices.length === 0) {
      setSelectedCurrency(newCurrency);
      setNewService(prev => ({ ...prev, currency: newCurrency }));
      return;
    }
    const { error } = await supabase.from('service_prices').update({ currency: newCurrency }).eq('user_id', user.id);
    if (!error) {
      setServicePrices(servicePrices.map(s => ({ ...s, currency: newCurrency })));
      setSelectedCurrency(newCurrency);
      setNewService(prev => ({ ...prev, currency: newCurrency }));
      toast({ title: "Currency updated", description: `All services updated to ${newCurrency}` });
    }
  };

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find(c => c.code === code)?.symbol || code;
  };

  const fetchPartners = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('practice_partners')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error && data) setPartners(data);
  };

  const addPartner = async () => {
    if (!user || !newPartner.full_name.trim() || !newPartner.registration_number.trim()) {
      toast({ title: "Missing fields", description: "Partner name and registration number are required", variant: "destructive" });
      return;
    }

    setIsAddingPartner(true);
    const { data, error } = await supabase
      .from('practice_partners')
      .insert({
        user_id: user.id,
        full_name: newPartner.full_name,
        registration_number: newPartner.registration_number,
        mobile_number: newPartner.mobile_number || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to add partner", variant: "destructive" });
    } else {
      setPartners([...partners, data]);
      
      // Send invitation if email is provided - also create pending user
      if (newPartner.email.trim()) {
        try {
          await supabase.functions.invoke('send-user-invitation', {
            body: {
              recipientEmail: newPartner.email.trim(),
              senderName: profile?.full_name || 'A colleague',
              message: `You have been added as a practice partner. Join the platform to collaborate.`,
              isPracticePartner: true,
              partnerName: newPartner.full_name,
            },
          });
          toast({ title: "Partner added & invited", description: `${newPartner.full_name} has been added and an invitation was sent to ${newPartner.email}` });
        } catch {
          toast({ title: "Partner added", description: `${newPartner.full_name} has been added, but the invitation email could not be sent` });
        }
      } else {
        toast({ title: "Partner added", description: `${newPartner.full_name} has been added` });
      }
      
      setNewPartner({ full_name: "", registration_number: "", mobile_number: "", email: "" });
      setShowAddPartnerForm(false);
    }
    setIsAddingPartner(false);
  };

  const removePartner = async (id: string) => {
    const { error } = await supabase.from('practice_partners').delete().eq('id', id);
    if (!error) {
      setPartners(partners.filter(p => p.id !== id));
      toast({ title: "Partner removed", description: "Partner has been removed from your practice" });
    }
  };

  const startEditingPartner = (partner: Partner) => {
    setEditingPartnerId(partner.id);
    setEditingPartner({ full_name: partner.full_name, registration_number: partner.registration_number, mobile_number: partner.mobile_number || "" });
  };

  const cancelEditingPartner = () => {
    setEditingPartnerId(null);
    setEditingPartner({ full_name: "", registration_number: "", mobile_number: "" });
  };

  const saveEditingPartner = async () => {
    if (!editingPartnerId || !editingPartner.full_name.trim() || !editingPartner.registration_number.trim()) {
      toast({ title: "Missing fields", description: "Partner name and registration number are required", variant: "destructive" });
      return;
    }
    setIsSavingPartner(true);
    const { error } = await supabase.from('practice_partners').update({
      full_name: editingPartner.full_name,
      registration_number: editingPartner.registration_number,
      mobile_number: editingPartner.mobile_number || null,
    }).eq('id', editingPartnerId);

    if (error) {
      toast({ title: "Error", description: "Failed to update partner", variant: "destructive" });
    } else {
      setPartners(partners.map(p => p.id === editingPartnerId ? { ...p, ...editingPartner } : p));
      setEditingPartnerId(null);
      setEditingPartner({ full_name: "", registration_number: "", mobile_number: "" });
      toast({ title: "Partner updated", description: "Partner details have been updated" });
    }
    setIsSavingPartner(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
      return;
    }
    setIsUploadingLogo(true);
    const { error } = await uploadLogo(file);
    setIsUploadingLogo(false);
    if (error) {
      toast({ title: "Upload failed", description: "Failed to upload logo", variant: "destructive" });
    } else {
      toast({ title: "Logo uploaded", description: "Your practice logo has been updated" });
      isSettingFromProfile.current = true;
      await fetchProfile();
      setTimeout(() => { isSettingFromProfile.current = false; }, 200);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
      return;
    }
    setIsUploadingAvatar(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: "Failed to upload profile picture", variant: "destructive" });
      setIsUploadingAvatar(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: `${publicUrl}?t=${Date.now()}` }).eq('id', user.id);
    setIsUploadingAvatar(false);
    if (updateError) {
      toast({ title: "Error", description: "Failed to update profile picture", variant: "destructive" });
    } else {
      toast({ title: "Profile picture updated", description: "Your profile picture has been changed" });
      isSettingFromProfile.current = true;
      await fetchProfile();
      setTimeout(() => { isSettingFromProfile.current = false; }, 200);
    }
  };

  const handleSaveEmail = async () => {
    if (!user || !editEmail.trim()) return;
    setIsSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: editEmail.trim() });
    setIsSavingEmail(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email updated", description: "A confirmation email has been sent to the new address" });
      setIsEditingEmail(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getSignatureFontFamily = (fontValue: string) => {
    return SIGNATURE_FONTS.find(f => f.value === fontValue)?.fontFamily || SIGNATURE_FONTS[0].fontFamily;
  };

  const getSignatureFontSize = (fontValue: string) => {
    return SIGNATURE_FONTS.find(f => f.value === fontValue)?.fontSize || '20px';
  };

  const getSignatureFontWeight = (fontValue: string) => {
    return SIGNATURE_FONTS.find(f => f.value === fontValue)?.fontWeight || 'normal';
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="mt-1 text-muted-foreground">Manage your personal and practice information</p>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-1.5">
          {savedStatus === 'saving' && (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Saving...</span></>
          )}
          {savedStatus === 'saved' && (
            <><Check className="h-3.5 w-3.5 text-success" /><span className="text-success">All changes saved</span></>
          )}
        </div>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
        </div>

        {/* Profile Picture */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative group">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarImage src={(profile as any)?.avatar_url} alt={combinedFullName || "Profile"} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {combinedFullName ? getInitials(combinedFullName) : "U"}
              </AvatarFallback>
            </Avatar>
            <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="h-6 w-6 text-white" />
            </label>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" id="avatar-upload" disabled={isUploadingAvatar} />
          </div>
          <div>
            <p className="font-medium text-foreground">{combinedFullName || "Profile Picture"}</p>
            <p className="text-sm text-muted-foreground">{isUploadingAvatar ? "Uploading..." : "Hover over image to change"}</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} placeholder="John" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} placeholder="Smith" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            {isAdmin && isEditingEmail ? (
              <div className="flex gap-2">
                <Input id="email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="user@example.com" />
                <Button size="icon" variant="ghost" onClick={handleSaveEmail} disabled={isSavingEmail}>
                  {isSavingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingEmail(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input id="email" type="email" value={user?.email || ""} disabled className="bg-muted" />
                {isAdmin && (
                  <Button size="icon" variant="ghost" onClick={() => { setEditEmail(user?.email || ""); setIsEditingEmail(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Number with Country Code */}
        <div className="mt-6 space-y-2">
          <Label htmlFor="mobile">Mobile Number</Label>
          <div className="flex gap-2">
            <Select value={formData.country_code} onValueChange={(value) => setFormData({ ...formData, country_code: value })}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRY_CODES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    <span className="flex items-center gap-2"><span>{country.flag}</span><span>{country.code}</span></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input id="mobile" type="tel" value={formatPhoneNumber(formData.mobile_number)} onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/[^0-9]/g, '') })} placeholder="82 123 4567" className="flex-1" />
          </div>
        </div>

        {/* Mailbox Email */}
        <MailboxSection userId={user?.id} />
      </div>

      {/* Practice Information */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Practice Information</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">This information will appear on your document templates and letterheads.</p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="practice_number">Practice Number</Label>
            <Input id="practice_number" value={formData.practice_number} onChange={(e) => setFormData({ ...formData, practice_number: e.target.value })} placeholder="e.g., PR123456" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor_number">Doctor Registration Number</Label>
            <Input id="doctor_number" value={formData.doctor_number} onChange={(e) => setFormData({ ...formData, doctor_number: e.target.value })} placeholder="e.g., MP123456" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty</Label>
            <Select value={formData.specialty} onValueChange={(value) => setFormData({ ...formData, specialty: value })}>
              <SelectTrigger id="specialty"><SelectValue placeholder="Select your specialty" /></SelectTrigger>
              <SelectContent>
                {DOCTOR_SPECIALTIES.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Label htmlFor="practice_address">Address of Doctor's Rooms</Label>
          <Textarea id="practice_address" value={formData.practice_address} onChange={(e) => setFormData({ ...formData, practice_address: e.target.value })} placeholder="e.g., 123 Medical Centre, Suite 4, Cape Town, 8001" rows={3} />
        </div>

        {/* Logo Upload */}
        <div className="mt-6 space-y-2">
          <Label>Practice Logo</Label>
          <p className="text-sm text-muted-foreground mb-3">Upload your practice logo for letterheads and documents</p>
          <div className="flex items-center gap-4">
            {profile?.logo_url && (
              <img src={profile.logo_url} alt="Practice logo" className="h-16 w-auto object-contain rounded border border-border p-1" />
            )}
            <div>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload-profile" />
              <Button variant="outline" onClick={() => document.getElementById('logo-upload-profile')?.click()} disabled={isUploadingLogo} className="gap-2">
                <Upload className="h-4 w-4" />
                {isUploadingLogo ? "Uploading..." : profile?.logo_url ? "Change Logo" : "Upload Logo"}
              </Button>
            </div>
          </div>
        </div>

        {/* Digital Signature Preview */}
        <div className="mt-6 space-y-4">
          <Label>Digital Signature</Label>
          <p className="text-sm text-muted-foreground">Preview how your signature will appear on documents.</p>
          
          {/* Signature Preview Box */}
          <div className="p-4 border border-border rounded-lg bg-background">
            <p
              style={{
                fontFamily: getSignatureFontFamily(formData.signature_font),
                color: formData.signature_color === 'teal' ? '#104861' : '#000000',
                fontSize: getSignatureFontSize(formData.signature_font),
                fontWeight: getSignatureFontWeight(formData.signature_font),
              }}
            >
              {combinedFullName || "Your Name"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })} · {new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Font</Label>
              <Select value={formData.signature_font} onValueChange={(value) => setFormData({ ...formData, signature_font: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SIGNATURE_FONTS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.fontFamily, fontSize: font.fontSize, fontWeight: font.fontWeight as any }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Select value={formData.signature_color} onValueChange={(value) => setFormData({ ...formData, signature_color: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="black">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-black border border-border" />
                      Black
                    </span>
                  </SelectItem>
                  <SelectItem value="teal">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: '#104861' }} />
                      Teal (#104861)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Practice Partners */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Practice Partners</h2>
          </div>
          {!showAddPartnerForm && (
            <Button variant="outline" size="sm" onClick={() => setShowAddPartnerForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Partner
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-6">Add partners of the same practice. Their information will be available on documents.</p>

        {/* Existing Partners */}
        {partners.length > 0 && (
          <div className="space-y-3 mb-6">
            {partners.map((partner) => (
              <div key={partner.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                {editingPartnerId === partner.id ? (
                  <div className="flex-1 grid gap-3 sm:grid-cols-3 mr-4">
                    <Input value={editingPartner.full_name} onChange={(e) => setEditingPartner({ ...editingPartner, full_name: e.target.value })} placeholder="Full name" />
                    <Input value={editingPartner.registration_number} onChange={(e) => setEditingPartner({ ...editingPartner, registration_number: e.target.value })} placeholder="Registration number" />
                    <Input value={editingPartner.mobile_number} onChange={(e) => setEditingPartner({ ...editingPartner, mobile_number: e.target.value })} placeholder="Mobile (optional)" />
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-foreground">{partner.full_name}</p>
                    <p className="text-sm text-muted-foreground">Reg: {partner.registration_number}{partner.mobile_number && ` · Mobile: ${partner.mobile_number}`}</p>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {editingPartnerId === partner.id ? (
                    <>
                      <Button variant="ghost" size="icon" onClick={saveEditingPartner} disabled={isSavingPartner} className="h-8 w-8 text-success hover:text-success">
                        {isSavingPartner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={cancelEditingPartner} className="h-8 w-8 text-muted-foreground">
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => startEditingPartner(partner)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removePartner(partner.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Partner Form - toggled */}
        {showAddPartnerForm && (
          <div className="space-y-4 p-4 border border-dashed border-border rounded-lg">
            <p className="text-sm font-medium text-foreground">Add New Partner</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="partner_name">Full Name *</Label>
                <Input id="partner_name" value={newPartner.full_name} onChange={(e) => setNewPartner({ ...newPartner, full_name: e.target.value })} placeholder="Dr. Jane Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner_reg">Registration Number *</Label>
                <Input id="partner_reg" value={newPartner.registration_number} onChange={(e) => setNewPartner({ ...newPartner, registration_number: e.target.value })} placeholder="e.g., MP654321" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner_mobile">Mobile Number (Optional)</Label>
                <Input id="partner_mobile" value={newPartner.mobile_number} onChange={(e) => setNewPartner({ ...newPartner, mobile_number: e.target.value })} placeholder="e.g., 082 123 4567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner_email">Email (for invitation)</Label>
                <Input id="partner_email" type="email" value={newPartner.email} onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })} placeholder="partner@example.com" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addPartner} disabled={isAddingPartner} className="gap-2">
                <Save className="h-4 w-4" />
                {isAddingPartner ? "Saving..." : "Save Partner"}
              </Button>
              <Button variant="outline" onClick={() => { setShowAddPartnerForm(false); setNewPartner({ full_name: "", registration_number: "", mobile_number: "", email: "" }); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Pricing</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Define your service types and default prices. These will appear when creating invoices.</p>

        <div className="mb-6">
          <Label htmlFor="currency">Currency</Label>
          <Select value={selectedCurrency} onValueChange={updateAllServicesCurrency}>
            <SelectTrigger id="currency" className="w-[280px] mt-2"><SelectValue placeholder="Select currency" /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>{currency.symbol} - {currency.name} ({currency.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {servicePrices.length > 0 && (
          <div className="space-y-3 mb-6">
            {servicePrices.map((service) => (
              <div key={service.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                {editingServiceId === service.id ? (
                  <div className="flex-1 grid gap-3 sm:grid-cols-2 mr-4">
                    <Input value={editingService.service_name} onChange={(e) => setEditingService({ ...editingService, service_name: e.target.value })} placeholder="Service name" />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{getCurrencySymbol(selectedCurrency)}</span>
                      <Input type="number" step="0.01" min="0" value={editingService.default_price} onChange={(e) => setEditingService({ ...editingService, default_price: e.target.value })} placeholder="0.00" className="pl-8" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-foreground">{service.service_name}</p>
                      <p className="text-sm text-muted-foreground">Default: {getCurrencySymbol(service.currency)} {Number(service.default_price).toFixed(2)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {editingServiceId === service.id ? (
                    <>
                      <Button variant="ghost" size="icon" onClick={saveEditingService} disabled={isSavingService} className="h-8 w-8 text-success hover:text-success">
                        {isSavingService ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={cancelEditingService} className="h-8 w-8 text-muted-foreground">
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => startEditingService(service)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeServicePrice(service.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4 p-4 border border-dashed border-border rounded-lg">
          <p className="text-sm font-medium text-foreground">Add New Service</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service_name">Service Name *</Label>
              <Input id="service_name" value={newService.service_name} onChange={(e) => setNewService({ ...newService, service_name: e.target.value })} placeholder="e.g., Consultation, Follow-up, Procedure" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_price">Default Price ({getCurrencySymbol(selectedCurrency)}) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol(selectedCurrency)}</span>
                <Input id="service_price" type="number" step="0.01" min="0" value={newService.default_price} onChange={(e) => setNewService({ ...newService, default_price: e.target.value })} placeholder="0.00" className="pl-8" />
              </div>
            </div>
          </div>
          <Button onClick={addServicePrice} disabled={isAddingService} className="gap-2">
            <Plus className="h-4 w-4" />
            {isAddingService ? "Adding..." : "Add Service"}
          </Button>
        </div>
      </div>

      <PatientImport />
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
      if (profile) {
        setMailboxId(profile.mailbox_id);
        setMailboxAlias(profile.mailbox_alias || "");
      }
    };
    fetchMailboxInfo();
  }, [userId]);

  const displayEmail = mailboxAlias ? `${mailboxAlias}@medipad.com` : mailboxId ? `docs-${mailboxId.slice(0, 8)}@inbox.medipad.health` : null;

  const handleCopy = async () => {
    if (!displayEmail) return;
    await navigator.clipboard.writeText(displayEmail);
    setCopied(true);
    toast({ title: "Copied", description: "Mailbox email copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAlias = async () => {
    if (!userId) return;
    const cleanAlias = aliasInput.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
    if (cleanAlias.length < 3) {
      toast({ title: "Invalid alias", description: "Alias must be at least 3 characters", variant: "destructive" });
      return;
    }
    if (cleanAlias.length > 30) {
      toast({ title: "Invalid alias", description: "Alias must be 30 characters or less", variant: "destructive" });
      return;
    }
    setIsSavingAlias(true);
    const { error } = await supabase.from('profiles').update({ mailbox_alias: cleanAlias }).eq('id', userId);
    setIsSavingAlias(false);
    if (error) {
      if (error.code === '23505') {
        toast({ title: "Alias taken", description: `"${cleanAlias}@medipad.com" is already in use. Please choose a different alias.`, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to save alias", variant: "destructive" });
      }
    } else {
      setMailboxAlias(cleanAlias);
      setEditingAlias(false);
      toast({ title: "Alias saved", description: `Your mailbox email is now ${cleanAlias}@medipad.com` });
    }
  };

  return (
    <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">Document Mailbox</p>
          <p className="text-sm text-muted-foreground mt-1">
            External parties (e.g., radiologists, labs) can email documents to this address and they will be saved under your Documents.
          </p>
          
          {displayEmail ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <code className="text-sm bg-muted px-3 py-1.5 rounded-md font-mono text-foreground border border-border">
                  {displayEmail}
                </code>
                <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8 shrink-0">
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {!mailboxAlias && (
                editingAlias ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0 flex-1">
                      <Input value={aliasInput} onChange={(e) => setAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="your-name" className="rounded-r-none max-w-[200px]" />
                      <span className="px-3 py-2.5 border border-l-0 border-border rounded-r-xl bg-muted text-sm text-muted-foreground whitespace-nowrap">@medipad.com</span>
                    </div>
                    <Button size="sm" onClick={handleSaveAlias} disabled={isSavingAlias}>
                      {isSavingAlias ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingAlias(false)}>Cancel</Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => { setEditingAlias(true); setAliasInput(""); }}>
                    Set custom alias
                  </Button>
                )
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">Loading mailbox info...</p>
          )}
        </div>
      </div>
    </div>
  );
}
