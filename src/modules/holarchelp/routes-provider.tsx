import { Routes, Route, Navigate } from "react-router-dom";
import { ProviderGate } from "./components/ProviderGate";
import { useProviderCapabilities } from "./hooks/useProviderCapabilities";
import { HospitalInboundListener } from "./components/HospitalInboundListener";
import ProviderRedirect from "./pages/provider/ProviderRedirect";
import ProviderProfile from "./pages/provider/ProviderProfile";

import ErCoordinationScreen from "./pages/provider/hospital/ErCoordinationScreen";
import IncomingAmbulancesScreen from "./pages/provider/hospital/IncomingAmbulancesScreen";
import TriageScreen from "./pages/provider/hospital/TriageScreen";
import TraumaBaysScreen from "./pages/provider/hospital/TraumaBaysScreen";
import DischargesScreen from "./pages/provider/hospital/DischargesScreen";


import HospitalOpsLayout from "./pages/provider/hospital/HospitalOpsLayout";
import EmergencyHubScreen from "./pages/provider/hospital/EmergencyHubScreen";
import AdmissionsScreen from "./pages/provider/hospital/AdmissionsScreen";
import HospitalDashboardScreen from "./pages/provider/hospital/HospitalDashboardScreen";
import HospitalAdminDashboard from "./pages/provider/hospital/HospitalAdminDashboard";
import WardBoardScreen from "./pages/provider/hospital/WardBoardScreen";
import ShiftsScreen from "./pages/provider/hospital/ShiftsScreen";
import MyShiftScreen from "./pages/provider/hospital/MyShiftScreen";
import IncidentTimelineScreen from "./pages/provider/hospital/IncidentTimelineScreen";
import ProvidersScreen from "./pages/provider/hospital/ProvidersScreen";
import HospitalIncidentConsole from "./pages/provider/HospitalIncidentConsole";
import AdministratorsScreen from "./pages/provider/AdministratorsScreen";

import AmbulanceOpsLayout from "./pages/provider/ambulance/AmbulanceOpsLayout";
import NavigationScreen from "./pages/provider/ambulance/NavigationScreen";
// TeamStatusScreen retired — redirects to Admin → Crew
import AmbulanceIncidentConsole from "./pages/provider/AmbulanceIncidentConsole";

// Vehicle Abuse Prevention screens (detail drilldown views)
import VehicleAbuseScreen from "./pages/provider/ambulance/VehicleAbuseScreen";
import GeofenceScreen from "./pages/provider/ambulance/GeofenceScreen";
import RouteDeviationScreen from "./pages/provider/ambulance/RouteDeviationScreen";
import AfterHoursScreen from "./pages/provider/ambulance/AfterHoursScreen";
import UnlinkedTripsScreen from "./pages/provider/ambulance/UnlinkedTripsScreen";

// Fleet detail screens (deep-link profiles)
import VehicleProfileScreen from "./pages/provider/ambulance/VehicleProfileScreen";

// Consolidated Screens (Option A: Aggressive Consolidation)
import EmergencyDashboardScreen from "./pages/provider/ambulance/EmergencyDashboardScreen";
import ErOpsDashboard from "./pages/provider/ambulance/ErOpsDashboard";

// EMS workflow screens (Dispatch Console / Incidents / Vehicles / Crews / Hospitals)
import DispatchConsoleScreen from "./pages/provider/ambulance/DispatchConsoleScreen";
import IncidentsScreen from "./pages/provider/ambulance/IncidentsScreen";
import VehiclesScreen from "./pages/provider/ambulance/VehiclesScreen";
import CrewsScreen from "./pages/provider/ambulance/CrewsScreen";
import AmbulanceHospitalsScreen from "./pages/provider/ambulance/HospitalsScreen";

import FleetOperationsScreen from "./pages/provider/ambulance/FleetOperationsScreen";
import HospitalNetworkScreen from "./pages/provider/ambulance/HospitalNetworkScreen";
import RealTimeMonitoringScreen from "./pages/provider/ambulance/RealTimeMonitoringScreen";

// Additional Management Screens
// DriverManagementScreen retired — crew lives in User Admin role accordions
import BillingDashboardScreen from "./pages/provider/BillingDashboardScreen";
import ExecutiveDashboardScreen from "./pages/provider/ExecutiveDashboardScreen";
import AlertsCentreScreen from "./pages/provider/AlertsCentreScreen";
// DispatcherConsoleScreen merged into EmergencyDashboardScreen
// IncomingSosScreen retired — merged into EmergencyDashboardScreen

// Incident & Dispatch Management screens
import CreateIncidentScreen from "./pages/provider/hospital/CreateIncidentScreen";
import IncidentLocationScreen from "./pages/provider/hospital/IncidentLocationScreen";
import IncidentTriageScreen from "./pages/provider/hospital/IncidentTriageScreen";
import NearestAmbulanceScreen from "./pages/provider/hospital/NearestAmbulanceScreen";
import DispatchAssignmentScreen from "./pages/provider/hospital/DispatchAssignmentScreen";
import ActiveDispatchScreen from "./pages/provider/hospital/ActiveDispatchScreen";
import DispatchQueueScreen from "./pages/provider/hospital/DispatchQueueScreen";
import MultiIncidentBoardScreen from "./pages/provider/hospital/MultiIncidentBoardScreen";
import HospitalSelectionScreen from "./pages/provider/hospital/HospitalSelectionScreen";
import DispatchReassignmentScreen from "./pages/provider/hospital/DispatchReassignmentScreen";
import ManualOverrideScreen from "./pages/provider/hospital/ManualOverrideScreen";

function ProviderShell({ children }: { children: React.ReactNode }) {
  return (
    <ProviderGate>
      <HospitalInboundListener />
      {children}
    </ProviderGate>
  );
}

/** Renders children only when the provider capability is enabled. */
function CapabilityRoute({
  check,
  children,
}: {
  check: (caps: ReturnType<typeof useProviderCapabilities>["capabilities"]) => boolean;
  children: React.ReactNode;
}) {
  const { capabilities, loading } = useProviderCapabilities();
  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }
  if (!check(capabilities)) return <Navigate to="/provider/hospital/dashboard" replace />;
  return <>{children}</>;
}

const EmergencyCapability = ({ children }: { children: React.ReactNode }) => (
  <CapabilityRoute check={(c) => c.hasEmergencyDepartment}>{children}</CapabilityRoute>
);

const FleetCapability = ({ children }: { children: React.ReactNode }) => (
  <CapabilityRoute check={(c) => c.operatesOwnAmbulanceFleet}>{children}</CapabilityRoute>
);



export default function ProviderRoutes() {
  return (
    <Routes>
      <Route index element={<ProviderShell><ProviderRedirect /></ProviderShell>} />
      {/* Back-compat: old /provider/incident/:id deep-links */}
      <Route path="incident/:id" element={<ProviderShell><ProviderRedirect incidentMode /></ProviderShell>} />
      {/* Forward-friendly alias: /provider/er → /provider/ambulance */}
      <Route path="er" element={<Navigate to="/provider/ambulance" replace />} />
      <Route path="er/*" element={<Navigate to="/provider/ambulance" replace />} />
      <Route path="hospital" element={<ProviderShell><HospitalOpsLayout /></ProviderShell>}>
        {/* Emergency module */}
        <Route index element={<EmergencyHubScreen />} />
        <Route path="er" element={<EmergencyCapability><ErCoordinationScreen /></EmergencyCapability>} />
        <Route path="incoming" element={<EmergencyCapability><IncomingAmbulancesScreen /></EmergencyCapability>} />
        <Route path="triage" element={<EmergencyCapability><TriageScreen /></EmergencyCapability>} />
        <Route path="ward-board" element={<EmergencyCapability><WardBoardScreen /></EmergencyCapability>} />
        <Route path="trauma-bays" element={<Navigate to="/provider/hospital/ward-board" replace />} />
        <Route path="wards" element={<Navigate to="/provider/hospital/ward-board?tab=wards" replace />} />
        <Route path="inpatients" element={<Navigate to="/provider/hospital/admissions?tab=inpatients" replace />} />
        <Route path="dashboard" element={<HospitalDashboardScreen />} />
        <Route path="admin-dashboard" element={<HospitalAdminDashboard />} />
        <Route path="analytics" element={<ExecutiveDashboardScreen />} />
        <Route path="admissions" element={<AdmissionsScreen />} />
        <Route path="discharges" element={<DischargesScreen />} />
        <Route path="shifts" element={<ShiftsScreen />} />
        <Route path="my-shift" element={<MyShiftScreen />} />
        <Route path="capacity" element={<Navigate to="/provider/hospital/ward-board" replace />} />
        <Route path="timeline" element={<IncidentTimelineScreen />} />
        <Route path="providers" element={<ProvidersScreen />} />
        <Route path="doctors" element={<Navigate to="/provider/hospital/providers?tab=doctors" replace />} />
        <Route path="nurses" element={<Navigate to="/provider/hospital/providers?tab=nurses" replace />} />
        <Route path="ambulances" element={<Navigate to="/provider/hospital/providers?tab=er" replace />} />
        <Route path="incident/:id" element={<HospitalIncidentConsole />} />
        <Route path="admins" element={<AdministratorsScreen />} />
        <Route path="profile" element={<ProviderProfile />} />

        {/* Ambulance Services — only for hospitals that operate their own fleet */}
        <Route path="dispatch" element={<FleetCapability><EmergencyDashboardScreen /></FleetCapability>} />
        <Route path="dispatch-queue" element={<Navigate to="/provider/hospital/dispatch" replace />} />
        <Route path="dispatch-board" element={<Navigate to="/provider/hospital/dispatch" replace />} />
        <Route path="dispatch-history" element={<FleetCapability><IncidentsScreen /></FleetCapability>} />
        <Route path="dispatch-reassign/:incidentId" element={<FleetCapability><DispatchReassignmentScreen /></FleetCapability>} />
        <Route path="manual-override" element={<FleetCapability><ManualOverrideScreen /></FleetCapability>} />
        <Route path="vehicles" element={<FleetCapability><VehiclesScreen /></FleetCapability>} />
        <Route path="crews" element={<FleetCapability><CrewsScreen /></FleetCapability>} />

        <Route path="monitoring" element={<FleetCapability><RealTimeMonitoringScreen /></FleetCapability>} />
        <Route path="fleet" element={<FleetCapability><FleetOperationsScreen /></FleetCapability>} />
        <Route path="fleet/vehicle/:id" element={<FleetCapability><VehicleProfileScreen /></FleetCapability>} />

        <Route path="navigation" element={<NavigationScreen />} />
        <Route path="navigation/:id" element={<NavigationScreen />} />
        <Route path="abuse" element={<VehicleAbuseScreen />} />
        <Route path="abuse/geofence" element={<GeofenceScreen />} />
        <Route path="abuse/routes" element={<RouteDeviationScreen />} />
        <Route path="abuse/hours" element={<AfterHoursScreen />} />
        <Route path="abuse/trips" element={<UnlinkedTripsScreen />} />


        {/* Incident Creation Workflow */}
        <Route path="incident/create" element={<CreateIncidentScreen />} />
        <Route path="incident/create/location" element={<IncidentLocationScreen />} />
        <Route path="incident/create/triage" element={<IncidentTriageScreen />} />
        <Route path="incident/create/recommend-ambulance" element={<NearestAmbulanceScreen />} />
        <Route path="incident/create/dispatch-assignment" element={<DispatchAssignmentScreen />} />
        <Route path="incident/create/hospital-selection" element={<HospitalSelectionScreen />} />
        <Route path="incident/active-dispatch/:ambulanceId" element={<ActiveDispatchScreen />} />

        <Route path="*" element={<Navigate to="" replace />} />
      </Route>

      <Route path="ambulance" element={<ProviderShell><AmbulanceOpsLayout /></ProviderShell>}>
        {/* Consolidated Emergency Response Dashboard */}
        <Route index element={<DispatchConsoleScreen />} />
        <Route path="console" element={<Navigate to="/provider/ambulance" replace />} />
        <Route path="legacy-dashboard" element={<EmergencyDashboardScreen />} />
        <Route path="incidents" element={<IncidentsScreen />} />
        <Route path="ops-dashboard" element={<ErOpsDashboard />} />
        <Route path="vehicles" element={<VehiclesScreen />} />
        <Route path="crews" element={<CrewsScreen />} />
        <Route path="hospitals" element={<AmbulanceHospitalsScreen />} />
        <Route path="reports" element={<ExecutiveDashboardScreen />} />


        {/* Navigation Tool */}
        <Route path="navigation" element={<NavigationScreen />} />
        <Route path="navigation/:id" element={<NavigationScreen />} />

        {/* Incoming SOS merged into Emergency Dashboard */}
        <Route path="incoming" element={<Navigate to="/provider/ambulance" replace />} />

        {/* Dispatcher Console merged into Dispatch Dashboard */}
        <Route path="dispatch" element={<Navigate to="/provider/ambulance" replace />} />

        {/* Hospital Network now lives inside Admin */}
        <Route path="hospital-network" element={<Navigate to="/provider/ambulance/admins?tab=hospitals" replace />} />

        {/* Shift Teams removed — roster lives in Admin → Crew */}
        <Route path="team" element={<Navigate to="/provider/ambulance/admins?tab=crew" replace />} />

        {/* Consolidated Fleet Operations (Vehicles + Availability + Maintenance + Utilisation) */}
        <Route path="fleet-operations" element={<FleetOperationsScreen />} />
        <Route path="fleet/vehicle/:id" element={<VehicleProfileScreen />} />

        {/* Consolidated Real-Time Monitoring (Live Tracking + Safety Alerts) */}
        <Route path="monitoring" element={<RealTimeMonitoringScreen />} />

        {/* Detail drilldown views for safety monitoring */}
        <Route path="abuse" element={<VehicleAbuseScreen />} />
        <Route path="abuse/geofence" element={<GeofenceScreen />} />
        <Route path="abuse/routes" element={<RouteDeviationScreen />} />
        <Route path="abuse/hours" element={<AfterHoursScreen />} />
        <Route path="abuse/trips" element={<UnlinkedTripsScreen />} />

        {/* Analytics & Admin */}
        <Route path="alerts" element={<AlertsCentreScreen />} />
        <Route path="billing" element={<BillingDashboardScreen />} />
        <Route path="executive" element={<ExecutiveDashboardScreen />} />

        {/* Incident & Session */}
        <Route path="incident/:id" element={<AmbulanceIncidentConsole />} />
        <Route path="admins" element={<AdministratorsScreen />} />
        <Route path="profile" element={<ProviderProfile />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
}
