import { useProviderAccess } from "../../components/ProviderGate";
import AmbulanceDashboard from "./AmbulanceDashboard";
import HospitalDashboard from "./HospitalDashboard";

export default function ProviderDashboard() {
  const { providerType, loading } = useProviderAccess();
  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  return providerType === "hospital" ? <HospitalDashboard /> : <AmbulanceDashboard />;
}
