import { useMemo, useState } from "react";
import { useTestResults, type TestResult } from "@/features/patients/hooks/useTestResults";
import { MailboxIntakeAddress } from "@/components/documents/MailboxIntakeAddress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { SectionCountPill, DATE_BUCKETS, dateBucketFor } from "@/components/ui/section-accordion";
import { SectionHeader } from "@/features/patients/components/sectionStyles";
import { Loader2, Droplet, Scan, Bone, FileQuestion } from "lucide-react";
import { format } from "date-fns";

const TYPE_CONFIG: Record<TestResult["test_type"], { label: string; icon: typeof Droplet }> = {
  blood: { label: "Blood", icon: Droplet },
  radiology: { label: "Radiology", icon: Scan },
  xray: { label: "X-Ray", icon: Bone },
  other: { label: "Other", icon: FileQuestion },
};

export function PatientTestResults({ patientId }: { patientId: string }) {
  const { data: results = [], isLoading } = useTestResults(patientId);
  const [groupBy, setGroupBy] = useState<"date" | "type">("date");

  const dateGroups = useMemo(() => {
    const buckets: Record<string, TestResult[]> = { today: [], week: [], month: [], older: [] };
    for (const r of results) buckets[dateBucketFor(r.result_date)].push(r);
    return DATE_BUCKETS.map((b) => ({ key: b.key, label: b.label, items: buckets[b.key] })).filter((g) => g.items.length > 0);
  }, [results]);

  const typeGroups = useMemo(() => {
    const map = new Map<TestResult["test_type"], TestResult[]>();
    for (const r of results) {
      if (!map.has(r.test_type)) map.set(r.test_type, []);
      map.get(r.test_type)!.push(r);
    }
    return Array.from(map.entries()).map(([type, items]) => ({ key: type, label: TYPE_CONFIG[type].label, items }));
  }, [results]);

  const groups = groupBy === "date" ? dateGroups : typeGroups;

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-1 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-[18px] font-semibold text-primary-dark">Test Results</h2>
          <p className="text-xs text-muted-foreground">Blood work, radiology, X-rays and other lab results</p>
        </div>
        <ToggleGroup type="single" value={groupBy} onValueChange={(v) => v && setGroupBy(v as "date" | "type")} size="sm" variant="outline">
          <ToggleGroupItem value="date" className="text-xs px-3">Date</ToggleGroupItem>
          <ToggleGroupItem value="type" className="text-xs px-3">Type</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <MailboxIntakeAddress />

      {results.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1 py-8 text-center">
          No test results on record yet. Lab results emailed to your intake address above will appear here.
        </p>
      ) : (
        <div className="patient-section-frame rounded-xl border border-neutral-400 bg-white overflow-hidden divide-y divide-white">
          {groups.map((group, idx) => {
            const Icon = groupBy === "type" ? TYPE_CONFIG[group.key as TestResult["test_type"]].icon : Droplet;
            return (
              <Collapsible key={group.key} defaultOpen={idx === 0} className="bg-white overflow-hidden">
                <SectionHeader icon={Icon} label={group.label} extra={<SectionCountPill count={group.items.length} />} />
                <CollapsibleContent className="p-3">
                  <div className="space-y-2">
                    {group.items.map((r) => {
                      const TypeIcon = TYPE_CONFIG[r.test_type].icon;
                      return (
                        <div key={r.id} className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              <TypeIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                              {r.test_name}
                            </span>
                            <Badge variant="outline" className="text-xs shrink-0">{TYPE_CONFIG[r.test_type].label}</Badge>
                          </div>
                          <p className="text-muted-foreground">
                            {format(new Date(r.result_date), "dd MMM yyyy")} · Submitted by {r.submitted_by}
                          </p>
                          {r.content && <p className="text-foreground">{r.content}</p>}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
