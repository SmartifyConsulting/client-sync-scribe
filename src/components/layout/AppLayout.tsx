import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-72 min-h-screen">
        <div className="px-8 py-8 max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
