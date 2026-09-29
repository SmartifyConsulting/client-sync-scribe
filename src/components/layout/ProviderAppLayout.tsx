import { Outlet, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { LifeBuoy } from "lucide-react";
import { ProviderSidebar } from "./ProviderSidebar";
import { TopBarIcons } from "./TopBarIcons";
import { Footer } from "./Footer";
import { PageTransition } from "./PageTransition";
import { EarlyReleaseNotice } from "@/components/EarlyReleaseNotice";
import holarcLogoAsset from "@/assets/holarc-health-logo.png.asset.json";
const holarcLogo = holarcLogoAsset.url;
import { useTranslation } from "react-i18next";


interface ProviderAppLayoutProps {
  portal: "hospital" | "ambulance";
  statsStrip?: ReactNode;
}

export function ProviderAppLayout({ portal, statsStrip }: ProviderAppLayoutProps) {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <EarlyReleaseNotice />
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <ProviderSidebar portal={portal} />
      </div>


      {/* Mobile header (no sidebar drawer for providers yet — Holarc logo + TopBarIcons) */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-background border-b border-border md:hidden">
        <img src={holarcLogo} alt="Indigro" className="h-10 w-auto object-contain" />
        <TopBarIcons variant="provider" />
      </header>

      <main className="flex-1 pb-8 md:ml-[var(--sidebar-width)]">
        {/* Desktop top bar with TopBarIcons */}
        <div className="hidden md:flex justify-end px-8 pt-4">
          <TopBarIcons variant="provider" />
        </div>

        {/* Provider ops stats strip — aligned with the page content below it */}
        {statsStrip && (
          <div className="px-4 md:px-8 pt-3 max-w-7xl mx-auto">
            {statsStrip}
          </div>
        )}

        <div className="px-4 py-4 md:px-8 md:pt-4 md:pb-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile support link */}
      <div className="md:hidden px-4 pb-4">
        <a
          href="mailto:support@holarchealth.com?subject=Indigro%20Support"
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          <LifeBuoy className="h-3.5 w-3.5" /> {t("common.support")}
        </a>
      </div>

      {/* Footer (full-width so divider spans the whole viewport) */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}

