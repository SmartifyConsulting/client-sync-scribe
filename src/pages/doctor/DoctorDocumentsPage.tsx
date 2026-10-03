import { useTranslation } from "react-i18next";
import DoctorDocumentsTab from "./DoctorDocumentsTab";

export default function DoctorDocumentsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">{t("documents.title")}</h1>
        <p className="mt-1 text-muted-foreground text-xs">Manage client documents and reusable templates.</p>
      </div>
      <DoctorDocumentsTab />
    </div>
  );
}
