import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

/**
 * Indigro mode's home screen — a plain, dark full-bleed hero modelled directly
 * on Indigro's own welcome.tsx (bg-navy, hero logo, eyebrow, two feature
 * columns, sign-in card), instead of the busier Holarc Wealth marketing page.
 */
const HERO = {
  eyebrow: "Clients · Advice · Compliance",
  title: "Run advice, end to end, in one place",
  subtitle:
    "Clients, consultations, recommendations, applications and annual reviews — connected, versioned and audited.",
  columns: [
    {
      heading: "For your clients",
      points: [
        "One clear record of advice, signed digitally",
        "Always know what's next and what's waiting",
        "Follow the journey from consultation to review",
      ],
    },
    {
      heading: "For your firm",
      points: [
        "Compliance checks before submission is allowed",
        "A tamper-evident record of every step taken",
        "One shared workspace across your team",
      ],
    },
  ],
} as const;

export default function IndigroWelcome() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-[#111418] text-white"
      style={{
        // Matches Indigro's own welcome page: buttons/focus rings on this
        // page use the brand teal as --primary, not the app's usual blue.
        ["--primary" as any]: "174 60% 54%",
        ["--primary-foreground" as any]: "223 21% 16%",
        ["--ring" as any]: "174 60% 54%",
      }}
    >
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <span />
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => navigate("/auth")}>
            Log in
          </Button>
          <Button onClick={() => navigate("/auth?mode=signup")}>Get Started</Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl items-start px-4 pb-16 pt-2 sm:px-8 lg:min-h-[calc(100vh-88px)] lg:grid-cols-[1.1fr_0.9fr] lg:content-center lg:gap-x-14 lg:pb-24 lg:pt-0">
        <div className="lg:col-start-1 lg:row-start-1">
          <Logo size="hero" onDark className="mb-8 leading-none" />
          <p className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#44d0c1]">
            {HERO.eyebrow}
          </p>
        </div>

        <section className="lg:col-start-1 lg:row-start-2 lg:self-center">
          <h1 className="text-4xl font-medium leading-[1.1] text-white sm:text-5xl sm:leading-[1.1]">{HERO.title}</h1>
          <p className="mt-4 max-w-xl text-base text-white/70">{HERO.subtitle}</p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {HERO.columns.map((col) => (
              <div key={col.heading}>
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#44d0c1]">
                  {col.heading}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {col.points.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-white/85">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#44d0c1]" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 w-full max-w-[520px] rounded-md border border-white/10 bg-white p-6 text-[#111418] sm:p-8 lg:col-start-2 lg:row-start-2 lg:mt-0 lg:justify-self-end lg:self-center">
          <h2 className="text-xl font-medium mb-2 text-[#111418]">Sign in to your workspace</h2>
          <p className="text-sm text-black/60 mb-6">
            Enter your details on the sign-in page to continue.
          </p>
          <div className="space-y-3">
            <Button className="w-full" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/auth?mode=signup")}>
              Create an account
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
