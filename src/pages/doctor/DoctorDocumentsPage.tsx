import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DoctorDocumentsTab from "./DoctorDocumentsTab";
import DoctorTemplatesTab from "./DoctorTemplatesTab";

export default function DoctorDocumentsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold text-foreground">{t("documents.title")}</h1>
      <Tabs defaultValue="all" className="space-y-3">
        <TabsList>
          <TabsTrigger value="all" className="text-xs">All Documents</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <DoctorDocumentsTab />
        </TabsContent>
        <TabsContent value="templates">
          <DoctorTemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
