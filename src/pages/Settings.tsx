import { useState, useEffect } from "react";
import { User, Calendar, Bell, Shield, Database, CheckCircle, Building2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, loading, updateProfile, uploadLogo } = useProfile();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    practice_number: "",
    doctor_number: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        practice_number: profile.practice_number || "",
        doctor_number: profile.doctor_number || "",
      });
    }
  }, [profile]);

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
            <Label htmlFor="doctor_number">Doctor Number</Label>
            <Input 
              id="doctor_number" 
              value={formData.doctor_number}
              onChange={(e) => setFormData({ ...formData, doctor_number: e.target.value })}
              placeholder="e.g., MP123456"
            />
          </div>
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
