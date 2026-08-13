import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { LineChart as LineChartIcon } from "lucide-react";
import { filterByRange, sortByDateDesc, isMethodTransition, type ChartRange } from "./ageingMath";
import type { BiologicalAgeAssessment } from "./types";

const RANGES: { key: ChartRange; label: string }[] = [
  { key: "6m", label: "6 months" },
  { key: "1y", label: "1 year" },
  { key: "3y", label: "3 years" },
  { key: "all", label: "All time" },
];

export function AgeingTrajectoryChart({ assessments }: { assessments: BiologicalAgeAssessment[] }) {
  const [range, setRange] = useState<ChartRange>("all");

  const data = useMemo(() => {
    const rows = sortByDateDesc(filterByRange(assessments, range)).reverse();
    return rows.map((r, i) => {
      const prior = i > 0 ? rows[i - 1] : null;
      return {
        date: r.assessment_date,
        biological: r.biological_age !== null ? Number(r.biological_age) : null,
        chronological: r.chronological_age !== null ? Number(r.chronological_age) : null,
        transition: isMethodTransition(r, prior),
        model: r.model_name || "Model not recorded",
      };
    });
  }, [assessments, range]);

  const hasTransition = data.some((d) => d.transition);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Ageing Trajectory</p>
          <p className="text-xs text-muted-foreground">Biological age compared with chronological age over time.</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              size="sm"
              variant={range === r.key ? "default" : "outline"}
              className="h-7 text-[11px]"
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {data.length < 2 ? (
        <EmptyState
          icon={<LineChartIcon className="h-6 w-6" />}
          title="Your trajectory is just beginning"
          description="A second assessment will let you see how your biological age is tracking over time."
        />
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 3", "dataMax + 3"]} />
                <RTooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number, name: string) => [
                    value === null ? "—" : `${Number(value).toFixed(1)} yrs`,
                    name === "biological" ? "Biological age" : "Chronological age",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="chronological"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line type="monotone" dataKey="biological" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {hasTransition && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              One or more results were produced with a different model or laboratory. Those values are not directly
              equivalent and should be read as separate series rather than a continuous measurement.
            </p>
          )}
        </>
      )}
    </div>
  );
}
