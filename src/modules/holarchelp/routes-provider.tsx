import { Routes, Route } from "react-router-dom";
import ProviderLayout from "./pages/provider/ProviderLayout";
import ProviderDashboard from "./pages/provider/ProviderDashboard";
import ProviderIncidentDetail from "./pages/provider/ProviderIncidentDetail";
import ProviderProfile from "./pages/provider/ProviderProfile";

export default function ProviderRoutes() {
  return (
    <Routes>
      <Route element={<ProviderLayout />}>
        <Route index element={<ProviderDashboard />} />
        <Route path="incident/:id" element={<ProviderIncidentDetail />} />
        <Route path="profile" element={<ProviderProfile />} />
      </Route>
    </Routes>
  );
}
