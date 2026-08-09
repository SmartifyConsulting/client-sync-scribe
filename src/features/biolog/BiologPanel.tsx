import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BiologToday } from "./BiologToday";
import { BiologHistory } from "./BiologHistory";
import { BiologInsights } from "./BiologInsights";
import { BiologProgrammes } from "./BiologProgrammes";
import { BiologCustomise } from "./BiologCustomise";

/**
 * Embeddable Biolog panel — used standalone on /biolog and inside a patient
 * profile so the care team can review the patient's Biolog.
 */
export function BiologPanel({
  ownerUserId,
  readOnly = false,
}: {
  ownerUserId?: string;
  readOnly?: boolean;
}) {
  const [tab, setTab] = useState("today");
  const triggerClass =
    "rounded-lg px-4 py-2.5 text-white hover:text-white/80 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm";

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="bg-primary p-1.5 rounded-xl h-auto flex-wrap">
        <TabsTrigger value="today" className={triggerClass}>Today</TabsTrigger>
        <TabsTrigger value="history" className={triggerClass}>History</TabsTrigger>
        <TabsTrigger value="insights" className={triggerClass}>Insights</TabsTrigger>
        <TabsTrigger value="programmes" className={triggerClass}>Programmes</TabsTrigger>
        {!readOnly && <TabsTrigger value="customise" className={triggerClass}>Customise</TabsTrigger>}
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
  );
}
