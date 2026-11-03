import { Badge } from "@/components/ui/badge";
import { Plug, Unplug } from "lucide-react";

export function PortalLoginChip({ at, outcome }: { at?: string | null; outcome?: "success" | "failed" | "unconfirmed" | null }) {
  const date = at ? new Date(at) : null;
  const valid = date && !Number.isNaN(date.getTime());
  const recorded = valid && outcome;
  const status = outcome === "success" ? "Connected" : outcome === "failed" ? "Failed" : "Timed out";
  const color = !recorded ? "text-muted-foreground" : outcome === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800";
  const Icon = recorded && outcome === "success" ? Plug : Unplug;
  return <Badge variant="outline" className={`gap-1 text-2xs px-1.5 py-0 font-normal whitespace-normal text-right ${color}`}
    aria-label={recorded ? `${status}, ${date.toLocaleString()}` : "No connection recorded"}
    title={recorded ? `${status}: ${date.toLocaleString("en-ZA")}${outcome === "unconfirmed" ? ". Timed out; this does not mean the password is incorrect." : ""}` : "No confirmed connection recorded yet. Open the configured portal with the Companion active."}>
    <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />{recorded ? `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "—"}
  </Badge>;
}
