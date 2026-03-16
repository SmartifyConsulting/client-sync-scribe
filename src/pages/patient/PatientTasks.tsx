import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PatientTasks() {
  const navigate = useNavigate();

  useEffect(() => {
    // Tasks are now in My Rewards → Assigned Tasks tab
    navigate("/patient/rewards", { replace: true });
  }, [navigate]);

  return null;
}
