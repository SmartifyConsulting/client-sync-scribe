import { useProviderAccess } from "../../components/ProviderGate";
import AmbulanceIncidentConsole from "./AmbulanceIncidentConsole";
import HospitalIncidentConsole from "./HospitalIncidentConsole";

export default function ProviderIncidentDetail() {
  const { providerType, loading } = useProviderAccess();
  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  return providerType === "hospital" ? <HospitalIncidentConsole /> : <AmbulanceIncidentConsole />;
}
