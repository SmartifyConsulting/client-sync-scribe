import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import EmergencyHubScreen from "./EmergencyHubScreen";

/**
 * Landing screen for /provider/hospital. Nurses land on their own shift/ward
 * dashboard rather than the Emergency Hub — a nurse has no reason to see the
 * hospital-wide emergency console, and this also makes the sidebar's
 * "Dashboard" nav item highlight correctly on login instead of matching no
 * route at all.
 */
export default function HospitalIndexScreen() {
  const { isNurse, loading } = useUserRole();

  if (loading) return null;
  if (isNurse) return <Navigate to="/provider/hospital/nurse-dashboard" replace />;
  return <EmergencyHubScreen />;
}
