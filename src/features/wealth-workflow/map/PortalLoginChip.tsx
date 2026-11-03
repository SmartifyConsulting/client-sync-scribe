import { Badge } from "@/components/ui/badge";

export function PortalLoginChip({ at, outcome }: { at?: string | null; outcome?: "success" | "failed" | "unconfirmed" | null }) {
  const date = at ? new Date(at) : null;
  const valid = date && !Number.isNaN(date.getTime());
  const recorded = valid && outcome;
  const status = outcome === "success" ? "Connected" : outcome === "failed" ? "Failed" : "Not confirmed";
  const color = !recorded ? "text-muted-foreground" : outcome === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800";
  return <Badge variant="outline" className={`text-2xs px-1.5 py-0 font-normal whitespace-normal text-right ${color}`}
    title={recorded ? `${status}: ${date.toLocaleString("en-ZA")}${outcome === "unconfirmed" ? ". Timed out; this does not mean the password is incorrect." : ""}` : "No Companion connection recorded yet. Manual portal logins are not tracked."}>
    Last connect · {recorded ? `${date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })} · ${status}` : "Not recorded yet"}
  </Badge>;
}
