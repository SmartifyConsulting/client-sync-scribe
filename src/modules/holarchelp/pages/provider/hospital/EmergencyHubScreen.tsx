import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Siren, Ambulance, Stethoscope, BedDouble } from "lucide-react";
import HospitalOpsDashboard from "./HospitalOpsDashboard";
import IncomingAmbulancesScreen from "./IncomingAmbulancesScreen";
import TriageScreen from "./TriageScreen";
import ErCapacityScreen from "./ErCapacityScreen";

type TabKey = "queue" | "incoming" | "triage" | "capacity";
const VALID: TabKey[] = ["queue", "incoming", "triage", "capacity"];

export default function EmergencyHubScreen() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as TabKey | null;
  const active: TabKey = raw && VALID.includes(raw) ? raw : "queue";

  const setTab = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === "queue") next.delete("tab");
    else next.set("tab", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <Tabs value={active} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="queue" className="flex items-center gap-1.5">
            <Siren className="h-4 w-4" />
            <span>{t("nav.emergencyQueue", "Emergency Queue")}</span>
          </TabsTrigger>
          <TabsTrigger value="incoming" className="flex items-center gap-1.5">
            <Ambulance className="h-4 w-4" />
            <span>{t("nav.incomingEr", "Incoming ER")}</span>
          </TabsTrigger>
          <TabsTrigger value="triage" className="flex items-center gap-1.5">
            <Stethoscope className="h-4 w-4" />
            <span>{t("nav.triage", "Triage")}</span>
          </TabsTrigger>
          <TabsTrigger value="capacity" className="flex items-center gap-1.5">
            <BedDouble className="h-4 w-4" />
            <span>{t("nav.erCapacity", "ER Capacity")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4"><HospitalOpsDashboard /></TabsContent>
        <TabsContent value="incoming" className="mt-4"><IncomingAmbulancesScreen /></TabsContent>
        <TabsContent value="triage" className="mt-4"><TriageScreen /></TabsContent>
        <TabsContent value="capacity" className="mt-4"><ErCapacityScreen /></TabsContent>
      </Tabs>
    </div>
  );
}
