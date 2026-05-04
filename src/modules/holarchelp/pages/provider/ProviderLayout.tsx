import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProviderGate } from "../../components/ProviderGate";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { to: "/provider", icon: LayoutDashboard, label: "Dispatch", end: true },
  { to: "/provider/profile", icon: Building2, label: "Profile" },
];

export default function ProviderLayout() {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <ProviderGate>
      <div className="min-h-dvh bg-background">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-sos" />
            <span className="font-extrabold">HolarcHelp <span className="text-muted-foreground font-medium">Provider</span></span>
          </div>
          <nav className="flex items-center gap-1">
            {items.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )
                }
              >
                <i.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{i.label}</span>
              </NavLink>
            ))}
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </ProviderGate>
  );
}
