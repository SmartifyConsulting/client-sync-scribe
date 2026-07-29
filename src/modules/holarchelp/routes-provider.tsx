import { Routes, Route, Navigate } from "react-router-dom";
import { ProviderGate } from "./components/ProviderGate";
import { HospitalInboundListener } from "./components/HospitalInboundListener";
import ProviderRedirect from "./pages/provider/ProviderRedirect";
import ProviderProfile from "./pages/provider/ProviderProfile";

import HospitalOpsLayout from "./pages/provider/hospital/HospitalOpsLayout";
import EmergencyHubScreen from "./pages/provider/hospital/EmergencyHubScreen";
import AdmissionsScreen from "./pages/provider/hospital/AdmissionsScreen";
import HospitalDashboardScreen from "./pages/provider/hospital/HospitalDashboardScreen";
import HospitalAdminDashboard from "./pages/provider/hospital/HospitalAdminDashboard";
import WardsScreen from "./pages/provider/hospital/WardsScreen";
import InpatientsScreen from "./pages/provider/hospital/InpatientsScreen";
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
        <Route index element={<EmergencyHubScreen />} />
        <Route path="incoming" element={<Navigate to="/provider/hospital" replace />} />
        <Route path="triage" element={<Navigate to="/provider/hospital" replace />} />
        <Route path="dashboard" element={<HospitalDashboardScreen />} />
        <Route path="admissions" element={<AdmissionsScreen />} />
        <Route path="wards" element={<WardsScreen />} />
        <Route path="inpatients" element={<InpatientsScreen />} />
        <Route path="shifts" element={<ShiftsScreen />} />
        <Route path="my-shift" element={<MyShiftScreen />} />
        <Route path="capacity" element={<Navigate to="/provider/hospital" replace />} />
        <Route path="timeline" element={<IncidentTimelineScreen />} />
        <Route path="providers" element={<ProvidersScreen />} />
        <Route path="doctors" element={<Navigate to="/provider/hospital/providers?tab=doctors" replace />} />
        <Route path="nurses" element={<Navigate to="/provider/hospital/providers?tab=nurses" replace />} />
        <Route path="ambulances" element={<Navigate to="/provider/hospital/providers?tab=er" replace />} />
        <Route path="incident/:id" element={<HospitalIncidentConsole />} />
        <Route path="admins" element={<AdministratorsScreen />} />
        <Route path="profile" element={<ProviderProfile />} />

        {/* Dispatch Dashboard (unified) — reuses ER Provider's EmergencyDashboardScreen */}
        <Route path="dispatch" element={<EmergencyDashboardScreen />} />
        <Route path="dispatch-queue" element={<Navigate to="/provider/hospital/dispatch" replace />} />
        <Route path="dispatch-board" element={<Navigate to="/provider/hospital/dispatch" replace />} />
        <Route path="dispatch-reassign/:incidentId" element={<DispatchReassignmentScreen />} />
        <Route path="manual-override" element={<ManualOverrideScreen />} />

        {/* Fleet Live (unified) — reuses ER Provider components */}
        <Route path="monitoring" element={<RealTimeMonitoringScreen />} />
        <Route path="fleet" element={<FleetOperationsScreen />} />
        <Route path="fleet/vehicle/:id" element={<VehicleProfileScreen />} />
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
        <Route index element={<EmergencyDashboardScreen />} />

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
