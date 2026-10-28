/**
 * First-visit screen tip registry.
 *
 * `RouteTipHost` looks up the current pathname and renders a one-time tip
 * the very first time an authenticated user visits a matching route.
 * After dismissal the tip is recorded in `user_screen_tips_seen` and
 * never shown again, across devices.
 *
 * Routes are matched longest-prefix first, so `/client/details` will win
 * over `/client`.
 */
export interface ScreenTip {
  id: string; // stable storage key
  match: string | RegExp; // pathname prefix or regex
  title: string;
  body: string;
}

export const SCREEN_TIPS: ScreenTip[] = [
  // Client
  { id: "client.dashboard", match: "/dashboard", title: "Your dashboard", body: "Your wealth journey at a glance — actions to complete, what we're waiting for and recent milestones." },
  { id: "client.details", match: "/client/details", title: "My Profile", body: "Your details, financial information and wealth journey. Wealth Managers only see what you choose to share." },
  { id: "client.doctors", match: "/client/advisors", title: "My Wealth Managers", body: "Manage which Wealth Managers can work with you and send them a message." },
  { id: "client.documents", match: "/client/documents", title: "My Documents", body: "Your Record of Advice (ROA), policy schedules and supporting documents. Tap the green arrow to share one." },
  { id: "client.calendar", match: "/client/calendar", title: "My Calendar", body: "Your upcoming consultations and annual reviews." },
  { id: "client.tasks", match: "/client/tasks", title: "My Actions", body: "What your Wealth Manager needs from you, with the reason and due date." },
  { id: "client.access", match: "/client/access", title: "Access Management", body: "Control which Wealth Managers can view your information and what they can see." },

  // Wealth Manager / shared
  { id: "advisor.dashboard", match: "/advisor/dashboard", title: "Today's Briefing", body: "Today's consultations, client decisions and outstanding actions." },
  { id: "advisor.patients.v2", match: "/clients", title: "Your Clients", body: "Import clients from a spreadsheet, or add one manually. Open a client to see their Live workspace and Workflow Map." },
  { id: "advisor.sessions", match: "/sessions", title: "Consultations", body: "Recorded consultations with transcripts, summaries and the documents drafted from each one." },
  { id: "advisor.documents", match: "/documents", title: "Documents", body: "Records of Advice, letters and supporting documents. Create from templates or draft from a consultation." },
  { id: "advisor.calendar", match: "/calendar", title: "Calendar", body: "Consultations and annual reviews. Drag to reschedule and colour-code by type." },
  { id: "advisor.todo", match: "/todo", title: "Actions", body: "Actions from consultations and the wealth workflow, plus your own reminders." },
  { id: "advisor.referrals", match: "/referrals", title: "Referral Network", body: "Advisers and specialists you refer clients to. Invite new ones by email." },
  { id: "advisor.connections", match: "/connections", title: "Connections", body: "Pending client invites, access requests and firm member approvals." },
  { id: "advisor.practice", match: "/my-practice", title: "My Business", body: "Add firm members, set your fee schedule, design your letterhead and configure how clients reach you." },
  { id: "advisor.mySessions", match: "/my-sessions", title: "My Consultations", body: "Today's consultations are expanded. Tap a date group to see earlier ones." },
  { id: "advisor.cpd", match: "/cpd-certificates", title: "CPD Certificates", body: "Upload and track your CPD points for the annual threshold." },

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
