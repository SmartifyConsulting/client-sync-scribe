import { Routes, Route, Navigate } from "react-router-dom";
import { ProviderGate } from "./components/ProviderGate";
import { HospitalInboundListener } from "./components/HospitalInboundListener";
import ProviderRedirect from "./pages/provider/ProviderRedirect";
import ProviderProfile from "./pages/provider/ProviderProfile";

import HospitalOpsLayout from "./pages/provider/hospital/HospitalOpsLayout";
import HospitalOpsDashboard from "./pages/provider/hospital/HospitalOpsDashboard";
import IncomingAmbulancesScreen from "./pages/provider/hospital/IncomingAmbulancesScreen";
import TriageScreen from "./pages/provider/hospital/TriageScreen";
import AdmissionsScreen from "./pages/provider/hospital/AdmissionsScreen";
import ErCapacityScreen from "./pages/provider/hospital/ErCapacityScreen";
import IncidentTimelineScreen from "./pages/provider/hospital/IncidentTimelineScreen";
import ProvidersScreen from "./pages/provider/hospital/ProvidersScreen";
import HospitalIncidentConsole from "./pages/provider/HospitalIncidentConsole";
import AdministratorsScreen from "./pages/provider/AdministratorsScreen";

import AmbulanceOpsLayout from "./pages/provider/ambulance/AmbulanceOpsLayout";
import AmbulanceOpsDashboard from "./pages/provider/ambulance/AmbulanceOpsDashboard";
import IncomingSosScreen from "./pages/provider/ambulance/IncomingSosScreen";
import NavigationScreen from "./pages/provider/ambulance/NavigationScreen";
import HospitalsDirectoryScreen from "./pages/provider/ambulance/HospitalsDirectoryScreen";
import AffiliatedHospitalsScreen from "./pages/provider/ambulance/AffiliatedHospitalsScreen";
import IncidentHistoryScreen from "./pages/provider/ambulance/IncidentHistoryScreen";
import TeamStatusScreen from "./pages/provider/ambulance/TeamStatusScreen";
import FleetPage from "./pages/provider/ambulance/FleetPage";
import TelematicsScreen from "./pages/provider/ambulance/TelematicsScreen";
import LiveSOSScreen from "./pages/provider/ambulance/LiveSOSScreen";
import AmbulanceIncidentConsole from "./pages/provider/AmbulanceIncidentConsole";

// Vehicle Abuse Prevention screens
import VehicleAbuseScreen from "./pages/provider/ambulance/VehicleAbuseScreen";
import GeofenceScreen from "./pages/provider/ambulance/GeofenceScreen";
import RouteDeviationScreen from "./pages/provider/ambulance/RouteDeviationScreen";
import AfterHoursScreen from "./pages/provider/ambulance/AfterHoursScreen";
import UnlinkedTripsScreen from "./pages/provider/ambulance/UnlinkedTripsScreen";

// ER Provider - Incident Management
import IncidentManagementScreen from "./pages/provider/ambulance/IncidentManagementScreen";

// Fleet Management screens
import VehicleProfileScreen from "./pages/provider/ambulance/VehicleProfileScreen";
import VehicleAvailabilityScreen from "./pages/provider/ambulance/VehicleAvailabilityScreen";
import VehicleAssignmentScreen from "./pages/provider/ambulance/VehicleAssignmentScreen";
import FleetCalendarScreen from "./pages/provider/ambulance/FleetCalendarScreen";
import VehicleUtilisationScreen from "./pages/provider/ambulance/VehicleUtilisationScreen";
import VehicleTypeManagementScreen from "./pages/provider/ambulance/VehicleTypeManagementScreen";

// Additional Management Screens
import TelemetryHubScreen from "./pages/provider/ambulance/TelemetryHubScreen";
import DriverManagementScreen from "./pages/provider/ambulance/DriverManagementScreen";
import MaintenanceDashboardScreen from "./pages/provider/ambulance/MaintenanceDashboardScreen";
import BillingDashboardScreen from "./pages/provider/BillingDashboardScreen";
import ExecutiveDashboardScreen from "./pages/provider/ExecutiveDashboardScreen";
import AlertsCentreScreen from "./pages/provider/AlertsCentreScreen";

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
        <Route index element={<HospitalOpsDashboard />} />
        <Route path="incoming" element={<IncomingAmbulancesScreen />} />
        <Route path="triage" element={<TriageScreen />} />
        <Route path="admissions" element={<AdmissionsScreen />} />
        <Route path="capacity" element={<ErCapacityScreen />} />
        <Route path="timeline" element={<IncidentTimelineScreen />} />
        <Route path="providers" element={<ProvidersScreen />} />
        <Route path="doctors" element={<Navigate to="/provider/hospital/providers?tab=doctors" replace />} />
        <Route path="nurses" element={<Navigate to="/provider/hospital/providers?tab=nurses" replace />} />
        <Route path="ambulances" element={<Navigate to="/provider/hospital/providers?tab=er" replace />} />
        <Route path="incident/:id" element={<HospitalIncidentConsole />} />
        <Route path="admins" element={<AdministratorsScreen />} />
        <Route path="profile" element={<ProviderProfile />} />

        {/* Dispatch Management Routes */}
        <Route path="dispatch" element={<MultiIncidentBoardScreen />} />
        <Route path="dispatch-queue" element={<DispatchQueueScreen />} />
        <Route path="dispatch-board" element={<MultiIncidentBoardScreen />} />
        <Route path="dispatch-reassign/:incidentId" element={<DispatchReassignmentScreen />} />
        <Route path="manual-override" element={<ManualOverrideScreen />} />

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
        <Route index element={<AmbulanceOpsDashboard />} />
        <Route path="incoming" element={<IncomingSosScreen />} />
        <Route path="live-sos" element={<LiveSOSScreen />} />
        <Route path="navigation" element={<NavigationScreen />} />
        <Route path="navigation/:id" element={<NavigationScreen />} />
        <Route path="hospitals" element={<HospitalsDirectoryScreen />} />
        <Route path="affiliations" element={<AffiliatedHospitalsScreen />} />
        <Route path="history" element={<IncidentHistoryScreen />} />
        <Route path="team" element={<TeamStatusScreen />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="fleet/vehicle/:id" element={<VehicleProfileScreen />} />
        <Route path="fleet/availability" element={<VehicleAvailabilityScreen />} />
        <Route path="fleet/assignment" element={<VehicleAssignmentScreen />} />
        <Route path="fleet/calendar" element={<FleetCalendarScreen />} />
        <Route path="fleet/utilisation" element={<VehicleUtilisationScreen />} />
        <Route path="fleet/types" element={<VehicleTypeManagementScreen />} />
        <Route path="incident-management" element={<IncidentManagementScreen />} />
        <Route path="telematics" element={<TelematicsScreen />} />
        <Route path="telematics-hub" element={<TelemetryHubScreen />} />
        <Route path="drivers" element={<DriverManagementScreen />} />
        <Route path="maintenance" element={<MaintenanceDashboardScreen />} />
        <Route path="alerts" element={<AlertsCentreScreen />} />
        <Route path="billing" element={<BillingDashboardScreen />} />
        <Route path="executive" element={<ExecutiveDashboardScreen />} />
        <Route path="abuse" element={<VehicleAbuseScreen />} />
        <Route path="abuse/geofence" element={<GeofenceScreen />} />
        <Route path="abuse/routes" element={<RouteDeviationScreen />} />
        <Route path="abuse/hours" element={<AfterHoursScreen />} />
        <Route path="abuse/trips" element={<UnlinkedTripsScreen />} />
        <Route path="incident/:id" element={<AmbulanceIncidentConsole />} />
        <Route path="admins" element={<AdministratorsScreen />} />
        <Route path="profile" element={<ProviderProfile />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
}
