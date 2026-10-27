import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { isWealthHidden } from "@/lib/terminology";
import { AppLayout } from "@/components/layout/AppLayout";
import { PatientAppLayout } from "@/components/layout/PatientAppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import MyFuture from "@/pages/MyFuture";
import MyWorkspace from "@/pages/MyWorkspace";
import Messenger from "@/pages/Messenger";
import Claims from "@/pages/Claims";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import Landing from "./pages/IndigroWelcome";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";
import CalendarView from "./pages/CalendarView";
import Sessions from "./pages/Sessions";
import SessionDetail from "./pages/SessionDetail";
import MySessions from "./pages/MySessions";
import MyPersonalDashboard from "./pages/MyPersonalDashboard";
import MyViews from "./pages/MyViews";

// Documents page is now wrapped inside DoctorDocumentsPage
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import TodoList from "./pages/TodoList";
import Notifications from "./pages/Notifications";
import Connections from "./pages/Connections";
import Auth from "./pages/Auth";
import JoinInvite from "./pages/JoinInvite";
import JoinTeamInvite from "./pages/JoinTeamInvite";
import ReferrerSignup from "./pages/ReferrerSignup";
import ReferrerDashboard from "./pages/referrer/ReferrerDashboard";
import ReferrerCommissions from "./pages/referrer/ReferrerCommissions";
import BrokerReferrers from "./pages/broker/Referrers";
import AppIntegrations from "./pages/broker/AppIntegrations";
import QuotesScreen from "./pages/broker/QuotesScreen";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import TermsAndConditions from "./pages/TermsAndConditions";
import ClientConsent from "./pages/ClientConsent";
import WealthManagerAgreement from "./pages/WealthManagerAgreement";
import Legal from "./pages/Legal";

// Client pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientCalendar from "./pages/patient/PatientCalendar";
import Invoices from "./pages/patient/Invoices";
import PatientAccessManagement from "./pages/patient/PatientAccessManagement";
import MyDoctors from "./pages/patient/MyDoctors";
import PatientTasks from "./pages/patient/PatientTasks";
import PatientDocuments from "./pages/patient/PatientDocuments";
import MyDetails from "./pages/patient/MyDetails";
import DoctorInvoices from "./pages/doctor/Invoices";

import MyPractice from "./pages/MyPractice";
import PracticePatients from "./pages/practice/PracticePatients";
import PricingAdmin from "./pages/admin/PricingAdmin";
import IntegrationsAdmin from "./pages/admin/IntegrationsAdmin";
import CountryPerformance from "./pages/admin/CountryPerformance";
import BulkPasswordReset from "./pages/admin/BulkPasswordReset";

import ReferralDoctors from "./pages/ReferralDoctors";
import ExpiringRecordings from "./pages/ExpiringRecordings";
import Admin from "./pages/Admin";
import DoctorDocumentsPage from "./pages/doctor/DoctorDocumentsPage";
import DoctorSessions from "./pages/doctor/Sessions";
import ProviderSignup from "./pages/ProviderSignup";
import ProviderApprovalAction from "./pages/admin/ProviderApprovalAction";
import WealthUsers from "./pages/admin/WealthUsers";
import ActivityLog from "./pages/ActivityLog";

const queryClient = new QueryClient();

// Invalidate all queries on auth state change to prevent stale cached profiles
import { supabase } from "@/integrations/supabase/client";
supabase.auth.onAuthStateChange(() => {
  queryClient.invalidateQueries();
});

// Legal/IP deterrence notice for anyone opening DevTools.
// Same pattern Facebook, PayPal, Google use. Zero UX impact.
if (typeof window !== "undefined" && !(window as any).__holarcNoticeShown) {
  (window as any).__holarcNoticeShown = true;
  // eslint-disable-next-line no-console
  console.log(
    "%c⚠ Stop!",
    "color:#E01837;font-size:32px;font-weight:bold;"
  );
  // eslint-disable-next-line no-console
  console.log(
    "%cThis is a private application owned by Holarc Health (Pty) Ltd.\n" +
      "Unauthorised access, scraping, reverse engineering, or any attempt to\n" +
      "copy, clone, or white-label this service is strictly prohibited and\n" +
      "may result in legal action.\n\n" +
      "See https://holarchealth.com/intellectual-property",
    "color:#0F766E;font-size:13px;line-height:1.5;"
  );
}

import { MfaGate } from "@/components/auth/MfaGate";
import { TourProvider } from "@/components/tour/TourProvider";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <MfaGate>
      <TourProvider>{children}</TourProvider>
    </MfaGate>
  );
}

function RoleBasedRedirect() {
  const { isReferralAgent, hasDoctorRole, loading } = useUserRole();
  const { isLoading: adminLoading } = useIsAdmin();

  if (loading || adminLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (hasDoctorRole) {
    return <Navigate to="/broker-dashboard" replace />;
  }

  if (isReferralAgent) {
    return <Navigate to="/referrer-dashboard" replace />;
  }

  return <Navigate to="/my-dashboard" replace />;

}

function WealthRouteGuard() {
  const loc = useLocation();
  const { isAdmin, isLoading } = useIsAdmin();
  const { hasDoctorRole, hasPatientRole, loading: roleLoading } = useUserRole();
  if (!isLoading && !isAdmin && isWealthHidden(loc.pathname)) return <Navigate to="/dashboard" replace />;
  // Clients never reach firm-facing screens (My Business, My Clients).
  const clientOnly = !roleLoading && !isLoading && !isAdmin && hasPatientRole && !hasDoctorRole;
  if (clientOnly && (loc.pathname === "/business" || loc.pathname.startsWith("/business/") || loc.pathname === "/clients")) {
    return <Navigate to="/my-dashboard" replace />;
  }
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
        >
          Skip to main content
        </a>
        <WealthRouteGuard />
        <div id="main-content">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/join/:token" element={<JoinInvite />} />
          <Route path="/join-team/:token" element={<JoinTeamInvite />} />
          <Route path="/referrer-signup" element={<ReferrerSignup />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/onboarding" element={<Auth />} />
          <Route path="/provider-signup" element={<ProviderSignup />} />
          <Route path="/admin/provider-approval" element={<ProviderApprovalAction />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/intellectual-property" element={<Navigate to="/terms-and-conditions#intellectual-property" replace />} />
          <Route path="/client-consent" element={<ClientConsent />} />
          <Route path="/wealth-manager-agreement" element={<WealthManagerAgreement />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Patient routes - using PatientAppLayout (no sidebar/bottom nav) */}
          <Route
            element={
              <ProtectedRoute>
                <PatientAppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/client/advisors" element={<MyDoctors />} />
            <Route path="/client/calendar" element={<PatientCalendar />} />
            <Route path="/client/invoices" element={<Invoices />} />
            <Route path="/client/invites" element={<PatientAccessManagement />} />
            <Route path="/client/tasks" element={<PatientTasks />} />
            <Route path="/client/documents" element={<PatientDocuments />} />
            <Route path="/client/details" element={<MyDetails />} />
            <Route path="/sessions/:id" element={<SessionDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Protected routes with full layout (doctors/admins + shared) */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Doctor dashboard */}
            <Route path="/broker-dashboard" element={<Dashboard />} />
            
            {/* Doctor routes */}
            <Route path="/clients" element={<Patients />} />
            <Route path="/clients/:id" element={<PatientProfile />} />
            <Route path="/broker/consultations" element={<DoctorSessions />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/todos" element={<TodoList />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/my-sessions" element={<MySessions />} />
            <Route path="/my-dashboard" element={<MyPersonalDashboard />} />
            <Route path="/my-future" element={<MyFuture />} />
            <Route path="/my-workspace" element={<MyWorkspace />} />
            <Route path="/messenger" element={<Messenger />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/sessions/:id" element={<SessionDetail />} />

            <Route path="/documents" element={<DoctorDocumentsPage />} />
            <Route path="/my-views" element={<MyViews />} />
            <Route path="/invoices" element={<DoctorInvoices />} />
            <Route path="/business" element={<MyPractice />} />
            <Route path="/firm-clients" element={<PracticePatients />} />
            <Route path="/referral-partners" element={<ReferralDoctors />} />
            <Route path="/cpd-certificates" element={<Navigate to="/profile" replace />} />
            <Route path="/expiring-recordings" element={<ExpiringRecordings />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/activity-log" element={<ActivityLog />} />
            <Route path="/referrer-dashboard" element={<ReferrerDashboard />} />
            <Route path="/referrer-commissions" element={<ReferrerCommissions />} />
            <Route path="/referrers" element={<BrokerReferrers />} />
            <Route path="/app-integrations" element={<AppIntegrations />} />
            <Route path="/quotes-screen" element={<QuotesScreen />} />
            <Route path="/earnings" element={<Navigate to="/business?tab=earnings" replace />} />

            {/* Admin routes */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/pricing" element={<PricingAdmin />} />
            <Route path="/admin/performance" element={<CountryPerformance />} />
            <Route path="/admin/bulk-password-reset" element={<BulkPasswordReset />} />
            <Route path="/admin/wealth-users" element={<WealthUsers />} />
            <Route path="/admin/integrations" element={<IntegrationsAdmin />} />

            {/* Common routes */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Role-based redirect for /dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
