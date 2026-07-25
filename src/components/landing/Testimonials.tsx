import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";

const QUOTES = [
  {
    quote:
      "The AI summaries save me at least an hour every day. I can focus on the patient instead of typing notes.",
    name: "Dr. Naledi M.",
    role: "General Practitioner Â· Johannesburg",
  },
  {
    quote:
      "I love that I finally have one place where every doctor's notes, my prescriptions and my appointments live together.",
    name: "Thandi K.",
    role: "Patient Â· Cape Town",
  },
  {
    quote:
      "Round Table is the first tool that actually lets me coordinate with the cardiologist and physio in real time.",
    name: "Dr. Sipho D.",
    role: "Internal Medicine Â· Durban",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Trusted by clinicians and patients.
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Real stories from doctors and patients running their care on Holarc.
          </p>
          <div className="mt-4 flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-primary text-primary" />
            ))}
            <span className="ml-2 text-sm text-muted-foreground">4.9 average rating</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {QUOTES.map((q, i) => (
            <motion.figure
              key={q.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-colors flex flex-col"
            >
              <Quote className="h-6 w-6 text-primary/50 mb-3" />
              <blockquote className="text-sm text-foreground leading-relaxed flex-1">
                "{q.quote}"
              </blockquote>
              <figcaption className="mt-5 pt-4 border-t border-border">
                <p className="text-sm font-semibold text-foreground">{q.name}</p>
                <p className="text-sm text-muted-foreground">{q.role}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

