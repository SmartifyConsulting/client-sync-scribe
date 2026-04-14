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
import { AlertCircle } from "lucide-react";

export function AppLayout() {
  const location = useLocation();
  const { isBlocked, daysRemaining, loading } = useSubscriptionGate();
  const { isPatient, loading: roleLoading } = useUserRole();

  // Allow access to settings page even when blocked (so they can subscribe)
  const isSettingsPage = location.pathname.startsWith("/settings");

  if (!roleLoading && isPatient) {
    return <Navigate to="/patient/details" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Subscription gate modal */}
      {!loading && isBlocked && !isSettingsPage && <SubscriptionGateModal />}

      {/* Expiring soon banner */}
      {!loading && !isBlocked && daysRemaining !== null && daysRemaining <= 7 && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-700 flex items-center justify-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          Your free access ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. Subscribe in Settings to continue using the app.
        </div>
      )}

      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile header - hidden on desktop */}
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

      {/* Footer - hidden on mobile due to bottom nav */}
      <div className="hidden md:block md:ml-[var(--sidebar-width)]">
        <Footer />
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
