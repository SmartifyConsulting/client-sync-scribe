import { Navigate, useParams } from "react-router-dom";
import { useProviderAccess } from "../../components/ProviderGate";

export default function ProviderRedirect({ incidentMode = false }: { incidentMode?: boolean }) {
  const { providerType, loading } = useProviderAccess();
  const { id } = useParams<{ id: string }>();
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }
  const base = providerType === "hospital" ? "/provider/hospital" : "/provider/ambulance";
  const dest = incidentMode && id ? `${base}/incident/${id}` : base;
  return <Navigate to={dest} replace />;
}
