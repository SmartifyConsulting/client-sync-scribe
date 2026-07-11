import { useTranslation } from "react-i18next";
import DoctorDocumentsTab from "./DoctorDocumentsTab";

export default function DoctorDocumentsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold text-foreground">{t("documents.title")}</h1>
      <DoctorDocumentsTab />
    </div>
  );
}
