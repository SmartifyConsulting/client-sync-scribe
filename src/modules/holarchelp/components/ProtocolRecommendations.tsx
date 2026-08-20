import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertTriangle, ClipboardList, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Protocol {
  protocol_id: string;
  protocol_name: string;
  protocol_code: string;
  priority_level: string;
  matching_conditions: string[];
  checklist_items: string[];
  recommended_medications: string[];
  contraindicated_meds: string[];
}

interface ProtocolRecommendationsProps {
  patientUserId: string | null;
  className?: string;
}

export function ProtocolRecommendations({
  patientUserId,
  className,
}: ProtocolRecommendationsProps) {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklistStates, setChecklistStates] = useState<Record<string, boolean[]>>({});

  useEffect(() => {
    if (!patientUserId) return;

    const fetchProtocols = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          "get_recommended_protocols",
          {
            p_patient_id: patientUserId,
          }
        );

        if (rpcError) {
          setError(rpcError.message);
          return;
        }

        setProtocols((data || []) as Protocol[]);

        // Initialize checklist states
        const states: Record<string, boolean[]> = {};
        (data || []).forEach((protocol: Protocol) => {
          states[protocol.protocol_code] = new Array(
            protocol.checklist_items.length
          ).fill(false);
        });
        setChecklistStates(states);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchProtocols();
  }, [patientUserId]);

  if (!patientUserId) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No patient selected
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Protocols</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const urgentProtocols = protocols.filter((p) => p.priority_level === "urgent");
  const standardProtocols = protocols.filter((p) => p.priority_level !== "urgent");

  return (
    <div className={cn("space-y-4", className)}>
      {/* Urgent Protocols Banner */}
      {urgentProtocols.length > 0 && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <AlertTitle className="text-destructive font-bold">
            🚨 {urgentProtocols.length} URGENT PROTOCOL{urgentProtocols.length > 1 ? "S" : ""}
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-1">
              {urgentProtocols.map((protocol) => (
                <p key={protocol.protocol_id} className="text-sm font-semibold">
                  • {protocol.protocol_name}
                </p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for protocols */}
      {protocols.length > 0 ? (
        <Tabs defaultValue="urgent" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="urgent" className="text-xs">
              Urgent ({urgentProtocols.length})
            </TabsTrigger>
            <TabsTrigger value="standard" className="text-xs">
              Standard ({standardProtocols.length})
            </TabsTrigger>
          </TabsList>

          {/* Urgent Protocols */}
          <TabsContent value="urgent" className="space-y-3 mt-4">
            {urgentProtocols.length > 0 ? (
              urgentProtocols.map((protocol) => (
                <ProtocolCard
                  key={protocol.protocol_id}
                  protocol={protocol}
                  checklistState={checklistStates[protocol.protocol_code] || []}
                  onChecklistChange={(index) => {
                    const newState = [...(checklistStates[protocol.protocol_code] || [])];
                    newState[index] = !newState[index];
                    setChecklistStates({
                      ...checklistStates,
                      [protocol.protocol_code]: newState,
                    });
                  }}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No urgent protocols
              </p>
            )}
          </TabsContent>

          {/* Standard Protocols */}
          <TabsContent value="standard" className="space-y-3 mt-4">
            {standardProtocols.length > 0 ? (
              standardProtocols.map((protocol) => (
                <ProtocolCard
                  key={protocol.protocol_id}
                  protocol={protocol}
                  checklistState={checklistStates[protocol.protocol_code] || []}
                  onChecklistChange={(index) => {
                    const newState = [...(checklistStates[protocol.protocol_code] || [])];
                    newState[index] = !newState[index];
                    setChecklistStates({
                      ...checklistStates,
                      [protocol.protocol_code]: newState,
                    });
                  }}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No standard protocols
              </p>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-2 py-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="text-sm font-semibold">No Protocols Needed</p>
              <p className="text-xs text-muted-foreground">
                Patient conditions don't match any protocols
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Protocols automatically matched to patient conditions
      </p>
    </div>
  );
}

interface ProtocolCardProps {
  protocol: Protocol;
  checklistState: boolean[];
  onChecklistChange: (index: number) => void;
}

function ProtocolCard({ protocol, checklistState, onChecklistChange }: ProtocolCardProps) {
  const completedItems = checklistState.filter((checked) => checked).length;
  const completionPercent = Math.round(
    (completedItems / protocol.checklist_items.length) * 100
  );

  return (
    <Card
      className={cn(
        protocol.priority_level === "urgent" &&
          "border-destructive/30 bg-destructive/5"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              {protocol.protocol_name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Code: {protocol.protocol_code}
            </p>
          </div>
          <Badge
            variant={protocol.priority_level === "urgent" ? "destructive" : "outline"}
            className="text-[10px]"
          >
            {protocol.priority_level}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Matching Conditions */}
        <div>
          <p className="text-xs font-semibold mb-2">Applies To:</p>
          <div className="flex flex-wrap gap-1">
            {protocol.matching_conditions.map((condition, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {condition}
              </Badge>
            ))}
          </div>
        </div>

        {/* Recommended Medications */}
        {protocol.recommended_medications.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">💊 Recommended Medications:</p>
            <ul className="space-y-1">
              {protocol.recommended_medications.map((med, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  • {med}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Contraindicated Meds */}
        {protocol.contraindicated_meds.length > 0 && (
          <div className="p-2 bg-warning/10 border border-warning/30 rounded">
            <p className="text-xs font-semibold text-warning mb-1">⚠️ Avoid:</p>
            <ul className="space-y-0.5">
              {protocol.contraindicated_meds.map((med, i) => (
                <li key={i} className="text-xs text-warning/80">
                  • {med}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold">Checklist</p>
            <span className="text-xs text-muted-foreground">
              {completionPercent}% ({completedItems}/{protocol.checklist_items.length})
            </span>
          </div>
          <div className="space-y-2">
            {protocol.checklist_items.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <Checkbox
                  checked={checklistState[i] || false}
                  onCheckedChange={() => onChecklistChange(i)}
                  className="mt-1"
                />
                <label className="text-xs cursor-pointer leading-relaxed">
                  {item}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
