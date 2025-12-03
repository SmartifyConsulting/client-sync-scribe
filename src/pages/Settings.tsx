import { useState } from "react";
import { User, Calendar, Bell, Shield, Database, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

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
            <Input id="name" defaultValue="Dr. Sarah Smith" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue="sarah.smith@practice.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" defaultValue="+1 (555) 123-4567" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="practice">Practice Name</Label>
            <Input id="practice" defaultValue="Smith Consulting" />
          </div>
        </div>
        <Button className="mt-6">Save Changes</Button>
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
