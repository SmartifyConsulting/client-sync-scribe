import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeartPulse, BedDouble, Stethoscope, Scissors, Activity } from "lucide-react";
import TraumaBaysScreen from "./TraumaBaysScreen";
import WardsScreen from "./WardsScreen";

const TAB = "gap-1.5 text-base font-semibold data-[state=active]:bg-white data-[state=active]:text-black text-white";
const VALID_TABS = ["trauma-bays", "wards", "icu", "theatre", "high-care"];

/** Ward Board — trauma bays plus every ward category in one place. */
export default function WardBoardScreen() {
  const [searchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") ?? "") ? searchParams.get("tab")! : "trauma-bays";

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Ward Board</h1>
      </header>

      <Tabs defaultValue={initialTab}>
        <TabsList className="flex-wrap h-auto gap-1 bg-neutral-600">
          <TabsTrigger value="trauma-bays" className={TAB}><HeartPulse className="h-3.5 w-3.5" /> Trauma Bays</TabsTrigger>
          <TabsTrigger value="wards" className={TAB}><BedDouble className="h-3.5 w-3.5" /> Wards</TabsTrigger>
          <TabsTrigger value="icu" className={TAB}><Activity className="h-3.5 w-3.5" /> ICU</TabsTrigger>
          <TabsTrigger value="theatre" className={TAB}><Scissors className="h-3.5 w-3.5" /> Theatre</TabsTrigger>
          <TabsTrigger value="high-care" className={TAB}><Stethoscope className="h-3.5 w-3.5" /> High Care</TabsTrigger>
        </TabsList>

        <TabsContent value="trauma-bays" className="mt-4"><TraumaBaysScreen /></TabsContent>
        <TabsContent value="wards" className="mt-4"><WardsScreen /></TabsContent>
        <TabsContent value="icu" className="mt-4"><WardsScreen wardType="icu" title="ICU" /></TabsContent>
        <TabsContent value="theatre" className="mt-4"><WardsScreen wardType="theatre" title="Theatre" /></TabsContent>
        <TabsContent value="high-care" className="mt-4"><WardsScreen wardType="high_care" title="High Care" /></TabsContent>
      </Tabs>
    </div>
  );
}
