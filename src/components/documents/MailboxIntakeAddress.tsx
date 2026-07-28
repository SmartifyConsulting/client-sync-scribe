import { useEffect, useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * Shows the signed-in user's personal document intake address so they know
 * exactly where to email documents from any mail client.
 */
export function MailboxIntakeAddress({ className }: { className?: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alias, setAlias] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) return;
    supabase
      .from("profiles")
      .select("mailbox_alias")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setAlias((data as any)?.mailbox_alias || null);
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (!alias) return null;

  const address = `${alias}@holarc.com`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Copy failed", description: address });
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 ${className || ""}`}
    >
      <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="text-xs text-muted-foreground">Email documents to</span>
      <code className="text-xs font-medium text-foreground">{address}</code>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={copy}
        title="Copy address"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
