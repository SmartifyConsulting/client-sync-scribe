import HospitalOpsDashboard from "./HospitalOpsDashboard";
import IncomingAmbulancesScreen from "./IncomingAmbulancesScreen";
import TriageScreen from "./TriageScreen";
import ErCapacityScreen from "./ErCapacityScreen";

export default function EmergencyHubScreen() {
  return (
    <div className="space-y-6">
      <HospitalOpsDashboard />
      <ErCapacityScreen />
      <TriageScreen />
      <IncomingAmbulancesScreen />
    </div>
  );
}
