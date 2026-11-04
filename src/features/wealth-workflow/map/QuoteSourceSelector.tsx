import { AlertTriangle, Bot, Mail, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANNING_WARNING, type QuoteSource } from "./quoteSourcing";

const METHODS = [
  { id: "companion", label: "Live Companion RPA", detail: "Official insurer calculation · portal verification may be required", icon: Bot },
  { id: "email", label: "Email insurer quote desk", detail: "Official insurer reply · request and await the quote PDF", icon: Mail },
  { id: "planning", label: "Indicative planning", detail: "Broker-entered estimate · not an insurer calculation", icon: Calculator },
] as const;

export function QuoteSourceSelector({ value, onChange }: { value: QuoteSource; onChange: (source: QuoteSource) => void }) {
  return <section className="space-y-2" aria-label="Quote sourcing method">
    <h4 className="text-xs font-semibold">Quote sourcing method</h4>
    <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Choose quote method">
      {METHODS.map(({ id, label, detail, icon: Icon }) => <Button key={id} variant={value === id ? "default" : "outline"} aria-pressed={value === id} onClick={() => onChange(id)} className="h-auto min-h-11 items-start justify-start gap-2 whitespace-normal px-3 py-2 text-left">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="min-w-0"><span className="block text-xs font-semibold">{label}</span><span className="mt-1 block text-[11px] font-normal">{detail}</span></span>
      </Button>)}
    </div>
    {value === "planning" && <p role="alert" className="flex items-start gap-2 border-l-2 border-destructive bg-muted/40 p-3 text-xs"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />{PLANNING_WARNING}</p>}
    {value === "email" && <p className="text-xs text-muted-foreground">A request is not a quote. Await the insurer’s calculation and attach its official PDF.</p>}
  </section>;
}