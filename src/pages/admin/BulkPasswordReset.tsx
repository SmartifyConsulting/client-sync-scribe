import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const DEFAULT_EMAILS = [
  "er.test@holarchealth.com",
  "hospital.test@holarchhealth.com",
  "zano@smartify.co.za",
  "renken@smartify.co.za",
  "sme@smartify.co.za",
  "paraskevoulasoldatos@gmail.com",
  "projectmanager@smartify.co.za",
  "info@georgiaadams.co.za",
  "christina@smartify.co.za",
  "jeanprodromos@smartify.co.za",
].join("\n");

type Row = {
  email: string;
  status: "pending" | "ok" | "error";
  message?: string;
};

export default function BulkPasswordReset() {
  const { t } = useTranslation();
  const { isAdmin, isLoading } = useIsAdmin();
  const [emailsText, setEmailsText] = useState(DEFAULT_EMAILS);
  const [password, setPassword] = useState("Password123");
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const run = async () => {
    const emails = emailsText
      .split(/\r?\n/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (emails.length === 0 || !password) return;

    setRunning(true);
    const initial: Row[] = emails.map((email) => ({ email, status: "pending" }));
    setRows(initial);

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      try {
        const { data, error } = await supabase.functions.invoke("admin-set-user-password", {
          body: { email, password, send_email: false, auto_generate: false },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setRows((prev) => {
          const next = [...prev];
          next[i] = { email, status: "ok", message: (data as any)?.action ?? "updated" };
          return next;
        });
      } catch (e: any) {
        setRows((prev) => {
          const next = [...prev];
          next[i] = { email, status: "error", message: e?.message ?? "failed" };
          return next;
        });
      }
    }
    setRunning(false);
  };

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('admin.bulkPasswordReset.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('admin.bulkPasswordReset.description')}
        </p>
      </div>

      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="pt-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-700 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-foreground">
            {t('admin.bulkPasswordReset.warning')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.bulkPasswordReset.targets')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="emails">{t('admin.bulkPasswordReset.emailsLabel')}</Label>
            <Textarea
              id="emails"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              rows={12}
              className="font-mono text-sm"
              disabled={running}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t('admin.bulkPasswordReset.passwordLabel')}</Label>
            <Input
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={running}
            />
          </div>
          <Button onClick={run} disabled={running} className="min-h-11">
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('admin.bulkPasswordReset.resetting')}
              </>
            ) : (
              t('admin.bulkPasswordReset.resetButton')
            )}
          </Button>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('admin.bulkPasswordReset.results')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li
                  key={r.email}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="font-mono text-foreground truncate">{r.email}</span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    {r.status === "pending" && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {r.status === "ok" && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          {r.message}
                        </span>
                      </>
                    )}
                    {r.status === "error" && (
                      <>
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">{r.message}</span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

