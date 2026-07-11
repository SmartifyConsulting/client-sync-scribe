import { ShareAppDialog } from "@/components/ShareAppDialog";
import { SettingsContent } from "@/components/settings/SettingsContent";
import { useTranslation } from "react-i18next";

export default function Settings() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("settingsPage.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("settingsPage.subtitle")}</p>
        </div>
        <ShareAppDialog />
      </div>
      <SettingsContent />
    </div>
  );
}
