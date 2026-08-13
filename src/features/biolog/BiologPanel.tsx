import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BiologToday } from "./BiologToday";
import { BiologHistory } from "./BiologHistory";
import { BiologInsights } from "./BiologInsights";
import { BiologProgrammes } from "./BiologProgrammes";
import { BiologCustomise } from "./BiologCustomise";
import { AgeingTab } from "./ageing/AgeingTab";

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
    "data-[state=active]:bg-white data-[state=active]:text-black text-white whitespace-nowrap text-xs px-3 py-1.5";

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="flex w-full flex-nowrap overflow-x-auto bg-primary justify-start">
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
