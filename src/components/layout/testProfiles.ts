import { ShieldCheck, Briefcase as Stethoscope, LineChart as HeartPulse, Building2 } from "lucide-react";

export type TestProfile = {
  email: string;
  name: string;
  role: string;
  icon: any;
};

export const ADMIN_EMAIL = "info@georgiaadams.co.za";

/** The only two system admin accounts — used to gate V2-preview features. */
export const SYSTEM_ADMIN_EMAILS = [ADMIN_EMAIL, "georgia.adams@smartify.co.za"];

/** Wealth demo accounts — the four roles used to trace one case end to end. */
export const WEALTH_DEMO_PROFILES: TestProfile[] = [
  { email: "georgia.client@demo.holarcwealth.co.za", name: "Georgia Adams", role: "as Client", icon: HeartPulse },
  { email: "jaco.steyn@demo.holarcwealth.co.za", name: "Jaco Steyn", role: "as Wealth Manager", icon: Stethoscope },
  { email: "sipho.nkosi@demo.holarcwealth.co.za", name: "Sipho Nkosi", role: "as FSP / Key Individual", icon: ShieldCheck },
  { email: "underwriting@demo.momentum.co.za", name: "Momentum Underwriting", role: "as Insurer", icon: Building2 },
];

export const TEST_PROFILES: TestProfile[] = [
  ...WEALTH_DEMO_PROFILES,
  { email: "info@georgiaadams.co.za", name: "Georgia Adams", role: "Admin", icon: ShieldCheck },
];

