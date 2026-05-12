import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DoctorDocumentsTab from "./DoctorDocumentsTab";
import Documents from "@/pages/Documents";

export default function DoctorDocumentsPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-[12px] font-semibold text-foreground">Documents</h1>
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="flex w-full flex-nowrap overflow-x-auto bg-primary justify-start">
          <TabsTrigger
            value="documents"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs"
          >
            Documents
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs"
          >
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          <DoctorDocumentsTab />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Documents hideHeader />
        </TabsContent>
      </Tabs>
    </div>
  );
}
