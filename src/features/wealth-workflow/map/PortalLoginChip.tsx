import { Badge } from "@/components/ui/badge";

export function PortalLoginChip({ at }: { at?: string | null }) {
  const date = at ? new Date(at) : null;
  const valid = date && !Number.isNaN(date.getTime());
  return <Badge variant="outline" className="text-2xs px-1.5 py-0 font-normal whitespace-normal text-right"
    title={valid ? `Confirmed by Companion: ${date.toLocaleString("en-ZA")}` : "No successful Companion login recorded yet. Manual portal logins are not tracked."}>
    Last successful login · {valid ? date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "Not recorded yet"}
  </Badge>;
}
