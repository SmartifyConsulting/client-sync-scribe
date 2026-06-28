import { useProviderAccess } from "../../../components/ProviderGate";
import AmbulanceHospitalAffiliations from "../../../components/AmbulanceHospitalAffiliations";
import { Hospital } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AffiliatedHospitalsScreen() {
  const { t } = useTranslation();
  const { providerId } = useProviderAccess();
  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("provider.erProvider")}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Hospital className="h-5 w-5 text-primary" /> {t("nav.affiliatedHospitals")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">{t("hospitalsDirectory.subtitle")}</p>
      </header>
      <AmbulanceHospitalAffiliations providerId={providerId} />
    </div>
  );
}
