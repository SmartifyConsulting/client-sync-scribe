import { useState } from "react";
import { useNavigate } from "react-router-dom";
import holarcLogo from "@/assets/holarc-logo-clear.png";
import { motion } from "framer-motion";
import {
  Stethoscope,
  UserCircle,
  Calendar,
  FileText,
  Brain,
  Shield,
  Eye,
  Users,
  Share2,
  Heart,
  ArrowRight,
  Mic,
  Video,
  Gift,
  Pill,
  ClipboardList,
  Sparkles,
  Activity,
  Hospital,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/layout/Footer";

const patientBenefits = [
  {
    icon: Eye,
    title: "Complete Health Picture",
    description:
      "See your entire medical history, prescriptions, and care team in one unified view—no more scattered records.",
  },
  {
    icon: Users,
    title: "Connect Your Care Team",
    description: "Invite specialists, GPs, and other providers to collaborate on your care with your full consent.",
  },
  {
    icon: Shield,
    title: "You're in Control",
    description:
      "Decide exactly which doctors see your records. Grant or revoke access anytime with granular permissions.",
  },
  {
    icon: Calendar,
    title: "Unified Appointments",
    description: "All your healthcare appointments from every provider in one calendar—never miss a follow-up.",
  },
];

const providerBenefits = [
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description:
      "Get comprehensive patient history summaries and medication conflict alerts before every consultation.",
  },
  {
    icon: Share2,
    title: "Seamless Collaboration",
    description: "Round Table notes enable real-time communication with other specialists caring for the same patient.",
  },
  {
    icon: FileText,
    title: "Automated Documentation",
    description: "Voice-to-text notes, auto-populated templates, and AI summaries save hours of administrative work.",
  },
  {
    icon: Heart,
    title: "Better Patient Outcomes",
    description:
      "Access complete patient history across all their providers—make informed decisions with the full picture.",
  },
];

const ecosystemFeatures = [
  "Patient-controlled access permissions",
  "Multi-provider care coordination",
  "Complete prescription history tracking",
  "AI-powered medication conflict alerts",
  "Unified appointment management",
  "Secure document sharing",
  "Real-time provider collaboration",
  "Comprehensive health timeline",
];

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  // If user is already logged in, redirect to dashboard
  if (!loading && user) {
    navigate("/dashboard");
    return null;
  }

  const handleRoleSelect = (role: "doctor" | "patient") => {
    setShowRoleDialog(false);
    navigate(`/auth?mode=signup&role=${role}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3" />
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate("/auth?mode=login")}
                className="text-muted-foreground hover:text-foreground"
              >
                Login
              </Button>
              <Button onClick={() => setShowRoleDialog(true)} className="btn-pill">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section — full ecosystem showcase */}
      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient background blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-20 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute top-40 right-0 h-80 w-80 rounded-full bg-[#E01837]/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
          {/* LEFT — copy + CTAs + capability pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 text-center lg:text-left"
          >
            <div className="mb-6 flex justify-center lg:justify-start">
              <img src={holarcLogo} alt="Holarc Health" className="h-16 sm:h-20 w-auto" />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered · Patient-controlled · HIPAA-aligned
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.05] mb-5">
              A revolutionary healthcare ecosystem
              <span className="block text-gradient pb-3">built around you.</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground mb-7 max-w-2xl lg:mx-0 mx-auto">
              Holarc is one connected platform where doctors run their entire practice and patients own their entire
              360° health story — from voice-recorded consultations and AI summaries, to video-verified medication
              adherence rewards, cross-specialist Round Tables, hospital admissions, prescriptions, billing, and a
              unified care calendar.
            </p>

            {/* Capability pills */}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-8">
              {[
                { icon: Mic, label: "Voice Consultations" },
                { icon: Brain, label: "AI Summaries" },
                { icon: Video, label: "Incentivized Adherence" },
                { icon: Gift, label: "Rewards" },
                { icon: Users, label: "Round Table" },
                { icon: Pill, label: "Prescriptions" },
                { icon: Hospital, label: "Hospital Admissions" },
                { icon: ClipboardList, label: "Auto-Tasks" },
                { icon: Calendar, label: "Unified Calendar" },
              ].map((p) => (
                <span
                  key={p.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 backdrop-blur-sm px-3 py-1.5 text-xs text-foreground/80 hover:border-primary/40 transition-colors"
                >
                  <p.icon className="h-3.5 w-3.5 text-primary" />
                  {p.label}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Button
                size="lg"
                onClick={() => setShowRoleDialog(true)}
                className="btn-pill text-base px-7 py-6 shadow-lg hover:shadow-xl transition-shadow w-full sm:w-auto"
              >
                Join the Ecosystem
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth?mode=login&role=doctor")}
                  className="btn-pill flex-1 sm:flex-initial"
                >
                  <Stethoscope className="mr-2 h-5 w-5" />
                  Doctors
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth?mode=login&role=patient")}
                  className="btn-pill flex-1 sm:flex-initial"
                >
                  <UserCircle className="mr-2 h-5 w-5" />
                  Patients
                </Button>
              </div>
            </div>

            {/* Trust strip */}
            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" /> Patient-granted access
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" /> Real-time collaboration
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-[#E01837]" /> Built around the patient
              </span>
            </div>
          </motion.div>

          {/* RIGHT — feature cards mosaic */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
              {/* Live consultation */}
              <div className="col-span-2 card-modern p-5 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground text-sm">Live consultation</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" /> REC
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Voice transcribed in real time. AI extracts diagnoses, prescriptions and follow-up tasks
                      automatically.
                    </p>
                    <div className="mt-3 flex items-end gap-1.5 h-10">
                      {[18, 32, 24, 40, 28, 36, 22, 30, 26, 34, 20, 38].map((h, i) => (
                        <span key={i} className="w-1 rounded-full bg-primary/60" style={{ height: `${h}px` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Adherence + Vulas */}
              <div className="card-modern p-4 border border-border bg-card">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E01837]/10 mb-2">
                  <Video className="h-5 w-5 text-[#E01837]" />
                </div>
                <p className="text-sm font-semibold text-foreground">Video adherence</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Verified ingestion. Confidence scored. Provisional doses auto-approved monthly.
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-semibold text-primary">+5 Vulas earned</span>
                </div>
              </div>

              {/* Round Table */}
              <div className="card-modern p-4 border border-border bg-card">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Round Table</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Specialists coordinate per patient with shared notes and read-receipts.
                </p>
                <div className="mt-3 flex -space-x-1.5">
                  {["bg-primary", "bg-[#E01837]", "bg-amber-500", "bg-teal-500"].map((c, i) => (
                    <span key={i} className={`h-5 w-5 rounded-full border-2 border-background ${c}`} />
                  ))}
                </div>
              </div>

              {/* AI assistant */}
              <div className="col-span-2 card-modern p-4 border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">AI clinical assistant</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Patient history summaries · medication conflict alerts · imaging analysis · auto-generated
                      documents.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Patient Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <UserCircle className="h-4 w-4" />
              For Patients
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Your Health. <span className="text-primary">360°</span> View.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Holarc gives you a complete 360-degree view of your health profile—every consultation, prescription, and
              clinical note from every provider, unified in one place and entirely under your control.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {patientBenefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card-modern p-6 hover-lift"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Provider Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Stethoscope className="h-4 w-4" />
              For Healthcare Providers
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Practice with the Full Picture</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              When patients grant you access, you see everything—their complete history across all providers. Make
              better decisions with better information.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {providerBenefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card-modern p-6 hover-lift"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="card-modern p-12 bg-gradient-to-br from-primary/5 to-primary/10"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">Ready for Healthcare That Works Together?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of patients and providers building a better healthcare experience—one where your health
              story is complete, connected, and under your control.
            </p>
            <Button size="lg" onClick={() => setShowRoleDialog(true)} className="btn-pill text-lg px-8 py-6">
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Role Selection Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Join Holarc</DialogTitle>
            <DialogDescription className="text-center">How will you use the platform?</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <button
              onClick={() => handleRoleSelect("doctor")}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-6 hover:border-primary hover:bg-accent transition-all duration-200"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Stethoscope className="h-8 w-8 text-primary" />
              </div>
              <span className="text-lg font-semibold text-foreground">Healthcare Provider</span>
              <span className="text-sm text-muted-foreground mt-1 text-center">Manage patients & collaborate</span>
            </button>
            <button
              onClick={() => handleRoleSelect("patient")}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-6 hover:border-primary hover:bg-accent transition-all duration-200"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <UserCircle className="h-8 w-8 text-primary" />
              </div>
              <span className="text-lg font-semibold text-foreground">Patient</span>
              <span className="text-sm text-muted-foreground mt-1 text-center">Own your health journey</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <Footer />
    </div>
  );
}
