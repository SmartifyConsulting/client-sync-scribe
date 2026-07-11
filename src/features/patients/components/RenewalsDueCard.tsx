import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePrescriptionRenewals, type RenewalCandidate } from "@/features/patients/hooks/usePrescriptionRenewals";
import { RenewalRequestDialog } from "./RenewalRequestDialog";

interface Props {
  patientId: string;
  patientUserId: string;
}

export function RenewalsDueCard({ patientId, patientUserId }: Props) {
  const { data: renewals = [], isLoading } = usePrescriptionRenewals(patientId);
  const [selected, setSelected] = useState<RenewalCandidate | null>(null);

  if (isLoading || renewals.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Pill className="h-4 w-4 text-primary" />
          Renewals due
        </CardTitle>
        <CardDescription className="text-sm">
          Prescriptions reaching the end of their cycle. Tap to request a renewal — add a note if you'd like something adjusted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {renewals.map((r) => {
          const requested = r.existing_request_status === "pending";
          return (
            <div key={r.prescription_id} className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-border">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-foreground truncate">{r.medication}</p>
                  {r.is_expired ? (
                    <Badge variant="destructive" className="text-[9px] gap-1"><AlertTriangle className="h-3 w-3" /> Expired</Badge>
                  ) : r.days_until_expiry !== null ? (
                    <Badge variant="outline" className="text-[9px]">Ends in {r.days_until_expiry}d</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px]">No refills left</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {[r.dosage, r.frequency].filter(Boolean).join(" • ")}
                  {r.doctor_name ? ` • Dr. ${r.doctor_name}` : ""}
                </p>
              </div>
              {requested ? (
                <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                  <CheckCircle2 className="h-3 w-3" /> Requested
                </Badge>
              ) : (
                <Button size="sm" variant="outline" className="text-xs h-7 shrink-0" onClick={() => setSelected(r)}>
                  Request renewal
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>

      <RenewalRequestDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        candidate={selected}
        patientId={patientId}
        patientUserId={patientUserId}
      />
    </Card>
  );
}
