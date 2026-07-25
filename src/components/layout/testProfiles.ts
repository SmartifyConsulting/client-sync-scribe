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
  { email: "sme@smartify.co.za", name: "Dean Allie", role: "Doctor", icon: Stethoscope },
  { email: "dean.allie@gmail.com", name: "Dean Allie", role: "Patient", icon: HeartPulse },
  { email: "projectmanager@smartify.co.za", name: "Shannon Kennedy", role: "Patient", icon: HeartPulse },
  { email: "paraskevoulasoldatos@gmail.com", name: "Paraskevi Soldatos", role: "Patient", icon: HeartPulse },
  { email: "christina@smartify.co.za", name: "Christina", role: "Doctor", icon: Stethoscope },
  { email: "zano@smartify.co.za", name: "Zano", role: "Hospital", icon: Building2 },
  { email: "renken@smartify.co.za", name: "Renken", role: "ER Provider", icon: Ambulance },
  { email: "jeanprodromos@smartify.co.za", name: "Jean Prodromos", role: "Doctor", icon: Stethoscope },
  { email: "hospital.test@holarchealth.com", name: "Hospital Admin (Test)", role: "Hospital", icon: Building2 },
  { email: "er.test@holarchealth.com", name: "ER Provider (Test)", role: "ER Provider", icon: Ambulance },
];
