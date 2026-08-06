import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FlaskConical } from "lucide-react";

type LabResult = {
  id: string;
  test_name: string;
  result_value: string | null;
  units: string | null;
  reference_range: string | null;
  result_date: string;
};

/**
 * Shared "Test Results" view — used both inside the hospital bedside chart's
 * Overview tab and the patient's own "Lab Results" nav page, so both sides
 * are looking at literally the same component/data.
 */
export function TestResultsPanel({ patientId }: { patientId: string | null | undefined }) {
  const [results, setResults] = useState<LabResult[] | null>(null);

  useEffect(() => {
    if (!patientId) { setResults([]); return; }
    let cancelled = false;
    (async () => {
      const { data: admissions } = await supabase
        .from("hospital_admissions" as any)
        .select("id")
        .eq("patient_id", patientId);
      const admissionIds = ((admissions as any) ?? []).map((a: any) => a.id);
      if (!admissionIds.length) { if (!cancelled) setResults([]); return; }
      const { data } = await supabase
        .from("admission_lab_results" as any)
        .select("id, test_name, result_value, units, reference_range, result_date")
        .in("admission_id", admissionIds)
        .order("result_date", { ascending: false });
      if (!cancelled) setResults(((data as any) ?? []) as LabResult[]);
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  if (results === null) {
    return <p className="px-1 py-4 text-sm text-muted-foreground italic">Loading test results…</p>;
  }

  if (!results.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <FlaskConical className="h-6 w-6 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground italic">No lab results filed yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Test</th>
            <th className="px-3 py-2 text-left">Result</th>
            <th className="px-3 py-2 text-left">Reference Range</th>
            <th className="px-3 py-2 text-right">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {results.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 font-semibold">{r.test_name}</td>
              <td className="px-3 py-2">{r.result_value ?? "—"}{r.units ? ` ${r.units}` : ""}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.reference_range ?? "—"}</td>
              <td className="px-3 py-2 text-right text-muted-foreground">{new Date(r.result_date).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
