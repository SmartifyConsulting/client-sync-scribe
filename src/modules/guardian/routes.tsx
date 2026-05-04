import { Routes, Route, Navigate } from "react-router-dom";
import GuardianHome from "./pages/GuardianHome";
import GuardianContacts from "./pages/GuardianContacts";
import GuardianIncidents from "./pages/GuardianIncidents";
import GuardianIncidentDetail from "./pages/GuardianIncidentDetail";
import { GuardianGate } from "./components/GuardianGate";

export default function GuardianRoutes() {
  return (
    <GuardianGate>
      <Routes>
        <Route index element={<GuardianHome />} />
        <Route path="contacts" element={<GuardianContacts />} />
        <Route path="incidents" element={<GuardianIncidents />} />
        <Route path="incident/:id" element={<GuardianIncidentDetail />} />
        <Route path="*" element={<Navigate to="/patient/guardian" replace />} />
      </Routes>
    </GuardianGate>
  );
}
