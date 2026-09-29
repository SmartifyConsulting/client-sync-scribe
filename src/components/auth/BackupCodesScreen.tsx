import { useEffect, useState } from "react";
import { Loader2, Copy, Download, Printer, ShieldCheck, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import holarcLogoAsset from "@/assets/holarc-wealth-logo.png.asset.json";
const holarcLogo = holarcLogoAsset.url;

interface Props {
  /** Called when the user has saved their codes and clicked Continue. */
  onContinue: () => void;
}

/**
 * Shown immediately after a phone-only user finishes enrolling their authenticator.
 * Generates and displays 8 one-time backup codes — the only self-service way to
 * recover their account if they lose their phone (since they have no email).
 */
export function BackupCodesScreen({ onContinue }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("mfa-backup-codes-generate");
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || "Could not create backup codes");
        setCodes(data.codes as string[]);
      } catch (err: any) {
        toast({
          title: "Could not create backup codes",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const codesText = codes.join("\n");

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(codesText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast({ title: "Copied", description: "All 8 codes copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Long-press to copy manually.", variant: "destructive" });
    }
  };

  const download = () => {
    const blob = new Blob(
      [
        `Holarc Health — Backup Codes\n` +
          `Generated: ${new Date().toLocaleString()}\n\n` +
          `Each code works once. Use one if you lose your phone.\n\n` +
          codesText +
          `\n`,
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "holarc-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const print = () => {
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    w.document.write(
      `<html><head><title>Indigro Backup Codes</title>
       <style>body{font-family:Arial,sans-serif;padding:24px}h1{font-size:18px}
       .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;font-family:monospace;font-size:18px}
       .code{padding:10px;border:1px solid #ccc;border-radius:6px;text-align:center}
       p{color:#444;font-size:13px}</style></head>
       <body><h1>Indigro — Backup Codes</h1>
       <p>Generated ${new Date().toLocaleString()}. Each code works once. Use one if you lose your phone.</p>
       <div class="grid">${codes.map((c) => `<div class="code">${c}</div>`).join("")}</div>
       </body></html>`
    );
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-start sm:items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-5 sm:mb-6 px-1">
            <div className="flex justify-center mb-3">
              <img src={holarcLogo} alt="Indigro" className="h-10 w-auto" />
            </div>
            <div className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-primary/10 mb-3">
              <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            </div>
            <p className="text-sm uppercase tracking-wider text-primary font-semibold mb-1">
              Last step · Save these codes
            </p>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">
              Save your backup codes
            </h1>
          </div>

          <div className="rounded-xl border border-primary bg-card p-4 sm:p-6 shadow-sm space-y-5">
            <div className="space-y-3 text-sm text-foreground">
              <p>
                Your authenticator app lives on your phone. <strong>If you lose your phone,
                you'll be locked out</strong> — unless you save these backup codes now.
              </p>
              <p>
                A backup code is a one-time password you type instead of the 6-digit code from
                your app. Each code works once, then disappears. Treat them like cash: store
                them somewhere safe — a note in your wallet, a printed sheet at home, or a
                password manager.
              </p>
              <p className="text-muted-foreground text-xs">
                We're showing you 8 codes. You only need them if you lose your phone.
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Generating your codes…</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-lg">
                  {codes.map((c) => (
                    <code
                      key={c}
                      className="bg-card border border-border rounded px-2 py-2 text-center text-base font-mono tracking-wider select-all"
                    >
                      {c}
                    </code>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button type="button" variant="outline" onClick={copyAll} className="min-h-11">
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-1 text-primary" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" /> Copy
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={download} className="min-h-11">
                    <Download className="h-4 w-4 mr-1" /> Save
                  </Button>
                  <Button type="button" variant="outline" onClick={print} className="min-h-11">
                    <Printer className="h-4 w-4 mr-1" /> Print
                  </Button>
                </div>

                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/40 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground">
                    These codes won't be shown again. If you lose them, you'll have to contact
                    support to get back into your account.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Checkbox
                    id="ack"
                    checked={acknowledged}
                    onCheckedChange={(v) => setAcknowledged(v === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="ack" className="text-sm font-normal cursor-pointer">
                    I've saved my backup codes somewhere safe.
                  </Label>
                </div>

                <Button
                  type="button"
                  className="w-full min-h-12 text-base"
                  disabled={!acknowledged}
                  onClick={onContinue}
                >
                  Continue
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
