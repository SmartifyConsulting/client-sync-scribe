import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertTriangle, TrendingUp, BarChart3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComplianceMetric {
  metric_name: string;
  compliance_rate: number;
  target_rate: number;
  status: string;
}

interface ProtocolCompliance {
  protocol_name: string;
  compliance_percent: number;
  compliant: boolean;
  items_completed: number;
  items_total: number;
}

interface ComplianceDashboardProps {
  hospitalId?: string | null;
  incidentId?: string | null;
  className?: string;
}

export function ComplianceDashboard({
  hospitalId,
  incidentId,
  className,
}: ComplianceDashboardProps) {
  const [metrics, setMetrics] = useState<ComplianceMetric[]>([]);
  const [protocolCompliance, setProtocolCompliance] = useState<ProtocolCompliance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hospitalId && !incidentId) return;

    const fetchCompliance = async () => {
      setLoading(true);
      try {
        // Fetch hospital metrics
        if (hospitalId) {
          const { data: metricsData } = await supabase.rpc(
            "calculate_hospital_compliance_metrics",
            {
              p_hospital_id: hospitalId,
              p_period_days: 30,
            }
          );
          setMetrics(metricsData || []);
        }

        // Fetch protocol compliance for incident
        if (incidentId) {
          const { data: protocolData } = await supabase.rpc(
            "calculate_protocol_compliance_score",
            {
              p_incident_id: incidentId,
            }
          );
          setProtocolCompliance(protocolData || []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCompliance();
  }, [hospitalId, incidentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const overallCompliance =
    metrics.length > 0
      ? (metrics.reduce((sum, m) => sum + m.compliance_rate, 0) / metrics.length) * 100
      : 0;
  const status =
    overallCompliance >= 95
      ? "EXCELLENT"
      : overallCompliance >= 85
        ? "GOOD"
        : overallCompliance >= 75
          ? "FAIR"
          : "NEEDS IMPROVEMENT";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Overall Compliance Score */}
      <Card className={cn(
        overallCompliance >= 90 ? "border-green-500/30 bg-green-50 dark:bg-green-950/20" : "border-orange-500/30 bg-orange-50 dark:bg-orange-950/20"
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overall Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-4xl font-bold">{overallCompliance.toFixed(1)}%</span>
            <Badge className={cn(
              overallCompliance >= 90 ? "bg-green-600" : "bg-orange-600"
            )}>
              {status}
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                overallCompliance >= 90 ? "bg-green-600" : "bg-orange-600"
              )}
              style={{ width: `${overallCompliance}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Target: 95% • Period: Last 30 days
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="metrics" className="text-xs">
            Metrics
          </TabsTrigger>
          <TabsTrigger value="protocols" className="text-xs">
            Protocols
          </TabsTrigger>
        </TabsList>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-3 mt-4">
          {metrics.length > 0 ? (
            metrics.map((metric, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{metric.metric_name}</span>
                      <Badge variant={metric.status === "COMPLIANT" ? "default" : "secondary"}>
                        {metric.status}
                      </Badge>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold">
                        {(metric.compliance_rate * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Target: {(metric.target_rate * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          metric.status === "COMPLIANT" ? "bg-green-600" : "bg-orange-600"
                        )}
                        style={{ width: `${Math.min(metric.compliance_rate * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hospital data available
            </p>
          )}
        </TabsContent>

        {/* Protocols Tab */}
        <TabsContent value="protocols" className="space-y-3 mt-4">
          {protocolCompliance.length > 0 ? (
            protocolCompliance.map((protocol, i) => (
              <Card key={i} className={cn(
                protocol.compliant ? "border-green-500/30" : "border-orange-500/30"
              )}>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {protocol.compliant ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                      )}
                      <span className="text-sm font-semibold flex-1">
                        {protocol.protocol_name}
                      </span>
                      <span className="text-sm font-bold">
                        {protocol.compliance_percent}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {protocol.items_completed} of {protocol.items_total} items completed
                    </p>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          protocol.compliant ? "bg-green-600" : "bg-orange-600"
                        )}
                        style={{ width: `${protocol.compliance_percent}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No protocol data available
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Compliance Alert */}
      {overallCompliance < 90 && (
        <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-700 dark:text-orange-300">
            Below Target Compliance
          </AlertTitle>
          <AlertDescription className="text-orange-600 dark:text-orange-400 text-xs mt-1">
            Hospital compliance is below 90%. Review specific metrics and protocols to identify improvement areas.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
