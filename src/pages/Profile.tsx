import { useState, useEffect } from "react";
import { User, Building2, Upload, Plus, Trash2, Users, Camera, Loader2, DollarSign, Pencil, X, Check, Phone, Copy } from "lucide-react";
import { useToast as useGlobalToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
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
  const { profile, loading, updateProfile, uploadLogo } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [newPartner, setNewPartner] = useState({ full_name: "", registration_number: "", mobile_number: "" });
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  
  // Pricing state
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [newService, setNewService] = useState({ service_name: "", default_price: "", currency: "ZAR" });
  const [isAddingService, setIsAddingService] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("ZAR");
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState({ service_name: "", default_price: "" });
  const [isSavingService, setIsSavingService] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    practice_number: "",
    doctor_number: "",
    practice_address: "",
    specialty: "",
    mobile_number: "",
    country_code: "+27",
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
      
      setFormData({
        full_name: profile.full_name || "",
        practice_number: profile.practice_number || "",
        doctor_number: profile.doctor_number || "",
        practice_address: profile.practice_address || "",
        specialty: (profile as any).specialty || "",
        mobile_number: mobileNumber,
        country_code: countryCode,
      });
    }
  }, [profile]);

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
      toast({
        title: "Missing fields",
        description: "Service name and price are required",
        variant: "destructive",
      });
      return;
    }

    setIsAddingService(true);
    const { data, error } = await supabase
      .from('service_prices')
      .insert({
        user_id: user.id,
        service_name: newService.service_name,
        default_price: parseFloat(newService.default_price),
        currency: selectedCurrency,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add service",
        variant: "destructive",
      });
    } else {
      setServicePrices([...servicePrices, data]);
      setNewService({ service_name: "", default_price: "", currency: selectedCurrency });
      toast({
        title: "Service added",
        description: `${newService.service_name} has been added`,
      });
    }
    setIsAddingService(false);
  };

  const removeServicePrice = async (id: string) => {
    const { error } = await supabase
      .from('service_prices')
      .delete()
      .eq('id', id);

    if (!error) {
      setServicePrices(servicePrices.filter(s => s.id !== id));
      toast({
        title: "Service removed",
        description: "Service has been removed from your pricing list",
      });
    }
  };

  const startEditingService = (service: ServicePrice) => {
    setEditingServiceId(service.id);
    setEditingService({
      service_name: service.service_name,
      default_price: String(service.default_price),
    });
  };

  const cancelEditingService = () => {
    setEditingServiceId(null);
    setEditingService({ service_name: "", default_price: "" });
  };

  const saveEditingService = async () => {
    if (!editingServiceId || !editingService.service_name.trim() || !editingService.default_price) {
      toast({
        title: "Missing fields",
        description: "Service name and price are required",
        variant: "destructive",
      });
      return;
    }

    setIsSavingService(true);
    const { error } = await supabase
      .from('service_prices')
      .update({
        service_name: editingService.service_name,
        default_price: parseFloat(editingService.default_price),
      })
      .eq('id', editingServiceId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update service",
        variant: "destructive",
      });
    } else {
      setServicePrices(servicePrices.map(s => 
        s.id === editingServiceId 
          ? { ...s, service_name: editingService.service_name, default_price: parseFloat(editingService.default_price) }
          : s
      ));
      setEditingServiceId(null);
      setEditingService({ service_name: "", default_price: "" });
      toast({
        title: "Service updated",
        description: "Service has been updated",
      });
    }
    setIsSavingService(false);
  };

  const updateAllServicesCurrency = async (newCurrency: string) => {
    if (!user || servicePrices.length === 0) {
      setSelectedCurrency(newCurrency);
      setNewService(prev => ({ ...prev, currency: newCurrency }));
      return;
    }

    const { error } = await supabase
      .from('service_prices')
      .update({ currency: newCurrency })
      .eq('user_id', user.id);

    if (!error) {
      setServicePrices(servicePrices.map(s => ({ ...s, currency: newCurrency })));
      setSelectedCurrency(newCurrency);
      setNewService(prev => ({ ...prev, currency: newCurrency }));
      toast({
        title: "Currency updated",
        description: `All services updated to ${newCurrency}`,
      });
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
    
    if (!error && data) {
      setPartners(data);
    }
  };

  const addPartner = async () => {
    if (!user || !newPartner.full_name.trim() || !newPartner.registration_number.trim()) {
      toast({
        title: "Missing fields",
        description: "Partner name and registration number are required",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to add partner",
        variant: "destructive",
      });
    } else {
      setPartners([...partners, data]);
      setNewPartner({ full_name: "", registration_number: "", mobile_number: "" });
      toast({
        title: "Partner added",
        description: `${newPartner.full_name} has been added`,
      });
    }
    setIsAddingPartner(false);
  };

  const removePartner = async (id: string) => {
    const { error } = await supabase
      .from('practice_partners')
      .delete()
      .eq('id', id);

    if (!error) {
      setPartners(partners.filter(p => p.id !== id));
      toast({
        title: "Partner removed",
        description: "Partner has been removed from your practice",
      });
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    
    // Combine country code with mobile number
    const fullMobileNumber = formData.mobile_number 
      ? `${formData.country_code}${formData.mobile_number.replace(/^0+/, '')}` 
      : "";
    
    const { error } = await updateProfile({
      full_name: formData.full_name,
      practice_number: formData.practice_number,
      doctor_number: formData.doctor_number,
      practice_address: formData.practice_address,
      specialty: formData.specialty,
      mobile_number: fullMobileNumber,
    });
    setIsSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save profile changes",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profile Updated",
        description: "Your profile changes have been saved",
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);
    const { error } = await uploadLogo(file);
    setIsUploadingLogo(false);

    if (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logo uploaded",
        description: "Your practice logo has been updated",
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);
    
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
      setIsUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
      .eq('id', user.id);

    setIsUploadingAvatar(false);

    if (updateError) {
      toast({
        title: "Error",
        description: "Failed to update profile picture",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been changed",
      });
      window.location.reload();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your personal and practice information
        </p>
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
              <AvatarImage src={(profile as any)?.avatar_url} alt={profile?.full_name || "Profile"} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {profile?.full_name ? getInitials(profile.full_name) : "U"}
              </AvatarFallback>
            </Avatar>
            <label 
              htmlFor="avatar-upload"
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="h-6 w-6 text-white" />
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              id="avatar-upload"
              disabled={isUploadingAvatar}
            />
          </div>
          <div>
            <p className="font-medium text-foreground">Profile Picture</p>
            <p className="text-sm text-muted-foreground">
              {isUploadingAvatar ? "Uploading..." : "Hover over image to change"}
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Dr. John Smith"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={user?.email || ""} 
              disabled 
              className="bg-muted"
            />
          </div>
        </div>

        {/* Mobile Number with Country Code */}
        <div className="mt-6 space-y-2">
          <Label htmlFor="mobile">Mobile Number</Label>
          <div className="flex gap-2">
            <Select 
              value={formData.country_code} 
              onValueChange={(value) => setFormData({ ...formData, country_code: value })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_CODES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    <span className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{country.code}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input 
              id="mobile" 
              type="tel"
              value={formatPhoneNumber(formData.mobile_number)}
              onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/[^0-9]/g, '') })}
              placeholder="82 123 4567"
              className="flex-1"
            />
          </div>
        </div>

        {/* Mailbox Email */}
        <MailboxSection userId={user?.id} />
        <Button className="mt-6" onClick={handleSaveProfile} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Practice Information */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Practice Information</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          This information will appear on your document templates and letterheads.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="practice_number">Practice Number</Label>
            <Input 
              id="practice_number" 
              value={formData.practice_number}
              onChange={(e) => setFormData({ ...formData, practice_number: e.target.value })}
              placeholder="e.g., PR123456"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor_number">Doctor Registration Number</Label>
            <Input 
              id="doctor_number" 
              value={formData.doctor_number}
              onChange={(e) => setFormData({ ...formData, doctor_number: e.target.value })}
              placeholder="e.g., MP123456"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty</Label>
            <Select 
              value={formData.specialty} 
              onValueChange={(value) => setFormData({ ...formData, specialty: value })}
            >
              <SelectTrigger id="specialty">
                <SelectValue placeholder="Select your specialty" />
              </SelectTrigger>
              <SelectContent>
                {DOCTOR_SPECIALTIES.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Practice Address */}
        <div className="mt-6 space-y-2">
          <Label htmlFor="practice_address">Address of Doctor's Rooms</Label>
          <Textarea 
            id="practice_address" 
            value={formData.practice_address}
            onChange={(e) => setFormData({ ...formData, practice_address: e.target.value })}
            placeholder="e.g., 123 Medical Centre, Suite 4, Cape Town, 8001"
            rows={3}
          />
        </div>

        {/* Logo Upload */}
        <div className="mt-6 space-y-2">
          <Label>Practice Logo</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Upload your practice logo for letterheads and documents
          </p>
          <div className="flex items-center gap-4">
            {profile?.logo_url && (
              <img 
                src={profile.logo_url} 
                alt="Practice logo" 
                className="h-16 w-auto object-contain rounded border border-border p-1"
              />
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload-profile"
              />
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('logo-upload-profile')?.click()}
                disabled={isUploadingLogo}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isUploadingLogo ? "Uploading..." : profile?.logo_url ? "Change Logo" : "Upload Logo"}
              </Button>
            </div>
          </div>
        </div>

        <Button className="mt-6" onClick={handleSaveProfile} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Practice Info"}
        </Button>
      </div>

      {/* Practice Partners */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Practice Partners</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Add partners of the same practice. Their information will be available on documents.
        </p>

        {/* Existing Partners */}
        {partners.length > 0 && (
          <div className="space-y-3 mb-6">
            {partners.map((partner) => (
              <div key={partner.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">{partner.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Reg: {partner.registration_number}
                    {partner.mobile_number && ` · Mobile: ${partner.mobile_number}`}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removePartner(partner.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Partner */}
        <div className="space-y-4 p-4 border border-dashed border-border rounded-lg">
          <p className="text-sm font-medium text-foreground">Add New Partner</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="partner_name">Full Name *</Label>
              <Input 
                id="partner_name" 
                value={newPartner.full_name}
                onChange={(e) => setNewPartner({ ...newPartner, full_name: e.target.value })}
                placeholder="Dr. Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner_reg">Registration Number *</Label>
              <Input 
                id="partner_reg" 
                value={newPartner.registration_number}
                onChange={(e) => setNewPartner({ ...newPartner, registration_number: e.target.value })}
                placeholder="e.g., MP654321"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner_mobile">Mobile Number (Optional)</Label>
              <Input 
                id="partner_mobile" 
                value={newPartner.mobile_number}
                onChange={(e) => setNewPartner({ ...newPartner, mobile_number: e.target.value })}
                placeholder="e.g., 082 123 4567"
              />
            </div>
          </div>
          <Button onClick={addPartner} disabled={isAddingPartner} className="gap-2">
            <Plus className="h-4 w-4" />
            {isAddingPartner ? "Adding..." : "Add Partner"}
          </Button>
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Pricing</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Define your service types and default prices. These will appear when creating invoices.
        </p>

        {/* Currency Selection */}
        <div className="mb-6">
          <Label htmlFor="currency">Currency</Label>
          <Select value={selectedCurrency} onValueChange={updateAllServicesCurrency}>
            <SelectTrigger id="currency" className="w-[280px] mt-2">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.symbol} - {currency.name} ({currency.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Existing Services */}
        {servicePrices.length > 0 && (
          <div className="space-y-3 mb-6">
            {servicePrices.map((service) => (
              <div key={service.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                {editingServiceId === service.id ? (
                  <div className="flex-1 grid gap-3 sm:grid-cols-2 mr-4">
                    <Input 
                      value={editingService.service_name}
                      onChange={(e) => setEditingService({ ...editingService, service_name: e.target.value })}
                      placeholder="Service name"
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {getCurrencySymbol(selectedCurrency)}
                      </span>
                      <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingService.default_price}
                        onChange={(e) => setEditingService({ ...editingService, default_price: e.target.value })}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-foreground">{service.service_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Default: {getCurrencySymbol(service.currency)} {Number(service.default_price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {editingServiceId === service.id ? (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={saveEditingService}
                        disabled={isSavingService}
                        className="h-8 w-8 text-green-600 hover:text-green-600"
                      >
                        {isSavingService ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={cancelEditingService}
                        className="h-8 w-8 text-muted-foreground"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => startEditingService(service)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeServicePrice(service.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Service */}
        <div className="space-y-4 p-4 border border-dashed border-border rounded-lg">
          <p className="text-sm font-medium text-foreground">Add New Service</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service_name">Service Name *</Label>
              <Input 
                id="service_name" 
                value={newService.service_name}
                onChange={(e) => setNewService({ ...newService, service_name: e.target.value })}
                placeholder="e.g., Consultation, Follow-up, Procedure"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_price">Default Price ({getCurrencySymbol(selectedCurrency)}) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {getCurrencySymbol(selectedCurrency)}
                </span>
                <Input 
                  id="service_price" 
                  type="number"
                  step="0.01"
                  min="0"
                  value={newService.default_price}
                  onChange={(e) => setNewService({ ...newService, default_price: e.target.value })}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          <Button onClick={addServicePrice} disabled={isAddingService} className="gap-2">
            <Plus className="h-4 w-4" />
            {isAddingService ? "Adding..." : "Add Service"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Format phone number with spaces
function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
}

// Mailbox Section Component
function MailboxSection({ userId }: { userId?: string }) {
  const [mailboxEmail, setMailboxEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useGlobalToast();

  useEffect(() => {
    const fetchMailboxId = async () => {
      if (!userId) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('mailbox_id')
        .eq('id', userId)
        .single();
      
      if (profile?.mailbox_id) {
        setMailboxEmail(`docs-${profile.mailbox_id.slice(0, 8)}@inbox.miri.health`);
      }
    };
    fetchMailboxId();
  }, [userId]);

  const handleCopy = async () => {
    if (!mailboxEmail) return;
    await navigator.clipboard.writeText(mailboxEmail);
    setCopied(true);
    toast({
      title: "Copied",
      description: "Mailbox email copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
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
          {mailboxEmail ? (
            <div className="flex items-center gap-2 mt-2">
              <code className="inline-block text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded">
                {mailboxEmail}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 h-8"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
}
