import { Navigate, Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { Sidebar } from "./Sidebar";
import { PageTransition } from "./PageTransition";
import { Footer } from "./Footer";
import { TopBarIcons } from "./TopBarIcons";
import { InstallMobileStrip } from "./InstallMobileStrip";
import { AnimatePresence } from "framer-motion";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { useUserRole } from "@/hooks/useUserRole";
import { SubscriptionGateModal } from "@/components/auth/SubscriptionGateModal";
import { AlertCircle, LifeBuoy } from "lucide-react";
import { EarlyReleaseNotice } from "@/components/EarlyReleaseNotice";


export function AppLayout() {
  const location = useLocation();
  const { isBlocked, daysRemaining, loading } = useSubscriptionGate();
  const { isPatient, isAdmin, loading: roleLoading } = useUserRole();

  // Allow access to settings page even when blocked (so they can subscribe)
  const isSettingsPage = location.pathname.startsWith("/settings");
  const isAdminRoute = location.pathname.startsWith("/admin");

  // Patients should be redirected to their layout, UNLESS they also hold the
  // admin role and are visiting an admin route — admins use this layout.
  if (!roleLoading && isPatient && !(isAdmin && isAdminRoute)) {
    return <Navigate to="/patient/details" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <EarlyReleaseNotice />


      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile install strip + header */}
      <InstallMobileStrip />
      <MobileHeader />
      
      {/* Main content */}
      <main className="flex-1 pb-24 md:pb-0 md:ml-[var(--sidebar-width)]">
        {/* Persistent top-right icons on desktop */}
        <div className="hidden md:flex justify-end px-8 pt-4">
          <TopBarIcons />
        </div>
        <div className="px-4 py-6 md:px-8 md:pt-2 md:pb-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile support link (footer hidden on mobile) */}
      <div className="md:hidden px-4 pb-24 -mt-4">
        <a
          href="mailto:support@holarchealth.com?subject=Holarc%20Health%20Support"
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          <LifeBuoy className="h-3.5 w-3.5" /> Contact Support
        </a>
      </div>

      {/* Footer - hidden on mobile due to bottom nav */}
      <div className="hidden md:block md:ml-[var(--sidebar-width)]">
        <Footer />
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />

    </div>
  );
}
