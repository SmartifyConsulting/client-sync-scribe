import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { PageTransition } from "./PageTransition";
import { AnimatePresence } from "framer-motion";

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-72 min-h-screen">
        <div className="px-8 py-8 max-w-7xl">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
