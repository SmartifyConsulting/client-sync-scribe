import { useTranslation } from "react-i18next";
import AdvisorDocumentsTab from "./AdvisorDocumentsTab";

export default function AdvisorDocumentsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div>
        <h1 className="page-title">{t("documents.title")}</h1>
        <p className="mt-1 text-muted-foreground text-xs">Manage client documents and reusable templates.</p>
      </div>
      <AdvisorDocumentsTab />
    </div>
  );
}
