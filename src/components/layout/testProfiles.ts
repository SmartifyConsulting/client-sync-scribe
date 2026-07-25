import { ShieldCheck, Stethoscope, HeartPulse, Building2, Ambulance } from "lucide-react";

export type TestProfile = {
  email: string;
  name: string;
  role: string;
  icon: any;
};

export const ADMIN_EMAIL = "info@georgiaadams.co.za";

export const TEST_PROFILES: TestProfile[] = [
  { email: "info@georgiaadams.co.za", name: "Georgia Adams", role: "Admin", icon: ShieldCheck },
  { email: "sme@smartify.co.za", name: "Dr Dean Allie", role: "Doctor", icon: Stethoscope },
  { email: "dean.allie@gmail.com", name: "Dr Dean Allie", role: "Patient", icon: HeartPulse },
  { email: "projectmanager@smartify.co.za", name: "Shannon Kennedy", role: "Patient", icon: HeartPulse },
  { email: "zano@smartify.co.za", name: "Zano", role: "Hospital", icon: Building2 },
  { email: "renken@smartify.co.za", name: "Renken", role: "ER Provider", icon: Ambulance },
  { email: "hospital.test@holarchealth.com", name: "Hospital Admin (Test)", role: "Hospital", icon: Building2 },
  { email: "er.test@holarchealth.com", name: "ER Provider (Test)", role: "ER Provider", icon: Ambulance },
];
