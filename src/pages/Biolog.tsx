import { useSearchParams } from "react-router-dom";
import { Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { BiologToday } from "@/features/biolog/BiologToday";
import { BiologHistory } from "@/features/biolog/BiologHistory";
import { BiologInsights } from "@/features/biolog/BiologInsights";
import { BiologProgrammes } from "@/features/biolog/BiologProgrammes";
import { BiologCustomise } from "@/features/biolog/BiologCustomise";

/**
 * My Biolog — daily tracking, correlations and programmes.
 * Doctors can open a patient's biolog read-only via ?user=<patient user id>.
 */
export default function Biolog() {
  const [params, setParams] = useSearchParams();
  const ownerUserId = params.get("user") || undefined;
  const { role } = useUserRole();
  const isDoctor = role === "doctor";
  const readOnly = !!ownerUserId;

  const tab = params.get("tab") || "today";
  const setTab = (value: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", value);
    setParams(next, { replace: true });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold text-foreground">
          {isDoctor && !readOnly ? "Biolog" : readOnly ? "Patient Biolog" : "My Biolog"}
        </h1>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-primary p-1.5 rounded-xl h-auto flex-wrap">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="programmes">Programmes</TabsTrigger>
          {!readOnly && <TabsTrigger value="customise">Customise</TabsTrigger>}
        </TabsList>

        <TabsContent value="today">
          <BiologToday ownerUserId={ownerUserId} readOnly={readOnly} />
        </TabsContent>
        <TabsContent value="history">
          <BiologHistory ownerUserId={ownerUserId} />
        </TabsContent>
        <TabsContent value="insights">
          <BiologInsights ownerUserId={ownerUserId} readOnly={readOnly} />
        </TabsContent>
        <TabsContent value="programmes">
          <BiologProgrammes ownerUserId={ownerUserId} />
        </TabsContent>
        {!readOnly && (
          <TabsContent value="customise">
            <BiologCustomise ownerUserId={ownerUserId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
