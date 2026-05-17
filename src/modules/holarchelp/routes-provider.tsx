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
import AffiliatedDoctorsScreen from "./pages/provider/hospital/AffiliatedDoctorsScreen";
import AffiliatedAmbulancesScreen from "./pages/provider/hospital/AffiliatedAmbulancesScreen";
import HospitalIncidentConsole from "./pages/provider/HospitalIncidentConsole";

import AmbulanceOpsLayout from "./pages/provider/ambulance/AmbulanceOpsLayout";
import AmbulanceOpsDashboard from "./pages/provider/ambulance/AmbulanceOpsDashboard";
import IncomingSosScreen from "./pages/provider/ambulance/IncomingSosScreen";
import NavigationScreen from "./pages/provider/ambulance/NavigationScreen";
import HospitalsDirectoryScreen from "./pages/provider/ambulance/HospitalsDirectoryScreen";
import AffiliatedHospitalsScreen from "./pages/provider/ambulance/AffiliatedHospitalsScreen";
import IncidentHistoryScreen from "./pages/provider/ambulance/IncidentHistoryScreen";
import TeamStatusScreen from "./pages/provider/ambulance/TeamStatusScreen";
import AmbulanceIncidentConsole from "./pages/provider/AmbulanceIncidentConsole";

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

      <Route path="hospital" element={<ProviderShell><HospitalOpsLayout /></ProviderShell>}>
        <Route index element={<HospitalOpsDashboard />} />
        <Route path="incoming" element={<IncomingAmbulancesScreen />} />
        <Route path="triage" element={<TriageScreen />} />
        <Route path="admissions" element={<AdmissionsScreen />} />
        <Route path="capacity" element={<ErCapacityScreen />} />
        <Route path="timeline" element={<IncidentTimelineScreen />} />
        <Route path="doctors" element={<AffiliatedDoctorsScreen />} />
        <Route path="ambulances" element={<AffiliatedAmbulancesScreen />} />
        <Route path="incident/:id" element={<HospitalIncidentConsole />} />
        <Route path="profile" element={<ProviderProfile />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>

      <Route path="ambulance" element={<ProviderShell><AmbulanceOpsLayout /></ProviderShell>}>
        <Route index element={<AmbulanceOpsDashboard />} />
        <Route path="incoming" element={<IncomingSosScreen />} />
        <Route path="navigation" element={<NavigationScreen />} />
        <Route path="navigation/:id" element={<NavigationScreen />} />
        <Route path="hospitals" element={<HospitalsDirectoryScreen />} />
        <Route path="affiliations" element={<AffiliatedHospitalsScreen />} />
        <Route path="history" element={<IncidentHistoryScreen />} />
        <Route path="team" element={<TeamStatusScreen />} />
        <Route path="incident/:id" element={<AmbulanceIncidentConsole />} />
        <Route path="profile" element={<ProviderProfile />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
}
