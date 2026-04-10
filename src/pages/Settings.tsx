import { ShareAppDialog } from "@/components/ShareAppDialog";
import { SettingsContent } from "@/components/settings/SettingsContent";

export default function Settings() {
  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-[12px]">Manage your preferences, security, and billing</p>
        </div>
        <ShareAppDialog />
      </div>
      <SettingsContent />
    </div>
  );
}
