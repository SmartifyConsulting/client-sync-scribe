import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import holarcLogoAsset from "@/assets/holarc-health-logo.png.asset.json";
const holarcLogo = holarcLogoAsset.url;
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AccountMenu } from "@/components/layout/AccountMenu";
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


  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[252px] bg-sidebar">
      <div className="flex h-full flex-col">
        <div className="flex h-24 items-center gap-3 px-6">
          <img src={holarcLogo} alt="Holarc Health" className="h-[82px] w-auto object-contain" />
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

        <nav className="flex-1 px-4 pt-[1.5cm] py-1 space-y-4 overflow-y-auto font-size-preserve">
          {sections.map((section) => (
            <div key={section.id} className="space-y-1.5">
              {section.title && (
                <p className="mx-1 px-3 py-1.5 rounded-md bg-neutral-600 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                  {t(section.titleKey, { defaultValue: section.title })}
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
                    <span className="flex-1">{t(item.labelKey, { defaultValue: item.label })}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto px-2 pb-2">
          <AccountMenu
            align="start"
            alignOffset={0}
            trigger={
              <button className="flex w-full items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors">
                <Avatar className="h-[3.2rem] w-[3.2rem] border-2 border-primary">
                  <AvatarImage
                    key={profile?.avatar_url}
                    src={profile?.avatar_url || undefined}
                    alt={profile?.full_name || "User"}
                  />
                  <AvatarFallback className="bg-muted text-foreground text-base">
                    {profile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-foreground truncate">{profile?.full_name || t("common.provider")}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {portal === "hospital" ? t("provider.hospitalOps") : t("provider.erProvider")}
                  </p>
                </div>
              </button>
            }
          />
        </div>
      </div>
    </aside>
  );
}
