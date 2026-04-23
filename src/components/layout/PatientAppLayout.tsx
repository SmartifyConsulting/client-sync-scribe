import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { PageTransition } from "./PageTransition";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";
import { AnimatePresence } from "framer-motion";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { SubscriptionGateModal } from "@/components/auth/SubscriptionGateModal";
import holarcLogo from "@/assets/holarc-logo-clear-2.png";
import { TopBarIcons } from "./TopBarIcons";

export function PatientAppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isBlocked, daysRemaining, loading } = useSubscriptionGate();

  const isSettingsPage = location.pathname.startsWith("/settings");

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Sidebar for tablet/web */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      {!loading && isBlocked && !isSettingsPage && <SubscriptionGateModal />}

      {!loading && !isBlocked && daysRemaining !== null && daysRemaining <= 7 && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-700 flex items-center justify-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          Your free access ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. Subscribe in Settings to continue using the app.
        </div>
      )}

      {/* Top Bar - only on mobile */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border md:hidden">
        <div className="px-4 py-3 flex items-center justify-between max-w-7xl mx-auto w-full">
          {/* Left: Logo */}
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={holarcLogo} alt="Holarc" className="h-10 w-auto object-contain" />
          </button>

          {/* Right: shared icons (Bug · Calendar · Mic · Bell · Avatar) */}
          <TopBarIcons />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-24 md:pb-0 md:ml-[var(--sidebar-width)]">
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

      <BottomNav />
    </div>
  );
}
