import { Navigate, Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { Sidebar } from "./Sidebar";
import { PageTransition } from "./PageTransition";
import { Footer } from "./Footer";
import { TopBarIcons } from "./TopBarIcons";

import { AnimatePresence } from "framer-motion";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { useUserRole } from "@/hooks/useUserRole";
import { SubscriptionGateModal } from "@/components/auth/SubscriptionGateModal";
import { LifeBuoy } from "lucide-react";
import { EarlyReleaseNotice } from "@/components/EarlyReleaseNotice";
import { RouteTipHost } from "@/components/RouteTipHost";
import { useTranslation } from "react-i18next";


export function AppLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { isBlocked, daysRemaining, loading } = useSubscriptionGate();
  const { isPatient, isAdmin, loading: roleLoading } = useUserRole();

  // Allow access to settings page even when blocked (so they can subscribe)
  const isSettingsPage = location.pathname.startsWith("/settings");
  const isAdminRoute = location.pathname.startsWith("/admin");

  // Patients should be redirected to their layout, UNLESS they also hold the
  // admin role and are visiting an admin route — admins use this layout —
  // or they're on My Dashboard, which is shared across every role and lives
  // in this layout's route group regardless of who's viewing it.
  const isSharedDashboard = location.pathname === "/my-dashboard" || location.pathname.startsWith("/my-future") || location.pathname.startsWith("/my-workspace") || location.pathname.startsWith("/claims");
  if (!roleLoading && isPatient && !(isAdmin && isAdminRoute) && !isSharedDashboard) {
    return <Navigate to="/patient/details" replace />;
  }

  return (
    <div key={i18n.language} className="min-h-screen bg-background flex flex-col overflow-hidden">
      <EarlyReleaseNotice />


      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile header */}
      <MobileHeader />
      
      {/* Main content */}
      <main className="flex-1 pb-24 md:pb-0 md:ml-[var(--sidebar-width)]">
        {/* Persistent top-right icons on desktop */}
        <div className="hidden md:flex justify-end px-8 pt-4">
          <TopBarIcons />
        </div>
        <div className="px-6 py-6 md:px-12 md:pt-2 md:pb-8 max-w-7xl mx-auto">
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
          href="mailto:support@holarchealth.com?subject=Holarc Wealth%20Support"
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          <LifeBuoy className="h-3.5 w-3.5" /> {t("common.support")}
        </a>
      </div>

      {/* Footer - hidden on mobile due to bottom nav (full-width so divider spans the whole viewport) */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />

      <RouteTipHost />
    </div>
  );
}
