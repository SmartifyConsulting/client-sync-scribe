import { Routes, Route, Navigate } from "react-router-dom";
import HolarcHelpHome from "./pages/HolarcHelpHome";
import HolarcHelpContacts from "./pages/HolarcHelpContacts";
import HolarcHelpIncidents from "./pages/HolarcHelpIncidents";
import HolarcHelpIncidentDetail from "./pages/HolarcHelpIncidentDetail";
import HolarcHelpNearby from "./pages/HolarcHelpNearby";
import { HolarcHelpGate } from "./components/HolarcHelpGate";

export default function HolarcHelpRoutes() {
  return (
    <HolarcHelpGate>
      <Routes>
        <Route index element={<HolarcHelpHome />} />
        <Route path="contacts" element={<HolarcHelpContacts />} />
        <Route path="nearby" element={<HolarcHelpNearby />} />
        <Route path="incidents" element={<HolarcHelpIncidents />} />
        <Route path="incident/:id" element={<HolarcHelpIncidentDetail />} />
        <Route path="*" element={<Navigate to="/patient/holarchelp" replace />} />
      </Routes>
    </HolarcHelpGate>
  );
}
