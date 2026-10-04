import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SignInCard } from "@/components/auth/SignInCard";
import { useAuth } from "@/hooks/useAuth";

const HERO = {
  eyebrow: "Life cover · Investments · Governance",
  title: "Smart Governance for Portfolio Growth",
  subtitle:
    "For FSPs and their advisors: advise on life cover and investments, grow your clients' income, and show your Key Individual and the regulator that every step followed the rules.",
  columns: [
    {
      heading: "For your clients",
      points: [
        "Life cover sized to what their family would really need",
        "Investments to grow their income, chosen around their goals",
        "One clear plan, signed digitally and reviewed every year",
      ],
    },
    {
      heading: "For your FSP",
      points: [
        "Compliance checks that stop out-of-order steps before they happen",
        "A tamper-evident record of every disclosure, signature and piece of advice",
        "Live oversight of every advisor for your Key Individual",
      ],
    },
  ],
  footnote:
    "Life policies and investments carry risk and returns are not guaranteed. indigro supports, and does not replace, your FSP's own compliance responsibilities. Advice is provided by licensed financial services providers.",
} as const;

export default function IndigroWelcome() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-navy text-navy-foreground">
      <main className="mx-auto grid max-w-6xl items-start px-4 pb-16 pt-10 sm:px-8 lg:min-h-screen lg:grid-cols-[1.1fr_0.9fr] lg:content-center lg:gap-x-14 lg:pb-24 lg:pt-0">
        <div className="lg:col-start-1 lg:row-start-1">
          <Logo size="hero" onDark className="mb-8 leading-none" />
          <p className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand">{HERO.eyebrow}</p>
        </div>

        <section className="lg:col-start-1 lg:row-start-2 lg:self-center">
          <h1 className="font-display text-4xl font-medium leading-[1.1] sm:text-5xl">{HERO.title}</h1>
          <p className="mt-4 max-w-xl text-base text-navy-foreground/70">{HERO.subtitle}</p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {HERO.columns.map((col) => (
              <div key={col.heading}>
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-brand">{col.heading}</p>
                <ul className="mt-3 space-y-2.5">
                  {col.points.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-navy-foreground/85">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-xl text-xs leading-5 text-navy-foreground/55">{HERO.footnote}</p>
        </section>

        <section className="mt-10 w-full max-w-[520px] lg:col-start-2 lg:row-start-2 lg:mt-0 lg:justify-self-end lg:self-center">
          <SignInCard onSignUp={() => navigate("/auth?mode=signup")} />
        </section>
      </main>
    </div>
  );
}
