import { useLocation, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useHolarcHelpAccess } from "@/modules/holarchelp/hooks/useHolarcHelpAccess";

export function SOSFab() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPatient, loading } = useUserRole();
  const { enabled } = useHolarcHelpAccess();

  if (loading || !enabled) return null;
  const isOnPatientRoute = location.pathname.startsWith("/patient/");
  if (!isPatient && !isOnPatientRoute) return null;
  if (location.pathname.startsWith("/patient/holarchelp")) return null;

  return (
    <button
      onClick={() => navigate("/patient/holarchelp")}
      aria-label="SOS emergency"
      className="fixed bottom-24 right-4 z-50 md:bottom-6 flex flex-col items-center justify-center gap-0.5 h-14 w-14 rounded-full bg-white border-2 border-red-600 text-red-600 shadow-lg active:scale-95 transition"
    >
      <Shield className="h-5 w-5" fill="currentColor" stroke="white" strokeWidth={1.5} />
      <span className="text-[9px] font-extrabold leading-none">SOS</span>
    </button>
  );
}
