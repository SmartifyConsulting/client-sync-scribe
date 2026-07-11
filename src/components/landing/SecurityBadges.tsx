import { motion } from "framer-motion";
import { ShieldCheck, Lock, KeyRound, FileCheck } from "lucide-react";

const BADGES = [
  {
    icon: ShieldCheck,
    title: "HIPAA-aligned",
    desc: "Designed to meet US health data protection standards.",
  },
  {
    icon: Lock,
    title: "AES-256 Encryption",
    desc: "Records encrypted at rest and in transit, end-to-end.",
  },
  {
    icon: FileCheck,
    title: "GDPR & POPIA",
    desc: "European & South African data privacy rights respected.",
  },
  {
    icon: KeyRound,
    title: "2FA required",
    desc: "Every account must enrol an authenticator app — no exceptions.",
  },
];

export function SecurityBadges() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background border-y border-border">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-3">
            <ShieldCheck className="h-4 w-4" />
            Security & Compliance
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Built for the most sensitive data in your life.
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
            Holarc treats health data like the high-stakes information it is. Every account is protected by
            mandatory two-factor authentication and end-to-end encryption.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {BADGES.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-5 text-center hover:border-primary/40 transition-colors"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <b.icon className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">{b.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
