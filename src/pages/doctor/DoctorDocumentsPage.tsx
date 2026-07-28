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
        <TabsList className="inline-flex h-auto w-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="all" className="text-xs whitespace-nowrap px-3 py-1.5 hover:text-foreground data-[state=active]:text-primary-foreground">All Documents</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs whitespace-nowrap px-3 py-1.5 hover:text-foreground data-[state=active]:text-primary-foreground">Templates</TabsTrigger>
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
