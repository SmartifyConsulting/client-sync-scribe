import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, ArrowLeft, ShieldCheck, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import vulaSymbol from "@/assets/vula-symbol.png";

const PARTNER_URL = "https://secure.6dot50.com/lite/default";
const OVERLAY_ZIP = "/vula-vault-overlay.zip";

export default function VulaWallet() {
  const navigate = useNavigate();

  const open = () => {
    window.open(PARTNER_URL, "_blank", "noopener,noreferrer");
  };

  const downloadOverlay = async () => {
    try {
      const res = await fetch(OVERLAY_ZIP);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "vula-vault-overlay.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast.success("Overlay downloaded — see install steps below.");
    } catch (err: any) {
      toast.error(err?.message || "Download failed");
    }
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

          <div className="border-t pt-5 space-y-3 text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Demo Branding Overlay</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              For live demos, install the Vula Vault branding overlay. It visually
              rebrands the partner login page in your browser without changing any
              functionality.
            </p>
            <Button
              onClick={downloadOverlay}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <Download className="h-4 w-4" /> Download Demo Branding Overlay
            </Button>

            <Accordion type="single" collapsible>
              <AccordionItem value="install" className="border-primary/20">
                <AccordionTrigger className="text-xs py-2">
                  How to install (Chrome / Edge / Brave)
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
                    <li>Unzip the downloaded <code>vula-vault-overlay.zip</code>.</li>
                    <li>Open <code>chrome://extensions</code> in your browser.</li>
                    <li>Enable <strong>Developer mode</strong> (top-right toggle).</li>
                    <li>Click <strong>Load unpacked</strong> and select the unzipped folder.</li>
                    <li>Visit the partner login — branding appears automatically.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
