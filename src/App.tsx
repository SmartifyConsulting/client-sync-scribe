import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PatientAppLayout } from "@/components/layout/PatientAppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";
import CalendarView from "./pages/CalendarView";
import Sessions from "./pages/Sessions";
import SessionDetail from "./pages/SessionDetail";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import TodoList from "./pages/TodoList";
import Notifications from "./pages/Notifications";
import Connections from "./pages/Connections";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import TermsAndConditions from "./pages/TermsAndConditions";
import PatientConsent from "./pages/PatientConsent";
import BusinessAssociateAgreement from "./pages/BusinessAssociateAgreement";
import Legal from "./pages/Legal";

// Patient pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientCalendar from "./pages/patient/PatientCalendar";
import Documentation from "./pages/patient/PrescriptionHistory";
import Invoices from "./pages/patient/Invoices";
import PatientAccessManagement from "./pages/patient/PatientAccessManagement";
import MyRewards from "./pages/patient/MyRewards";
import HealthAlbum from "./pages/patient/HealthAlbum";
import MyDoctors from "./pages/patient/MyDoctors";
import PatientTasks from "./pages/patient/PatientTasks";
import PatientDocuments from "./pages/patient/PatientDocuments";
import PatientRoundTable from "./pages/patient/PatientRoundTable";
import MyDetails from "./pages/patient/MyDetails";
import DoctorInvoices from "./pages/doctor/Invoices";
import DoctorRewards from "./pages/doctor/DoctorRewards";
import MyPractice from "./pages/MyPractice";
import PricingAdmin from "./pages/admin/PricingAdmin";
import GamificationAdmin from "./pages/admin/GamificationAdmin";
import UserManagement from "./pages/admin/UserManagement";
import ReferralDoctors from "./pages/ReferralDoctors";
import ExpiringRecordings from "./pages/ExpiringRecordings";
import Admin from "./pages/Admin";
import ProviderSignup from "./pages/ProviderSignup";

// HolarcHelp module
import HolarcHelpRoutes from "./modules/holarchelp/routes";
import ProviderRoutes from "./modules/holarchelp/routes-provider";
import PublicTrack from "./modules/holarchelp/pages/PublicTrack";
import HolarcHelpProviders from "./pages/admin/HolarcHelpProviders";
import HolarcHelpAccountability from "./pages/admin/HolarcHelpAccountability";
import HolarcHelpProviderIncidents from "./pages/admin/HolarcHelpProviderIncidents";

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

  return <>{children}</>;
}

function RoleBasedRedirect() {
  const { isPatient, loading } = useUserRole();
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isPatient) {
    return <Navigate to="/patient/details" replace />;
  }

  return <Navigate to="/doctor-dashboard" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/provider-signup" element={<ProviderSignup />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/intellectual-property" element={<Navigate to="/terms-and-conditions#intellectual-property" replace />} />
          <Route path="/patient-consent" element={<PatientConsent />} />
          <Route path="/business-associate-agreement" element={<BusinessAssociateAgreement />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/track/:token" element={<PublicTrack />} />
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
            <Route path="/patient/doctors" element={<MyDoctors />} />
            <Route path="/patient/calendar" element={<PatientCalendar />} />
            <Route path="/patient/documentation" element={<Documentation />} />
            <Route path="/patient/invoices" element={<Invoices />} />
            <Route path="/patient/invites" element={<PatientAccessManagement />} />
            <Route path="/patient/rewards" element={<MyRewards />} />
            <Route path="/patient/health-album" element={<Navigate to="/dashboard" replace />} />
            <Route path="/patient/tasks" element={<PatientTasks />} />
            <Route path="/patient/documents" element={<PatientDocuments />} />
            <Route path="/patient/round-table" element={<PatientRoundTable />} />
            <Route path="/patient/details" element={<MyDetails />} />
            <Route path="/sessions/:id" element={<SessionDetail />} />
            <Route path="/patient/holarchelp/*" element={<HolarcHelpRoutes />} />
            <Route path="/doctor/holarchelp/*" element={<HolarcHelpRoutes />} />
            <Route path="/patient/incidents" element={<Navigate to="/patient/holarchelp/incidents" replace />} />
            <Route path="/doctor/incidents" element={<Navigate to="/doctor/holarchelp/incidents" replace />} />
            <Route path="/incidents" element={<Navigate to="/patient/holarchelp/incidents" replace />} />
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
            <Route path="/doctor-dashboard" element={<Dashboard />} />
            
            {/* Doctor routes */}
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<PatientProfile />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/todos" element={<TodoList />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/sessions/:id" element={<SessionDetail />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/invoices" element={<DoctorInvoices />} />
            <Route path="/practice" element={<MyPractice />} />
            <Route path="/doctor/rewards" element={<DoctorRewards />} />
            <Route path="/referral-doctors" element={<ReferralDoctors />} />
            <Route path="/cpd-certificates" element={<Navigate to="/profile" replace />} />
            <Route path="/expiring-recordings" element={<ExpiringRecordings />} />
            <Route path="/connections" element={<Connections />} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/pricing" element={<PricingAdmin />} />
            <Route path="/admin/gamification" element={<GamificationAdmin />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/holarchelp-providers" element={<HolarcHelpProviders />} />
            <Route path="/admin/holarchelp-accountability" element={<HolarcHelpAccountability />} />
            <Route path="/admin/holarchelp-providers/:type/:id/incidents" element={<HolarcHelpProviderIncidents />} />
            
            {/* Common routes */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          
          {/* HolarcHelp provider portal (its own layout, gated by hospital_staff/ambulance_staff role) */}
          <Route path="/provider/*" element={<ProtectedRoute><ProviderRoutes /></ProtectedRoute>} />

          {/* Role-based redirect for /dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
