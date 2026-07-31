import { useSearchParams } from "react-router-dom";
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

  const tabTriggerClass =
    "rounded-lg px-4 py-2.5 text-white hover:text-white/80 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm";

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isDoctor && !readOnly ? "Biolog" : readOnly ? "Patient Biolog" : "My Biolog"}
          </h1>
          <p className="mt-1 text-muted-foreground text-xs">
            Track how you feel day to day and spot patterns over time.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-primary p-1.5 rounded-xl h-auto flex-wrap">
          <TabsTrigger value="today" className={tabTriggerClass}>Today</TabsTrigger>
          <TabsTrigger value="history" className={tabTriggerClass}>History</TabsTrigger>
          <TabsTrigger value="insights" className={tabTriggerClass}>Insights</TabsTrigger>
          <TabsTrigger value="programmes" className={tabTriggerClass}>Programmes</TabsTrigger>
          {!readOnly && <TabsTrigger value="customise" className={tabTriggerClass}>Customise</TabsTrigger>}
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
