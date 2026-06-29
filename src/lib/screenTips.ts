/**
 * First-visit screen tip registry.
 *
 * `RouteTipHost` looks up the current pathname and renders a one-time tip
 * the very first time an authenticated user visits a matching route.
 * After dismissal the tip is recorded in `user_screen_tips_seen` and
 * never shown again, across devices.
 *
 * Routes are matched longest-prefix first, so `/patient/details` will win
 * over `/patient`.
 */
export interface ScreenTip {
  id: string; // stable storage key
  match: string | RegExp; // pathname prefix or regex
  title: string;
  body: string;
}

export const SCREEN_TIPS: ScreenTip[] = [
  // Patient
  { id: "patient.dashboard", match: "/dashboard", title: "Your dashboard", body: "This is your daily snapshot — today's reminders, recent activity and quick links to everything you need." },
  { id: "patient.details", match: "/patient/details", title: "My Holarchive", body: "Your personal medical record. Tap any section to view or edit. Doctors only see what you choose to share." },
  { id: "patient.doctors", match: "/patient/doctors", title: "My Doctors", body: "Manage who's on your care team, request renewals and start a chat with any practitioner." },
  { id: "patient.prescriptions", match: "/patient/prescriptions", title: "My Prescriptions", body: "Full history of every prescription. Request a renewal or add a comment to the green note icon." },
  { id: "patient.documents", match: "/patient/documents", title: "My Documents", body: "Letters, certificates and notes from your visits. Tap the green arrow to share with a provider." },
  { id: "patient.calendar", match: "/patient/calendar", title: "My Calendar", body: "All upcoming appointments. Book new ones from your doctor's profile." },
  { id: "patient.tasks", match: "/patient/tasks", title: "My To-Do List", body: "Tasks from your doctors and personal reminders. Use the mic icon to add by voice." },
  { id: "patient.rewards", match: "/patient/rewards", title: "My Rewards", body: "Earn Vulas for taking your medication and staying healthy. Redeem them in the Vula Wallet." },
  { id: "patient.health-album", match: "/patient/health-album", title: "My Health Album", body: "Private photos for skin, wounds and progress tracking. Only you can see these unless you share." },
  { id: "patient.round-table", match: "/patient/round-table", title: "Round Table", body: "A shared space where all your providers can coordinate on your care." },
  { id: "patient.access", match: "/patient/access", title: "Access Management", body: "Control which doctors can view your record and what they're allowed to see." },
  { id: "patient.invoices", match: "/patient/invoices", title: "My Invoices", body: "All your medical invoices in one place. Tap any invoice to view or download." },

  // Doctor / shared
  { id: "doctor.dashboard", match: "/doctor/dashboard", title: "Doctor Briefing", body: "Your daily clinical briefing — today's appointments, AI summaries and outstanding tasks." },
  { id: "doctor.patients.v2", match: "/patients", title: "Your Patients", body: "Use Import to bulk-add patients from a spreadsheet, or + Patient to add one manually. Tap any row to open the record." },
  { id: "doctor.sessions", match: "/sessions", title: "Sessions", body: "Recorded consultations with transcripts, AI summaries and documents drafted from each visit." },
  { id: "doctor.documents", match: "/documents", title: "Documents", body: "Letters, scripts and certificates. Create from templates or auto-draft from a session." },
  { id: "doctor.calendar", match: "/calendar", title: "Calendar", body: "All appointments. Drag to reschedule and color-code by appointment type." },
  { id: "doctor.todo", match: "/todo", title: "To-Do List", body: "Tasks dictated from sessions, follow-ups and personal reminders." },
  { id: "doctor.invoices", match: "/doctor/invoices", title: "Invoices", body: "Create, send and track invoices. Line items pre-fill from your service prices." },
  { id: "doctor.referrals", match: "/referrals", title: "Referral Doctors", body: "Your network of referral practitioners. Invite new GPs and specialists." },
  { id: "doctor.connections", match: "/connections", title: "Connections", body: "Pending patient invites, doctor access requests and partner approvals." },
  { id: "doctor.practice", match: "/my-practice", title: "My Practice", body: "Add partners (search existing practitioners or invite by email), set service prices, design your letterhead, and configure how patients reach you." },
  { id: "doctor.mySessions", match: "/my-sessions", title: "My Sessions", body: "Today's sessions are expanded by default. Tap a date group to expand last week, last month, or older." },
  { id: "shared.holarchelp", match: "/holarchelp", title: "HolarcHelp SOS", body: "One-tap emergency request. Your nominated next of kin and nearby ambulance providers are alerted with your location." },

  { id: "doctor.rewards", match: "/doctor/rewards", title: "Practitioner Rewards", body: "Track Vulas earned through patient onboarding and check-ins." },
  { id: "doctor.cpd", match: "/cpd-certificates", title: "CPD Certificates", body: "Upload and track your CPD points. Earn a gold award once you hit the annual threshold." },

  // Shared
  { id: "shared.settings", match: "/settings", title: "Settings", body: "Manage your profile, security, billing and notification preferences." },
  { id: "shared.notifications", match: "/notifications", title: "Notifications", body: "All your alerts in one place — appointments, messages, medication reminders and more." },
  { id: "shared.profile", match: "/profile", title: "Profile", body: "Your basic profile info — name, contact details and avatar." },
  { id: "shared.legal", match: "/legal", title: "Legal", body: "Terms, the Business Associate Agreement and your consent records." },
];

/**
 * Resolve which tip (if any) applies to the given pathname.
 * Longest-match-wins so nested routes pick the most specific tip.
 */
export function tipForPath(pathname: string): ScreenTip | null {
  const candidates = SCREEN_TIPS.filter((t) => {
    if (typeof t.match === "string") return pathname === t.match || pathname.startsWith(t.match + "/") || pathname === t.match;
    return t.match.test(pathname);
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const al = typeof a.match === "string" ? a.match.length : 0;
    const bl = typeof b.match === "string" ? b.match.length : 0;
    return bl - al;
  });
  return candidates[0];
}
