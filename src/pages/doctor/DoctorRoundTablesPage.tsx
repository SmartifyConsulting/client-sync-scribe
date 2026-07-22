import { useTranslation } from "react-i18next";
import { DoctorRoundTables } from "@/components/doctor/DoctorRoundTables";

export default function DoctorRoundTablesPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold text-foreground">{t("roundTables.title")}</h1>
      <DoctorRoundTables />
    </div>
  );
}
