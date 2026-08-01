import { useTranslation } from "react-i18next";
import DoctorDocumentsTab from "./DoctorDocumentsTab";

export default function DoctorDocumentsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("documents.title")}</h1>
        <p className="mt-1 text-muted-foreground text-xs">Manage patient documents and reusable templates.</p>
      </div>
      <DoctorDocumentsTab />
    </div>
  );
}
