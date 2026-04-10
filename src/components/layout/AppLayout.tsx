import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { PageTransition } from "./PageTransition";
import { Footer } from "./Footer";
import { TopBarIcons } from "./TopBarIcons";
import { AnimatePresence } from "framer-motion";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { SubscriptionGateModal } from "@/components/auth/SubscriptionGateModal";
import { AlertCircle } from "lucide-react";

export function AppLayout() {
  const location = useLocation();
  const { isBlocked, daysRemaining, loading } = useSubscriptionGate();

  // Allow access to settings page even when blocked (so they can subscribe)
  const isSettingsPage = location.pathname.startsWith("/settings");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Subscription gate modal */}
      {!loading && isBlocked && !isSettingsPage && <SubscriptionGateModal />}

      {/* Expiring soon banner */}
      {!loading && !isBlocked && daysRemaining !== null && daysRemaining <= 7 && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-700 flex items-center justify-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          Your free access ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. Subscribe in Settings to continue using the app.
        </div>
      )}

      {/* Mobile header - hidden on desktop */}
      <MobileHeader />
      
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Main content - responsive margins */}
      <main className="flex-1 md:ml-[210px] pb-24 md:pb-0">
        {/* Persistent top-right icons on desktop */}
        <div className="hidden md:flex justify-end px-8 pt-4">
          <TopBarIcons />
        </div>
        <div className="px-4 py-6 md:px-8 md:pt-2 md:pb-8 max-w-7xl">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer - hidden on mobile due to bottom nav */}
      <div className="hidden md:block md:ml-[210px]">
        <Footer />
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
