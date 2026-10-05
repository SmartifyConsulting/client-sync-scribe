import { TargetsCommission } from "@/features/wealth-workflow/TargetsCommission";

export default function Earnings() {
  return (
    <div className="space-y-4 md:space-y-8 animate-fade-in">
      <div className="pb-2">
        <h1 className="page-title">Earnings &amp; Targets</h1>
        <p className="mt-2 text-muted-foreground text-xs">
          Track issued business and commission against your annual targets.
        </p>
      </div>
      <TargetsCommission />
    </div>
  );
}
