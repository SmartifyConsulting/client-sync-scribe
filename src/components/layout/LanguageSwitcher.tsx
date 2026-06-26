import { Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ||
    SUPPORTED_LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) ||
    SUPPORTED_LANGUAGES[0];

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                aria-label={t("common.changeLanguage", "Change language")}
                className="h-9 w-9 rounded-full bg-white border border-border flex items-center justify-center hover:bg-accent transition-colors text-base leading-none overflow-hidden"
              >
                <span aria-hidden className="text-lg">
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
                onClick={() => i18n.changeLanguage(lang.code)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
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
