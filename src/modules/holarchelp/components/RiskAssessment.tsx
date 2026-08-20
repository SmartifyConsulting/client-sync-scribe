import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Heart, TrendingUp, Loader2, AlertCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskScore {
  total_risk_score: number;
  risk_level: string;
  risk_factors: string[];
  escalation_required: boolean;
  escalation_reason: string | null;
}

interface RiskAssessmentProps {
  patientUserId: string | null;
  incidentId?: string | null;
  className?: string;
}

export function RiskAssessment({
  patientUserId,
  incidentId,
  className,
}: RiskAssessmentProps) {
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientUserId) return;

    const calculateRisk = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          "calculate_patient_risk_score",
          {
            p_patient_id: patientUserId,
            p_incident_id: incidentId || null,
          }
        );

        if (rpcError) {
          setError(rpcError.message);
          return;
        }

        if (data && data.length > 0) {
          setRiskScore(data[0] as RiskScore);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    calculateRisk();
  }, [patientUserId, incidentId]);

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
        <AlertTitle>Error Calculating Risk</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!riskScore) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Unable to calculate risk score
          </p>
        </CardContent>
      </Card>
    );
  }

  const riskBgClass = cn(
    riskScore.risk_level === "CRITICAL" && "bg-destructive/10 border-destructive/30",
    riskScore.risk_level === "HIGH" && "bg-warning/10 border-warning/30",
    riskScore.risk_level === "MODERATE" && "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
    riskScore.risk_level === "LOW" && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
  );

  const riskTextClass = cn(
    riskScore.risk_level === "CRITICAL" && "text-destructive",
    riskScore.risk_level === "HIGH" && "text-warning",
    riskScore.risk_level === "MODERATE" && "text-orange-700 dark:text-orange-300",
    riskScore.risk_level === "LOW" && "text-green-700 dark:text-green-300"
  );

  const riskIcon = cn(
    riskScore.risk_level === "CRITICAL" && "text-destructive",
    riskScore.risk_level === "HIGH" && "text-warning",
    riskScore.risk_level === "MODERATE" && "text-orange-500",
    riskScore.risk_level === "LOW" && "text-green-600"
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Escalation Alert */}
      {riskScore.escalation_required && riskScore.escalation_reason && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <Phone className="h-5 w-5 text-destructive" />
          <AlertTitle className="text-destructive font-bold">
            🚨 ESCALATION REQUIRED
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="font-semibold text-sm mb-2">{riskScore.escalation_reason}</p>
            <p className="text-xs">Notify attending physician immediately</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Risk Score Card */}
      <Card className={cn("border-2", riskBgClass)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className={cn("text-sm flex items-center gap-2", riskTextClass)}>
                <TrendingUp className={cn("h-5 w-5", riskIcon)} />
                Risk Assessment
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Patient safety risk score
              </p>
            </div>
            <div className="text-right">
              <p className={cn("text-3xl font-bold", riskTextClass)}>
                {riskScore.total_risk_score}
              </p>
              <Badge className={cn("mt-1", getRiskBadgeClass(riskScore.risk_level))}>
                {riskScore.risk_level}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Risk Scale */}
          <div>
            <p className="text-xs font-semibold mb-2">Risk Scale</p>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>LOW</span>
              <span>MODERATE</span>
              <span>HIGH</span>
              <span>CRITICAL</span>
            </div>
            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
              <div className="flex-1 bg-green-500" />
              <div className="flex-1 bg-orange-500" />
              <div className="flex-1 bg-warning" />
              <div className="flex-1 bg-destructive" />
            </div>
            <div className="flex justify-center mt-2">
              <div
                className="h-4 w-1 bg-primary rounded-full"
                style={{
                  position: "relative",
                  left: `${(riskScore.total_risk_score / 60) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Risk Breakdown */}
          {riskScore.risk_factors.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2">Contributing Factors</p>
              <div className="space-y-1.5">
                {riskScore.risk_factors.map((factor, i) => (
                  <div
                    key={i}
                    className="text-xs p-2 bg-white dark:bg-slate-950 rounded border border-muted"
                  >
                    <p className="text-foreground">{factor}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Interpretation */}
          <div className={cn("p-3 rounded border", getRiskBgClass(riskScore.risk_level))}>
            <p className={cn("text-xs font-semibold mb-1", getRiskTextClass(riskScore.risk_level))}>
              {getRiskInterpretation(riskScore.risk_level).title}
            </p>
            <p className="text-xs text-muted-foreground">
              {getRiskInterpretation(riskScore.risk_level).description}
            </p>
          </div>

          {/* Recommendations */}
          <div>
            <p className="text-xs font-semibold mb-2">Recommended Actions</p>
            <ul className="space-y-1">
              {getRecommendations(riskScore.risk_level).map((rec, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Risk score updated based on current medical data
      </p>
    </div>
  );
}

function getRiskBadgeClass(level: string): string {
  switch (level) {
    case "CRITICAL":
      return "bg-destructive text-white";
    case "HIGH":
      return "bg-warning text-black";
    case "MODERATE":
      return "bg-orange-500 text-white";
    case "LOW":
      return "bg-green-600 text-white";
    default:
      return "bg-muted";
  }
}

function getRiskBgClass(level: string): string {
  switch (level) {
    case "CRITICAL":
      return "bg-destructive/10 border-destructive/30";
    case "HIGH":
      return "bg-warning/10 border-warning/30";
    case "MODERATE":
      return "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800";
    case "LOW":
      return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800";
    default:
      return "bg-muted";
  }
}

function getRiskTextClass(level: string): string {
  switch (level) {
    case "CRITICAL":
      return "text-destructive";
    case "HIGH":
      return "text-warning";
    case "MODERATE":
      return "text-orange-700 dark:text-orange-300";
    case "LOW":
      return "text-green-700 dark:text-green-300";
    default:
      return "text-foreground";
  }
}

interface RiskInfo {
  title: string;
  description: string;
}

function getRiskInterpretation(level: string): RiskInfo {
  switch (level) {
    case "CRITICAL":
      return {
        title: "🔴 CRITICAL RISK",
        description:
          "Patient has multiple severe risk factors. Immediate escalation and close monitoring required. Contact senior physician.",
      };
    case "HIGH":
      return {
        title: "🟠 HIGH RISK",
        description:
          "Patient has significant risk factors. Enhanced monitoring and specialized interventions may be needed.",
      };
    case "MODERATE":
      return {
        title: "🟡 MODERATE RISK",
        description:
          "Patient has some risk factors. Routine monitoring and standard precautions are recommended.",
      };
    case "LOW":
      return {
        title: "🟢 LOW RISK",
        description:
          "Patient risk profile is favorable. Standard care protocols are appropriate.",
      };
    default:
      return { title: "Unknown", description: "Unable to determine risk level" };
  }
}

function getRecommendations(level: string): string[] {
  switch (level) {
    case "CRITICAL":
      return [
        "Notify attending physician immediately",
        "Implement enhanced monitoring protocols",
        "Establish ICU-level care if needed",
        "Review all medications for interactions",
        "Prepare for complications",
        "Document all interventions thoroughly",
      ];
    case "HIGH":
      return [
        "Close supervision by clinical staff",
        "Monitor vital signs every 15 minutes",
        "Review medication regimen carefully",
        "Prepare for potential complications",
        "Notify senior staff of status",
      ];
    case "MODERATE":
      return [
        "Continue routine monitoring",
        "Document risk factors in chart",
        "Review protocols regularly",
        "Educate patient on risk mitigation",
      ];
    case "LOW":
      return [
        "Continue standard protocols",
        "Routine follow-up and monitoring",
        "Maintain current treatment plan",
      ];
    default:
      return ["Assess and monitor patient status"];
  }
}
