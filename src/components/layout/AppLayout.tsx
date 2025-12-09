import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { PageTransition } from "./PageTransition";
import { AnimatePresence } from "framer-motion";

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header - hidden on desktop */}
      <MobileHeader />
      
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Main content - responsive margins */}
      <main className="min-h-screen md:ml-72 pb-24 md:pb-0">
        <div className="px-4 py-6 md:px-8 md:py-8 max-w-7xl">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
