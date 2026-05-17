import { useProviderAccess } from "../../../components/ProviderGate";
import AmbulanceHospitalAffiliations from "../../../components/AmbulanceHospitalAffiliations";
import { Hospital } from "lucide-react";

export default function AffiliatedHospitalsScreen() {
  const { providerId } = useProviderAccess();
  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ambulance Operations</p>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Hospital className="h-5 w-5 text-primary" /> Affiliated Hospitals
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Hospitals you typically deliver patients to. Affiliated hospitals see your unit highlighted on their Incoming Ambulances board.</p>
      </header>
      <AmbulanceHospitalAffiliations providerId={providerId} />
    </div>
  );
}
