import { useState } from "react";
import { Loader2, Ambulance } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const DEV_EMAIL = "ner.test@holarchealth.test";
const DEV_PASSWORD = "ErTest1234!";

/**
 * Developer-only one-click sign-in as the NEMS (National Emergency Medical
 * Services) dispatcher account so we can test the SOS pickup flow end-to-end.
 * Visible only in dev mode or with ?devLogin=1.
 */
export function DevErLoginButton() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isDev =
    typeof window !== "undefined" &&
    (import.meta.env.DEV ||
      new URLSearchParams(window.location.search).get("devLogin") === "1");

  if (!isDev) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      // 1. Ensure the account exists (idempotent).
      const seed = await supabase.functions.invoke("seed-test-er-user", { body: {} });
      if (seed.error) throw seed.error;

      // 2. Sign in.
      const { error } = await supabase.auth.signInWithPassword({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
      });
      if (error) throw error;

      toast.success(t("components.auth.dev_login.signed_in_message"));
      navigate("/provider/ambulance");
    } catch (e: any) {
      toast.error(e?.message ?? t("components.auth.dev_login.error_message"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        {t("components.auth.dev_login.dev_only_label")}
      </p>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Ambulance className="mr-2 h-4 w-4 text-red-600" />
        )}
        {t("components.auth.dev_login.button_text")}
      </Button>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {t("components.auth.dev_login.test_description")}
      </p>
    </div>
  );
}
