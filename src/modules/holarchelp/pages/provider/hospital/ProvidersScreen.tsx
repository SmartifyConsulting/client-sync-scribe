import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AffiliatedDoctorsScreen from "./AffiliatedDoctorsScreen";
import NursesScreen from "./NursesScreen";
import AffiliatedAmbulancesScreen from "./AffiliatedAmbulancesScreen";

type TabKey = "doctors" | "nurses" | "er";

const VALID: TabKey[] = ["doctors", "nurses", "er"];

export default function ProvidersScreen() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as TabKey | null;
  const tab: TabKey = raw && VALID.includes(raw) ? raw : "doctors";

  const setTab = (next: string) => {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full flex-nowrap overflow-x-auto bg-primary justify-start">
          <TabsTrigger
            value="doctors"
            className="tab-brand whitespace-nowrap text-xs px-3 py-1.5"
          >
            Doctors
          </TabsTrigger>
          <TabsTrigger
            value="nurses"
            className="tab-brand whitespace-nowrap text-xs px-3 py-1.5"
          >
            Nurses
          </TabsTrigger>
          <TabsTrigger
            value="er"
            className="tab-brand whitespace-nowrap text-xs px-3 py-1.5"
          >
            ER Providers
          </TabsTrigger>
        </TabsList>
        <TabsContent value="doctors" className="mt-4">
          <AffiliatedDoctorsScreen />
        </TabsContent>
        <TabsContent value="nurses" className="mt-4">
          <NursesScreen />
        </TabsContent>
        <TabsContent value="er" className="mt-4">
          <AffiliatedAmbulancesScreen />
        </TabsContent>
      </Tabs>
    </div>
  );
}
