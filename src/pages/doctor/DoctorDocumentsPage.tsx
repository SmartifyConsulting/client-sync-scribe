import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DoctorDocumentsTab from "./DoctorDocumentsTab";
import DoctorTemplatesTab from "./DoctorTemplatesTab";

export default function DoctorDocumentsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("documents.title")}</h1>
        <p className="mt-1 text-muted-foreground text-xs">Manage patient documents and reusable templates.</p>
      </div>
      <Tabs defaultValue="all" className="space-y-3">
        <TabsList className="bg-neutral-600">
          <TabsTrigger value="all" className="text-xs whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-black text-white">All Documents</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-black text-white">Templates</TabsTrigger>
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
