import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import holarcLogoAsset from "@/assets/holarc-health-logo.png.asset.json";
const holarcLogo = holarcLogoAsset.url;
import holarcHelpLogo from "@/assets/holarc-help-logo.png";
import { cn } from "@/lib/utils";
import { Settings, LogOut, UserCog, ArrowLeft } from "lucide-react";

import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useProviderCapabilities } from "@/modules/holarchelp/hooks/useProviderCapabilities";
import { getProviderModules } from "@/modules/holarchelp/nav/registry";

interface ProviderSidebarProps {
  portal: "hospital" | "ambulance";
  onNavigate?: () => void;
}

export function ProviderSidebar({ portal, onNavigate }: ProviderSidebarProps) {
  const { profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const { t } = useTranslation();
  const location = useLocation();
  const { capabilities } = useProviderCapabilities();
  const sections = getProviderModules(portal, capabilities);
  const profilePath = portal === "hospital" ? "/provider/hospital/profile" : "/provider/ambulance/profile";
  const logo = portal === "ambulance" ? holarcHelpLogo : holarcLogo;
  const logoAlt = portal === "ambulance" ? "Holarc Help" : "Holarc Health";


  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[252px] bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        <div className="flex h-24 items-center gap-3 px-6">
          <img src={logo} alt={logoAlt} className="h-[82px] w-auto object-contain" />
        </div>

        {isAdmin && (
          <NavLink
            to="/admin/users"
            onClick={onNavigate}
            className="mx-4 mb-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> {t("nav.backToAdmin")}
          </NavLink>
        )}

        <nav className="flex-1 px-4 pt-[1.5cm] py-1 space-y-1.5 overflow-y-auto font-size-preserve">
          {sections.map((section) => (
            <div key={section.title || "main"} className="space-y-1.5">
              {section.title && (
                <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = item.end
                  ? location.pathname === item.to
                  : location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-[13px] font-medium transition-all duration-200",
                      isActive
                        ? item.danger
                          ? "bg-red-600 text-white shadow-sm"
                          : "bg-primary text-primary-foreground shadow-sm"
                        : item.danger
                          ? "text-red-600 hover:bg-red-600/10"
                          : "text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1">{t(item.labelKey)}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border mt-auto bg-sidebar-accent/30">
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            <Avatar className="h-8 w-8 border-2 border-primary">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || t("profileMenu.user")} />
              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                {profile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary truncate">{profile?.full_name || t("common.provider")}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground truncate">
                {portal === "hospital" ? t("provider.hospitalOps") : t("provider.erProvider")}
              </p>
            </div>
          </div>
          <div className="px-3 pb-3 space-y-0.5">
            <NavLink
              to={profilePath}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-primary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )
              }
            >
              <UserCog className="h-4 w-4" />
              {t("nav.providerProfile")}
            </NavLink>
            <NavLink
              to="/settings"
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-primary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )
              }
            >
              <Settings className="h-4 w-4" />
              {t("common.settings")}
            </NavLink>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              {t("common.signOut")}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
