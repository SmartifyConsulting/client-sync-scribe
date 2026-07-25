import { Loader2, LogOut, ShieldCheck, UserCog } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { TEST_PROFILES, ADMIN_EMAIL } from "./testProfiles";
import { useImpersonate } from "./useImpersonate";
import { useTranslation } from "react-i18next";

export function ProviderProfileMenu() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const { impersonate, switching } = useImpersonate();

  const { data: currentEmail = "" } = useQuery({
    queryKey: ["auth-email-provider"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return (user?.email || "").toLowerCase();
    },
    staleTime: 5 * 60 * 1000,
  });

  const initials = (profile?.full_name || currentEmail || "U")
    .split(/\s+|@/)[0]
    .slice(0, 2)
    .toUpperCase();

  const isSeededTest = TEST_PROFILES.some(
    (p) => p.email !== ADMIN_EMAIL && p.email === currentEmail,
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="rounded-full p-0.5 hover:bg-accent transition-colors" aria-label={t("profileMenu.menu")}>
          <Avatar className="h-8 w-8 border-2 border-primary">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className={cn("p-1.5", isAdmin ? "w-72" : "w-56")}>
        <div className="px-2 py-1.5 border-b border-border mb-1">
          <p className="text-sm font-semibold text-foreground truncate">{profile?.full_name || t("profileMenu.user")}</p>
          <p className="text-sm text-muted-foreground truncate">{currentEmail}</p>
        </div>

        {isAdmin && (
          <div className="pt-1">
            <div className="flex items-center gap-1.5 px-2 py-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <UserCog className="h-3 w-3" /> {t("topbar.switchProfile")}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {TEST_PROFILES.map((p) => {
                const Icon = p.icon;
                const isCurrent = currentEmail === p.email;
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
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{p.role} - {p.email}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!isAdmin && isSeededTest && (
          <button
            onClick={() => impersonate(ADMIN_EMAIL)}
            disabled={!!switching}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 w-full rounded-md transition-colors text-left hover:bg-accent",
              switching && "opacity-50",
            )}
          >
            {switching === ADMIN_EMAIL ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{t("topbar.switchToAdmin")}</p>
              <p className="text-sm text-muted-foreground truncate">Georgia Adams - {ADMIN_EMAIL}</p>
            </div>
          </button>
        )}

        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
          className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors w-full mt-1 border-t border-border pt-2"
        >
          <LogOut className="h-3.5 w-3.5" /> {t("common.signOut")}
        </button>
      </PopoverContent>
    </Popover>
  );
}

