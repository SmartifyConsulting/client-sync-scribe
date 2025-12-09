import { useState, useEffect } from "react";
import { User, Calendar, Bell, Shield, Database, CheckCircle, Building2, Upload, Plus, Trash2, Users, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

interface Partner {
  id: string;
  full_name: string;
  registration_number: string;
  mobile_number: string;
}

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, loading, updateProfile, uploadLogo } = useProfile();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [newPartner, setNewPartner] = useState({ full_name: "", registration_number: "", mobile_number: "" });
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    practice_number: "",
    doctor_number: "",
    practice_address: "",
    specialty: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        practice_number: profile.practice_number || "",
        doctor_number: profile.doctor_number || "",
        practice_address: profile.practice_address || "",
        specialty: (profile as any).specialty || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchPartners();
    }
  }, [user]);

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

  const handleConnect = async (provider: "google" | "outlook") => {
    setIsConnecting(provider);
    
    // Simulate OAuth connection flow
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

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const { error } = await updateProfile(formData);
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
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
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
                id="logo-upload-settings"
              />
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('logo-upload-settings')?.click()}
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
            <div>
              <p className="font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Button variant="outline">Enable</Button>
          </div>
          <Separator />
          <div>
            <Button variant="outline">Change Password</Button>
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
    </div>
  );
}
