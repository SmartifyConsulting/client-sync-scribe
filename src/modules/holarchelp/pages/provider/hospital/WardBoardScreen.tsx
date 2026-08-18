import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeartPulse, BedDouble, Stethoscope, Scissors, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import TraumaBaysScreen from "./TraumaBaysScreen";
import WardsScreen from "./WardsScreen";

const TAB = "gap-1.5 data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5";
const VALID_TABS = ["trauma-bays", "wards", "icu", "theatre", "high-care"];

const CAPACITY_TONE: Record<string, string> = {
  green: "bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20",
  yellow: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20",
  red: "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20",
};

const CAPACITY_LABEL: Record<string, string> = {
  green: "ER Capacity: Normal",
  yellow: "ER Capacity: Busy",
  red: "ER Capacity: Full",
};

/** Ward Board — trauma bays plus every ward category in one place. */
export default function WardBoardScreen() {
  const [searchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") ?? "") ? searchParams.get("tab")! : "trauma-bays";
  const { providerId } = useProviderAccess();
  const [capacityStatus, setCapacityStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!providerId) return;
    supabase.from("holarchelp_hospitals" as any).select("er_capacity_status").eq("id", providerId).maybeSingle()
      .then(({ data }) => setCapacityStatus((data as any)?.er_capacity_status ?? "green"));
  }, [providerId]);

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ward Board</h1>
          <p className="text-muted-foreground text-xs">Trauma bays, wards, ICU, theatre and high care in one place</p>
        </div>
        {capacityStatus && (
          <Badge className={`text-xs capitalize shrink-0 ${CAPACITY_TONE[capacityStatus] ?? "bg-muted text-muted-foreground border-border"}`}>
            {CAPACITY_LABEL[capacityStatus] ?? `ER Capacity: ${capacityStatus}`}
          </Badge>
        )}
      </header>

      <Tabs defaultValue={initialTab}>
        <TabsList className="flex w-full flex-nowrap overflow-x-auto bg-primary justify-start">
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
