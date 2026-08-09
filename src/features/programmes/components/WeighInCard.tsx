import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWeighIns } from "../usePatientProgrammes";
import { VULA_MATRIX, kgToStones } from "../types";

/** Doctors log a weigh-in at check-in and award Vulas for weight lost. */
export function WeighInCard({ patientId, canRecord }: { patientId: string; canRecord: boolean }) {
  const { toast } = useToast();
  const { weighIns, latest, record } = useWeighIns(patientId);
  const [weight, setWeight] = useState("");
  const [award, setAward] = useState(true);

  const submit = async () => {
    const kg = Number(weight);
    if (!kg || kg <= 0) {
      toast({ title: "Enter a valid weight", variant: "destructive" });
      return;
    }
    const res = await record.mutateAsync({ weight_kg: kg, awardVulas: award });
    setWeight("");
    toast({
      title: "Weigh-in recorded",
      description:
        res.vulas > 0
          ? `${res.kgLost.toFixed(1)} kg (${kgToStones(res.kgLost).toFixed(2)} st) lost — ${res.vulas} Vulas awarded.`
          : "No weight loss recorded since the last weigh-in.",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Scale className="h-4 w-4 text-primary" /> Weigh-ins
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {latest ? (
          <p className="text-xs text-muted-foreground">
            Last recorded <span className="font-bold text-foreground">{Number(latest.weight_kg)} kg</span> (
            {kgToStones(Number(latest.weight_kg)).toFixed(2)} st) on{" "}
            {new Date(latest.recorded_at).toLocaleDateString()}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No weigh-ins recorded yet.</p>
        )}

        {canRecord && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                className="h-8 text-sm"
                type="number"
                step="0.1"
                placeholder="Weight (kg)"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <Button size="sm" className="h-8" onClick={submit} disabled={record.isPending}>
                Record
              </Button>
            </div>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Checkbox checked={award} onCheckedChange={(v) => setAward(!!v)} />
              Award {VULA_MATRIX.perKilogramLost} Vulas per kilogram lost
            </label>
          </div>
        )}

        {weighIns.length > 0 && (
          <ul className="divide-y divide-border border-t border-border pt-1 text-[12px]">
            {weighIns.slice(0, 5).map((w) => (
              <li key={w.id} className="flex items-center justify-between py-1">
                <span>{new Date(w.recorded_at).toLocaleDateString()}</span>
                <span className="font-bold">{Number(w.weight_kg)} kg</span>
                <span className="text-primary">
                  {Number(w.kg_lost) > 0 ? `-${Number(w.kg_lost).toFixed(1)} kg` : "—"}
                </span>
                <span className="text-muted-foreground">{w.vulas_awarded} Vulas</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
