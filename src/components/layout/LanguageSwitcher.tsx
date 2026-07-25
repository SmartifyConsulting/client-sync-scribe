import { useEffect } from "react";
import { Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();

  // On profile load / switch, adopt the user's saved language
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("id", user.id)
        .maybeSingle();
      const lang = (data as any)?.preferred_language;
      if (!cancelled && lang && lang !== i18n.language) {
        i18n.changeLanguage(lang);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ||
    SUPPORTED_LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) ||
    SUPPORTED_LANGUAGES[0];

  const pickLanguage = async (code: string) => {
    i18n.changeLanguage(code);
    if (user) {
      await supabase
        .from("profiles")
        .update({ preferred_language: code } as any)
        .eq("id", user.id);
    }
  };

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                aria-label={t("common.changeLanguage", "Change language")}
                className="h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold transition-colors overflow-hidden border border-white/20 shadow-sm hover:opacity-90"
                style={{ backgroundColor: "hsl(225 73% 38%)" }}
              >
                <span aria-hidden className="text-base leading-none">
                  {current?.flag || <Globe className="h-4 w-4" />}
                </span>
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("common.language", "Language")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="end" className="w-52 p-1.5">
        <div className="max-h-72 overflow-y-auto">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = lang.code === current?.code;
            return (
              <button
                key={lang.code}
                onClick={() => pickLanguage(lang.code)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  active ? "bg-primary/10" : "hover:bg-accent",
                )}
              >
                <span aria-hidden className="text-base">{lang.flag}</span>
                <span className="flex-1 truncate text-foreground">{lang.name}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

