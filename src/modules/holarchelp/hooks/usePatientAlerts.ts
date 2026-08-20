import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PatientAlert {
  id: string;
  alert_type: "allergy" | "drug_interaction" | "critical_lab" | "high_risk";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  related_data: any;
  created_at: string;
  acknowledged: boolean;
}

export function usePatientAlerts(patientUserId: string | null, enabled = true) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PatientAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!patientUserId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_patient_active_alerts",
        {
          p_patient_id: patientUserId,
        }
      );

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setAlerts((data || []) as PatientAlert[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [patientUserId, enabled]);

  useEffect(() => {
    fetchAlerts();

    if (!patientUserId) return;

    // Subscribe to new alerts
    const channel = supabase
      .channel(`patient-alerts-${patientUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "patient_alerts",
          filter: `patient_user_id=eq.${patientUserId}`,
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientUserId, fetchAlerts]);

  const acknowledgeAlert = useCallback(
    async (alertId: string) => {
      if (!user?.id) return;

      const { error: rpcError } = await supabase.rpc("acknowledge_alert", {
        p_alert_id: alertId,
        p_staff_user_id: user.id,
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      // Refresh alerts
      fetchAlerts();
    },
    [user?.id, fetchAlerts]
  );

  const dismissAlert = useCallback(
    async (alertId: string) => {
      const { error } = await supabase
        .from("patient_alerts")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", alertId);

      if (error) {
        setError(error.message);
        return;
      }

      // Refresh alerts
      fetchAlerts();
    },
    [fetchAlerts]
  );

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  return {
    alerts,
    criticalAlerts,
    warningAlerts,
    loading,
    error,
    refetch: fetchAlerts,
    acknowledgeAlert,
    dismissAlert,
  };
}
