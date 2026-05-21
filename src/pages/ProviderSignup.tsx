import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Building2, Mail, ShieldCheck } from "lucide-react";

/**
 * Public organisation self-signup is intentionally disabled.
 * Hospitals and Emergency Response providers are onboarded by Holarc admins;
 * individual staff are then invited from the organisation's admin console.
 */
export default function ProviderSignup() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Home
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-center text-3xl font-extrabold">Onboard your organisation</h1>
        <p className="mt-3 text-center text-muted-foreground">
          Hospitals and Emergency Response providers are onboarded directly by the Holarc Health team.
          Public self-signup for organisations has been disabled to protect the SOS network.
        </p>

        <Card className="mt-8">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">How onboarding works</p>
                <ol className="mt-1 list-decimal pl-4 text-sm text-muted-foreground space-y-1">
                  <li>Contact us with your organisation details and credentials.</li>
                  <li>Holarc creates your organisation and assigns your first admin account.</li>
                  <li>That admin invites paramedics, doctors, nurses and coordinators from inside the portal.</li>
                </ol>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4" /> Reach the onboarding team
              </p>
              <a
                href="mailto:onboarding@holarchealth.com?subject=Organisation%20onboarding%20request"
                className="mt-1 inline-block text-primary underline"
              >
                onboarding@holarchealth.com
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              Already invited? Check your email for an invitation link from your administrator and follow it to
              create your individual staff account.
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate("/auth")}>I already have an account — sign in</Button>
        </div>
      </main>
    </div>
  );
}
