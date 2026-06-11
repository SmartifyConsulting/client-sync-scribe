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
        <TabsList>
          <TabsTrigger value="doctors">
            Doctors
          </TabsTrigger>
          <TabsTrigger value="nurses">
            Nurses
          </TabsTrigger>
          <TabsTrigger value="er">
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
