import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DoctorInvoices from "@/pages/doctor/Invoices";
import Documents from "@/pages/Documents";
import PricingAdmin from "@/pages/admin/PricingAdmin";

export default function Admin() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">Admin</h1>
      <Tabs defaultValue="pricing" className="w-full">
        <TabsList className="flex w-full flex-nowrap overflow-x-auto bg-primary justify-start">
          <TabsTrigger
            value="pricing"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs"
          >
            Pricing
          </TabsTrigger>
          <TabsTrigger
            value="invoices"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs"
          >
            Invoices
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-xs"
          >
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="mt-4">
          <PricingAdmin />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <DoctorInvoices hideHeader />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Documents hideHeader />
        </TabsContent>
      </Tabs>
    </div>
  );
}
