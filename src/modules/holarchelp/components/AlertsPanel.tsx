import { usePatientAlerts, type PatientAlert } from "../hooks/usePatientAlerts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  AlertCircle,
  Zap,
  CheckCircle2,
  X,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface AlertsPanelProps {
  patientUserId: string | null;
  className?: string;
}

function AlertIcon({ type }: { type: string }) {
  switch (type) {
    case "allergy":
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case "drug_interaction":
      return <Zap className="h-4 w-4 text-warning" />;
    case "critical_lab":
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
}

function AlertCard({
  alert,
  onAcknowledge,
  onDismiss,
}: {
  alert: PatientAlert;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const bgClass = cn(
    alert.severity === "critical" && "border-destructive/30 bg-destructive/5",
    alert.severity === "warning" && "border-warning/30 bg-warning/5",
    alert.severity === "info" && "border-primary/30 bg-primary/5"
  );

  const borderClass = cn(
    alert.severity === "critical" && "border-destructive/50",
    alert.severity === "warning" && "border-warning/50",
    alert.severity === "info" && "border-primary/50"
  );

  return (
    <Card className={cn(bgClass, borderClass)}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <AlertIcon type={alert.alert_type} />
            <div className="flex-1">
              <p className="font-semibold text-sm">{alert.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {alert.description}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px]">
                  {alert.alert_type.replace("_", " ")}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(alert.created_at), "MMM d, HH:mm")}
                </span>
                {alert.acknowledged && (
                  <Badge variant="secondary" className="text-[10px]">
                    ✓ Acknowledged
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {!alert.acknowledged && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAcknowledge(alert.id)}
                title="Mark as acknowledged"
                className="h-8 w-8 p-0"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDismiss(alert.id)}
              title="Dismiss alert"
              className="h-8 w-8 p-0 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AlertsPanel({ patientUserId, className }: AlertsPanelProps) {
  const { alerts, criticalAlerts, warningAlerts, loading, acknowledgeAlert, dismissAlert } =
    usePatientAlerts(patientUserId);

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
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-2 py-6">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <p className="text-sm font-semibold text-foreground">No Active Alerts</p>
            <p className="text-xs text-muted-foreground">
              Patient has no critical alerts at this time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <AlertTitle className="text-destructive font-bold">
            🔴 {criticalAlerts.length} CRITICAL ALERT{criticalAlerts.length > 1 ? "S" : ""}
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-1">
              {criticalAlerts.map((alert) => (
                <p key={alert.id} className="text-sm font-semibold">
                  • {alert.title}
                </p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for different alert types */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="text-xs">
            All ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="critical" className="text-xs">
            Critical ({criticalAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="warnings" className="text-xs">
            Warnings ({warningAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="allergies" className="text-xs">
            Allergies
          </TabsTrigger>
        </TabsList>

        {/* All Alerts */}
        <TabsContent value="all" className="space-y-2 mt-4">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={acknowledgeAlert}
              onDismiss={dismissAlert}
            />
          ))}
        </TabsContent>

        {/* Critical Only */}
        <TabsContent value="critical" className="space-y-2 mt-4">
          {criticalAlerts.length > 0 ? (
            criticalAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={acknowledgeAlert}
                onDismiss={dismissAlert}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No critical alerts
            </p>
          )}
        </TabsContent>

        {/* Warnings */}
        <TabsContent value="warnings" className="space-y-2 mt-4">
          {warningAlerts.length > 0 ? (
            warningAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={acknowledgeAlert}
                onDismiss={dismissAlert}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No warning alerts
            </p>
          )}
        </TabsContent>

        {/* Allergies */}
        <TabsContent value="allergies" className="space-y-2 mt-4">
          {alerts
            .filter((a) => a.alert_type === "allergy")
            .map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={acknowledgeAlert}
                onDismiss={dismissAlert}
              />
            ))}
          {alerts.filter((a) => a.alert_type === "allergy").length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No allergy alerts
            </p>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-center">
        Alerts are automatically generated from patient medical data
      </p>
    </div>
  );
}
