import { ShieldCheck, Briefcase as Stethoscope, LineChart as HeartPulse, Building2, Building2 as Ambulance, FileCheck as Syringe } from "lucide-react";

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
  // `name` is only a fallback label — the switcher shows the live profiles.full_name
  // via useSeededProfileNames(), so renames in the app update the menu automatically.
  { email: "sme@smartify.co.za", name: "Dean Peterson", role: "Doctor", icon: Stethoscope },

  
  { email: "projectmanager@smartify.co.za", name: "Sharon Kennedy", role: "Patient", icon: HeartPulse },
  { email: "hospital.test@holarchealth.com", name: "Holarc General Hospital", role: "Hospital", icon: Building2 },
  { email: "renken@smartify.co.za", name: "Renken", role: "ER Provider", icon: Ambulance },
  { email: "er.test@holarchealth.com", name: "ER Provider (Test)", role: "ER Provider", icon: Ambulance },
  
  { email: "dr.buttons@smartify.co.za", name: "Matthew Buttons", role: "Doctor", icon: Stethoscope },
  { email: "ga@firstserve.co.za", name: "Dr Gianna Buttons", role: "Doctor", icon: Stethoscope },
  { email: "2348167581572@phone.holarc.local", name: "Samuel 0koli", role: "Patient", icon: HeartPulse },
  { email: "nurse.test@holarchealth.com", name: "Nomvula Dlamini", role: "Nurse", icon: Syringe },
];

/** Wealth demo accounts — the four roles used to trace one case end to end. */
export const WEALTH_DEMO_PROFILES: TestProfile[] = [
  { email: "georgia.client@demo.holarcwealth.co.za", name: "Georgia Adams", role: "as Client", icon: HeartPulse },
  { email: "jaco.steyn@demo.holarcwealth.co.za", name: "Jaco Steyn", role: "as Wealth Manager", icon: Stethoscope },
  { email: "sipho.nkosi@demo.holarcwealth.co.za", name: "Sipho Nkosi", role: "as FSP / Key Individual", icon: ShieldCheck },
  { email: "underwriting@demo.momentum.co.za", name: "Momentum Underwriting", role: "as Insurer", icon: Building2 },
];
