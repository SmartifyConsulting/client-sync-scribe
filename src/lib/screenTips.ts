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
  // Client
  { id: "patient.dashboard", match: "/dashboard", title: "Your dashboard", body: "Your wealth journey at a glance — actions to complete, what we're waiting for and recent milestones." },
  { id: "patient.details", match: "/patient/details", title: "My Profile", body: "Your details, financial information and wealth journey. Wealth Managers only see what you choose to share." },
  { id: "patient.doctors", match: "/patient/doctors", title: "My Wealth Managers", body: "Manage which Wealth Managers can work with you and send them a message." },
  { id: "patient.documents", match: "/patient/documents", title: "My Documents", body: "Your Record of Advice (ROA), policy schedules and supporting documents. Tap the green arrow to share one." },
  { id: "patient.calendar", match: "/patient/calendar", title: "My Calendar", body: "Your upcoming consultations and annual reviews." },
  { id: "patient.tasks", match: "/patient/tasks", title: "My Actions", body: "What your Wealth Manager needs from you, with the reason and due date." },
  { id: "patient.access", match: "/patient/access", title: "Access Management", body: "Control which Wealth Managers can view your information and what they can see." },
  { id: "patient.invoices", match: "/patient/invoices", title: "My Fees", body: "Advice fees and statements from your Wealth Manager. Tap any item to view or download." },

  // Wealth Manager / shared
  { id: "doctor.dashboard", match: "/doctor/dashboard", title: "Today's Briefing", body: "Today's consultations, client decisions and outstanding actions." },
  { id: "doctor.patients.v2", match: "/patients", title: "Your Clients", body: "Import clients from a spreadsheet, or add one manually. Open a client to see their Live workspace and Workflow Map." },
  { id: "doctor.sessions", match: "/sessions", title: "Consultations", body: "Recorded consultations with transcripts, summaries and the documents drafted from each one." },
  { id: "doctor.documents", match: "/documents", title: "Documents", body: "Records of Advice, letters and supporting documents. Create from templates or draft from a consultation." },
  { id: "doctor.calendar", match: "/calendar", title: "Calendar", body: "Consultations and annual reviews. Drag to reschedule and colour-code by type." },
  { id: "doctor.todo", match: "/todo", title: "Actions", body: "Actions from consultations and the wealth workflow, plus your own reminders." },
  { id: "doctor.invoices", match: "/doctor/invoices", title: "Fees & Remuneration", body: "Create and track advice-fee statements. Line items pre-fill from your fee schedule." },
  { id: "doctor.referrals", match: "/referrals", title: "Referral Network", body: "Advisers and specialists you refer clients to. Invite new ones by email." },
  { id: "doctor.connections", match: "/connections", title: "Connections", body: "Pending client invites, access requests and firm member approvals." },
  { id: "doctor.practice", match: "/my-practice", title: "My Firm", body: "Add firm members, set your fee schedule, design your letterhead and configure how clients reach you." },
  { id: "doctor.mySessions", match: "/my-sessions", title: "My Consultations", body: "Today's consultations are expanded. Tap a date group to see earlier ones." },
  { id: "doctor.cpd", match: "/cpd-certificates", title: "CPD Certificates", body: "Upload and track your CPD points for the annual threshold." },

  // Shared
  { id: "shared.settings", match: "/settings", title: "Settings", body: "Manage your profile, security, subscription and notification preferences." },
  { id: "shared.notifications", match: "/notifications", title: "Notifications", body: "Consultations, decisions, signed documents, insurer responses and messages in one place." },
  { id: "shared.profile", match: "/profile", title: "Profile", body: "Your name, contact details and photo." },
  { id: "shared.legal", match: "/legal", title: "Legal", body: "Terms, agreements and your consent records." },
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
