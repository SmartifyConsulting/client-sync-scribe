import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard } from "lucide-react";

export function SubscriptionGateModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-2xl p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            {t("dialogs.subscriptionRequired")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("dialogs.subscribeMessage")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-muted border border-border">
            <p className="font-medium text-foreground">{t("dialogs.subscribeMonthly")}</p>
            <p className="text-primary font-bold text-lg">{t("dialogs.priceMonthly")}</p>
            <p className="text-muted-foreground">{t("dialogs.perMonth")}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted border border-border">
            <p className="font-medium text-foreground">{t("dialogs.subscribeAnnual")}</p>
            <p className="text-primary font-bold text-lg">{t("dialogs.priceAnnual")}</p>
            <p className="text-muted-foreground">{t("dialogs.perYear")} · {t("dialogs.save17Percent")}</p>
          </div>
        </div>

        <Button
          onClick={() => navigate("/settings?tab=billing")}
          className="w-full"
          size="lg"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          {t("dialogs.subscribeNow")}
        </Button>

        <p className="text-[10px] text-muted-foreground">
          {t("dialogs.subscriptionManagement")}
        </p>
      </div>
    </div>
  );
}
