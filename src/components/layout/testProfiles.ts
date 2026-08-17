import { ShieldCheck, Stethoscope, HeartPulse, Building2, Ambulance, Syringe } from "lucide-react";

export type TestProfile = {
  email: string;
  name: string;
  role: string;
  icon: any;
};

export const ADMIN_EMAIL = "info@georgiaadams.co.za";

/** The only two system admin accounts — used to gate V2-preview features. */
export const SYSTEM_ADMIN_EMAILS = [ADMIN_EMAIL, "georgia.adams@smartify.co.za"];

export const TEST_PROFILES: TestProfile[] = [
  { email: "info@georgiaadams.co.za", name: "Georgia Adams", role: "Admin", icon: ShieldCheck },
  { email: "georgia.adams@smartify.co.za", name: "Georgia Adams", role: "Admin", icon: ShieldCheck },
  { email: "sme@smartify.co.za", name: "Dean Allie", role: "Doctor", icon: Stethoscope },
  
  { email: "projectmanager@smartify.co.za", name: "Sharon Kennedy", role: "Patient", icon: HeartPulse },
  { email: "hospital.test@holarchealth.com", name: "Holarc General Hospital", role: "Hospital", icon: Building2 },
  { email: "renken@smartify.co.za", name: "Renken", role: "ER Provider", icon: Ambulance },
  { email: "er.test@holarchealth.com", name: "ER Provider (Test)", role: "ER Provider", icon: Ambulance },
  
  { email: "dr.buttons@smartify.co.za", name: "Dr Gianna Buttons", role: "Doctor", icon: Stethoscope },
  { email: "2348167581572@phone.holarc.local", name: "Samuel 0koli", role: "Patient", icon: HeartPulse },
  { email: "nurse.test@holarchealth.com", name: "Nomvula Dlamini", role: "Nurse", icon: Syringe },
];
