import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import vulaSymbol from "@/assets/vula-symbol.png";

const PARTNER_URL = "https://portal.6dot50.com/";

export default function VulaWallet() {
  const navigate = useNavigate();

  const open = () => {
    window.open(PARTNER_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <Card className="w-full max-w-md border-primary/20 shadow-xl">
        <CardContent className="p-8 text-center space-y-6">
          <img src={vulaSymbol} alt="Vula" className="h-20 w-20 mx-auto object-contain" />

          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">Vula Wallet</h1>
            <p className="text-xs text-muted-foreground">Powered by 6Dot50</p>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Sign in to your Vula Wallet to redeem your Vulas at participating retailers
            and partner apps in our rewards network.
          </p>

          <Button onClick={open} size="lg" className="w-full gap-2">
            Continue to secure sign-in <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 text-left">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <span>
              You'll be taken to our secure partner's login page in a new tab. Your
              credentials are never stored by Holarc Health.
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-1 text-muted-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
