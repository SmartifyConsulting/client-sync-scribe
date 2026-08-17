import { ReactNode } from "react";
import { Settings, LogOut, Share2, Stethoscope, HeartPulse, UserCog, ShieldCheck, Loader2 } from "lucide-react";
import { TEST_PROFILES } from "./testProfiles";
import { useImpersonate } from "./useImpersonate";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { ShareAppDialog } from "@/components/ShareAppDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface AccountMenuProps {
  trigger: ReactNode;
  align?: "start" | "end" | "center";
  alignOffset?: number;
}

export function AccountMenu({ trigger, align = "end", alignOffset = 0 }: AccountMenuProps) {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { isDoctor, isEmergency } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();
  const isOnPatientRoute = location.pathname.startsWith("/patient/");
  const isOnHospitalRoute = location.pathname.startsWith("/provider/hospital");
  const isOnAmbulanceRoute = location.pathname.startsWith("/provider/ambulance");
  const providerProfilePath = isOnHospitalRoute ? "/provider/hospital/profile" : "/provider/ambulance/profile";
  const { isAdmin } = useIsAdmin();
  const { impersonate, switching } = useImpersonate();

  const { data: currentEmail = "" } = useQuery({
    queryKey: ["auth-email-accountmenu"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return (user?.email || "").toLowerCase();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: liveNames = {} } = useQuery({
    queryKey: ["seeded-profile-names"],
    queryFn: async () => {
      const { data } = await (supabase.rpc as any)("get_seeded_profile_names");
      const map: Record<string, string> = {};
      ((data || []) as any[]).forEach((r) => {
        if (r.email && r.full_name) map[String(r.email).toLowerCase()] = r.full_name as string;
      });
      return map;
    },
    staleTime: 60 * 1000,
  });

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="p-1.5 w-[calc(var(--sidebar-width)_-_16px)]" align={align} alignOffset={alignOffset} sideOffset={8}>
        {/* Profile switcher */}
        {isDoctor && (
          <div className="border-b border-border mb-1 space-y-1">
            <button
              onClick={() => { if (isOnPatientRoute) navigate("/dashboard"); }}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 w-full rounded-md transition-colors",
                "bg-primary/10"
              )}
            >
              <Stethoscope className="h-3.5 w-3.5 text-primary" />
              <div className="text-left">
                <p className="text-xs font-semibold text-foreground">{profile?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground">{t("topbar.doctor")}</p>
              </div>
            </button>
          </div>
        )}

        {!isDoctor && (() => {
          const path = location.pathname;
          const roleLabel = path.startsWith("/provider/ambulance")
            ? t("topbar.er")
            : path.startsWith("/provider/hospital")
              ? t("topbar.hospital")
              : isEmergency
                ? t("topbar.er")
                : t("topbar.patient");
          return (
            <div className="px-2 py-1.5 border-b border-border mb-1">
              <p className="text-xs font-semibold text-foreground">{profile?.full_name || "User"}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          );
        })()}
        {(isAdmin || TEST_PROFILES.some((p) => p.email === currentEmail)) && (
          <div className="border-t border-border mt-1 pt-1">
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <UserCog className="h-3 w-3" /> {t("topbar.switchProfile")}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {TEST_PROFILES.map((p) => {
                const Icon = p.icon;
                const isCurrent = currentEmail.toLowerCase() === p.email;
                const isLoading = switching === p.email;
                return (
                  <button
                    key={p.email}
                    onClick={() => !isCurrent && impersonate(p.email)}
                    disabled={isCurrent || !!switching}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 w-full rounded-md transition-colors text-left",
                      isCurrent ? "bg-primary/10 cursor-default" : "hover:bg-accent",
                      switching && !isLoading && "opacity-50",
                    )}
                  >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Icon className="h-3.5 w-3.5 text-primary shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{liveNames[p.email] || p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.role} · {p.email}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {(isOnHospitalRoute || isOnAmbulanceRoute) && (
          <Link to={providerProfilePath} className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors">
            <UserCog className="h-3.5 w-3.5" /> {t("nav.providerProfile")}
          </Link>
        )}
        {isAdmin && (
          <Link to="/admin/users" className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors">
            <ShieldCheck className="h-3.5 w-3.5" /> {t("topbar.admin")}
          </Link>
        )}
        <Link to="/settings" className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors">
          <Settings className="h-3.5 w-3.5" /> {t("common.settings")}
        </Link>
        <ShareAppDialog trigger={
          <button className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-accent transition-colors w-full">
            <Share2 className="h-3.5 w-3.5" /> {t("topbar.shareApp")}
          </button>
        } />
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }} className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-destructive/10 text-destructive transition-colors w-full">
          <LogOut className="h-3.5 w-3.5" /> {t("common.signOut")}
        </button>
      </PopoverContent>
    </Popover>
  );
}
