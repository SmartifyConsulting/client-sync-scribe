import { Routes, Route, Navigate } from "react-router-dom";
import HolarcHelpHome from "./pages/HolarcHelpHome";
import HolarcHelpContacts from "./pages/HolarcHelpContacts";
import HolarcHelpIncidents from "./pages/HolarcHelpIncidents";
import HolarcHelpIncidentDetail from "./pages/HolarcHelpIncidentDetail";
import { HolarcHelpGate } from "./components/HolarcHelpGate";

export default function HolarcHelpRoutes() {
  return (
    <HolarcHelpGate>
      <Routes>
        <Route index element={<HolarcHelpHome />} />
        <Route path="contacts" element={<HolarcHelpContacts />} />
        <Route path="incidents" element={<HolarcHelpIncidents />} />
        <Route path="incident/:id" element={<HolarcHelpIncidentDetail />} />
        <Route path="*" element={<Navigate to="/patient/holarchelp" replace />} />
      </Routes>
    </HolarcHelpGate>
  );
}
