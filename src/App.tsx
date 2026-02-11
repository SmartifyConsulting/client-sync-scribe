import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
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

// Patient pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientCalendar from "./pages/patient/PatientCalendar";
import PrescriptionHistory from "./pages/patient/PrescriptionHistory";
import Invoices from "./pages/patient/Invoices";
import PatientAccessManagement from "./pages/patient/PatientAccessManagement";
import MyRewards from "./pages/patient/MyRewards";
import HealthAlbum from "./pages/patient/HealthAlbum";
import MyDoctors from "./pages/patient/MyDoctors";
import DoctorInvoices from "./pages/doctor/Invoices";
import PricingAdmin from "./pages/admin/PricingAdmin";
import GamificationAdmin from "./pages/admin/GamificationAdmin";
import UserManagement from "./pages/admin/UserManagement";
const queryClient = new QueryClient();

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

function RoleBasedDashboard() {
  const { isPatient, loading } = useUserRole();
  
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return isPatient ? <PatientDashboard /> : <Dashboard />;
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
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/patient-consent" element={<PatientConsent />} />
          <Route path="/business-associate-agreement" element={<BusinessAssociateAgreement />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Role-based dashboard */}
            <Route path="/dashboard" element={<RoleBasedDashboard />} />
            
            {/* Doctor routes */}
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<PatientProfile />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/todos" element={<TodoList />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/sessions/:id" element={<SessionDetail />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/invoices" element={<DoctorInvoices />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/connections" element={<Connections />} />
            
            {/* Patient routes */}
            <Route path="/patient/doctors" element={<MyDoctors />} />
            <Route path="/patient/calendar" element={<PatientCalendar />} />
            <Route path="/patient/prescriptions" element={<PrescriptionHistory />} />
            <Route path="/patient/invoices" element={<Invoices />} />
            <Route path="/patient/access" element={<PatientAccessManagement />} />
            <Route path="/patient/rewards" element={<MyRewards />} />
            <Route path="/patient/health-album" element={<HealthAlbum />} />
            
            {/* Admin routes */}
            <Route path="/admin/pricing" element={<PricingAdmin />} />
            <Route path="/admin/gamification" element={<GamificationAdmin />} />
            <Route path="/admin/users" element={<UserManagement />} />
            
            {/* Common routes */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
