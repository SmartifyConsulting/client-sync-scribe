import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, LifeBuoy } from "lucide-react";
import { PageTransition } from "./PageTransition";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";
import { AnimatePresence } from "framer-motion";
import { useSubscriptionGate } from "@/hooks/useSubscriptionGate";
import { SubscriptionGateModal } from "@/components/auth/SubscriptionGateModal";
import holarcLogoAsset from "@/assets/holarc-health-logo.png.asset.json";
const holarcLogo = holarcLogoAsset.url;
import { TopBarIcons } from "./TopBarIcons";
import { useTranslation } from "react-i18next";

import { EarlyReleaseNotice } from "@/components/EarlyReleaseNotice";
import { RouteTipHost } from "@/components/RouteTipHost";



export function PatientAppLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isBlocked, daysRemaining, loading } = useSubscriptionGate();

  const isSettingsPage = location.pathname.startsWith("/settings");

  return (
    <div key={i18n.language} className="min-h-screen bg-background flex flex-col overflow-hidden">
      <EarlyReleaseNotice />

      {/* Sidebar for tablet/web */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      {/* Subscription gate disabled during MVP phase */}



      {/* Top Bar - only on mobile */}
      <header className="sticky top-0 z-50 bg-background border-b border-border md:hidden">
        <div className="px-4 py-3 flex items-center justify-between max-w-7xl mx-auto w-full">
          {/* Left: Logo */}
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={holarcLogo} alt="Holarc" className="h-10 w-auto object-contain" />
          </button>

          {/* Right: shared icons (Bug Â· Calendar Â· Mic Â· Bell Â· Avatar) */}
          <TopBarIcons />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-24 md:pb-0 md:ml-[var(--sidebar-width)]">
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

      {/* Mobile support link */}
      <div className="md:hidden px-4 pb-24 -mt-4">
        <a
          href="mailto:support@holarchealth.com?subject=Holarc%20Health%20Support"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <LifeBuoy className="h-3.5 w-3.5" /> {t("common.support")}
        </a>
      </div>

      {/* Footer - hidden on mobile due to bottom nav (full-width so divider spans the whole viewport) */}
      <div className="hidden md:block">
        <Footer />
      </div>

      <BottomNav />
      <RouteTipHost />
    </div>
  );
}


