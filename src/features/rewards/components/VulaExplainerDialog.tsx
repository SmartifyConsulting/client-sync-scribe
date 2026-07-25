import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Droplet, Users, TrendingUp, Ticket, Heart } from "lucide-react";
import vulaVouchersLogo from "@/assets/vula-vouchers-logo-v2.png";

interface VulaExplainerContentProps {
  onCta?: () => void;
  hideCta?: boolean;
}

export function VulaExplainerContent({ onCta, hideCta }: VulaExplainerContentProps) {
  const { t } = useTranslation();

  return (
    <div className="relative p-5 space-y-3">
      {/* Logo */}
      <div className="flex justify-center pt-1">
        <img
          src={vulaVouchersLogo}
          alt="Vula Vouchers"
          className="h-20 w-auto object-contain"
        />
      </div>

      {/* Headline */}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-foreground leading-tight">
          {t("rewards.vula.explainer.headline")}
          <br />
          <span className="bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent">
            {t("rewards.vula.explainer.languages")}
          </span>
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("rewards.vula.explainer.tagline")}
        </p>
      </div>

      {/* Divider with droplet */}
      <div className="relative flex items-center">
        <div className="flex-grow border-t border-border" />
        <div className="mx-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-50">
          <Droplet className="h-4 w-4 text-blue-500 fill-blue-500" />
        </div>
        <div className="flex-grow border-t border-border" />
      </div>

      {/* Section 1 */}
      <div className="flex gap-3">
        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
          <Users className="h-4 w-4 text-blue-500" />
        </div>
        <div className="flex-1 space-y-0.5">
          <p className="text-sm font-bold text-foreground leading-snug">
            {t("rewards.vula.explainer.section1Title")}
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t("rewards.vula.explainer.section1Desc")}
          </p>
          <p className="text-sm font-medium bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent">
            {t("rewards.vula.explainer.section1Tagline")}
          </p>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Section 2 */}
      <div className="flex gap-3">
        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground leading-snug">
            {t("rewards.vula.explainer.section2Title")}
          </p>
        </div>
      </div>

      {/* CTA */}
      {!hideCta && (
        <Button
          onClick={onCta}
          className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white gap-2 shadow-md h-10 text-sm font-semibold"
        >
          <Ticket className="h-4 w-4" />
          {t("rewards.vula.explainer.cta")}
        </Button>
      )}

      {/* Footer tagline */}
      <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <Heart className="h-4 w-4 text-blue-500 fill-blue-500" />
        <span>{t("rewards.vula.explainer.footerTagline")}</span>
      </div>
    </div>
  );
}

interface VulaExplainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCta?: () => void;
}

export function VulaExplainerDialog({ open, onOpenChange, onCta }: VulaExplainerDialogProps) {
  const handleCta = () => {
    if (onCta) onCta();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs p-0 overflow-hidden border-0 gap-0 bg-card rounded-2xl">
        <VulaExplainerContent onCta={handleCta} />
      </DialogContent>
    </Dialog>
  );
}

