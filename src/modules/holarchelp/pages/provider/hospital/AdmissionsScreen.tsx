import { useTranslation } from "react-i18next";
import InpatientsScreen from "./InpatientsScreen";

export default function AdmissionsScreen() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("provider.hospitalEmergencyOperations")}</p>
        <h1 className="text-2xl font-extrabold">{t("admissions.title")}</h1>
      </header>

      <InpatientsScreen />
    </div>
  );
}
