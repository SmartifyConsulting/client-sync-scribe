import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import holarcLogoAsset from "@/assets/holarc-health-logo.png.asset.json";
const holarcLogo = holarcLogoAsset.url;
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
  Siren,
  Ambulance,
  Building2,
  Smartphone,
  Apple,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/layout/Footer";
import { SecurityBadges } from "@/components/landing/SecurityBadges";
import { Testimonials } from "@/components/landing/Testimonials";
import { InstallAppButton } from "@/components/InstallAppButton";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";


const getPatientBenefits = (t: any) => [
  {
    icon: Eye,
    title: t("landing.patientBenefits.benefit1Title", "Complete Health Picture"),
    description: t("landing.patientBenefits.benefit1Description", "See your entire medical history, prescriptions, and care team in one unified view—no more scattered records."),
  },
  {
    icon: Users,
    title: t("landing.patientBenefits.benefit2Title", "Connect Your Care Team"),
    description: t("landing.patientBenefits.benefit2Description", "Invite specialists, GPs, and other providers to collaborate on your care with your full consent."),
  },
  {
    icon: Shield,
    title: t("landing.patientBenefits.benefit3Title", "You're in Control"),
    description: t("landing.patientBenefits.benefit3Description", "Decide exactly which doctors see your records. Grant or revoke access anytime with granular permissions."),
  },
  {
    icon: Calendar,
    title: t("landing.patientBenefits.benefit4Title", "Unified Appointments"),
    description: t("landing.patientBenefits.benefit4Description", "All your healthcare appointments from every provider in one calendar—never miss a follow-up."),
  },
];

const getProviderBenefits = (t: any) => [
  {
    icon: Brain,
    title: t("landing.providerBenefits.benefit1Title", "AI-Powered Insights"),
    description: t("landing.providerBenefits.benefit1Description", "Get comprehensive patient history summaries and medication conflict alerts before every consultation."),
  },
  {
    icon: Share2,
    title: t("landing.providerBenefits.benefit2Title", "Seamless Collaboration"),
    description: t("landing.providerBenefits.benefit2Description", "Round Table notes enable real-time communication with other specialists caring for the same patient."),
  },
  {
    icon: FileText,
    title: t("landing.providerBenefits.benefit3Title", "Automated Documentation"),
    description: t("landing.providerBenefits.benefit3Description", "Voice-to-text notes, auto-populated templates, and AI summaries save hours of administrative work."),
  },
  {
    icon: Heart,
    title: t("landing.providerBenefits.benefit4Title", "Better Patient Outcomes"),
    description: t("landing.providerBenefits.benefit4Description", "Access complete patient history across all their providers—make informed decisions with the full picture."),
  },
  {
    icon: Ambulance,
    title: t("landing.providerBenefits.benefit5Title", "Emergency Service Providers"),
    description: t("landing.providerBenefits.benefit5Description", "Emergency response crews onboard in minutes, accept SOS incidents with one tap, share live ETA, and arrive with the patient's full medical context."),
  },
  {
    icon: Hospital,
    title: t("landing.providerBenefits.benefit6Title", "Hospital Partners"),
    description: t("landing.providerBenefits.benefit6Description", "Hospitals receive inbound emergencies with prefilled patient summaries, manage admissions, and coordinate with referring doctors in real time."),
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("patient");

  // If user is already logged in, redirect to dashboard
  if (!loading && user) {
    navigate("/dashboard");
    return null;
  }

  const handleRoleSelect = (role: string) => {
    setShowRoleDialog(false);
    if (role === "patient" || role === "doctor") {
      navigate(`/auth?mode=signup&role=${role}`);
    } else {
      navigate(`/provider-signup?kind=${role}`);
    }
    setSelectedRole("");
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3" />
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <InstallAppButton variant="compact" className="hidden sm:inline-flex" />

              <Button
                size="lg"
                variant="ghost"
                onClick={() => navigate("/auth?mode=login")}
                className="btn-pill text-base text-muted-foreground hover:text-foreground"
              >
                {t("landing.nav.login")}
              </Button>
              <Button size="lg" onClick={() => setShowRoleDialog(true)} className="btn-pill text-base">
                {t("landing.nav.getStarted")}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section — full ecosystem showcase */}
      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient background blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-20 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-40 right-0 h-80 w-80 rounded-full bg-[#E01837]/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto mb-8">
          <InstallAppPrompt />
        </div>

        <div className="max-w-7xl mx-auto space-y-10">
          {/* TOP ROW — logo left, mosaic right */}
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-6 flex justify-center lg:justify-start"
            >
              <img
                src={holarcLogo}
                alt="Holarc Health"
                className="h-28 sm:h-36 lg:h-44 w-auto"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="lg:col-span-6 relative"
            >
              <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
                {/* Adherence + Vulas */}
                <div className="card-modern p-4 border border-border bg-card">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E01837]/10 mb-2">
                    <Video className="h-5 w-5 text-[#E01837]" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{t("landing.features.medicationAdherence")}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("landing.features.medicationDescription")}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <Gift className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary-dark">{t("landing.features.rewardsEarned")}</span>
                  </div>
                </div>

                {/* Round Table */}
                <div className="card-modern p-4 border border-border bg-card">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 mb-2">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{t("landing.features.roundTable")}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("landing.features.roundTableDescription")}
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
                      <p className="text-sm font-semibold text-foreground">{t("landing.features.aiAssistant")}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {t("landing.features.aiAssistantDescription")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Transcribed Sessions */}
                <div className="col-span-2 card-modern p-4 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                      <Mic className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground text-sm">{t("landing.features.transcribedSessions")}</p>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" /> REC
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {t("landing.features.transcribedDescription")}
                      </p>
                      <div className="mt-2 flex items-end gap-1.5 h-8">
                        {[18, 32, 24, 40, 28, 36, 22, 30, 26, 34, 20, 38].map((h, i) => (
                          <span key={i} className="w-1 rounded-full bg-primary/60" style={{ height: `${h}px` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* MIDDLE BAND — mono eyebrow + capability pills over waveform */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center space-y-4"
          >
            <p className="font-mono text-xs sm:text-sm text-muted-foreground tracking-wider">
              {t("landing.hero.badge")} <span className="text-primary">/ [STATUS: ACTIVE]</span>
            </p>
            <p className="font-mono text-lg sm:text-2xl font-semibold text-foreground tracking-tight">
              <span className="text-muted-foreground">[ </span>
              {t("landing.hero.titleHighlight")}
              <span className="text-muted-foreground"> ]</span>
            </p>

            <div className="relative pt-4">
              {/* Waveform motif */}
              <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 opacity-40">
                <div className="flex items-end gap-1 h-10">
                  {[10, 22, 14, 28, 18, 32, 16, 24, 12, 26, 20, 30, 14, 22].map((h, i) => (
                    <span key={`l${i}`} className="w-0.5 rounded-full bg-primary/50" style={{ height: `${h}px` }} />
                  ))}
                </div>
                <div className="flex items-end gap-1 h-10">
                  {[22, 14, 28, 18, 32, 16, 24, 12, 26, 20, 30, 14, 22, 10].map((h, i) => (
                    <span key={`r${i}`} className="w-0.5 rounded-full bg-primary/50" style={{ height: `${h}px` }} />
                  ))}
                </div>
              </div>

              <div className="relative flex flex-wrap gap-2 justify-center max-w-4xl mx-auto">
                {[
                  { icon: Mic, label: t("landing.capabilities.voiceConsultations") },
                  { icon: Brain, label: t("landing.capabilities.aiSummaries") },
                  { icon: Video, label: t("landing.capabilities.incentivizedAdherence") },
                  { icon: Gift, label: t("landing.capabilities.rewards") },
                  { icon: Users, label: t("landing.capabilities.roundTable") },
                  { icon: Pill, label: t("landing.capabilities.prescriptions") },
                  { icon: Hospital, label: t("landing.capabilities.hospitalAdmissions") },
                  { icon: ClipboardList, label: t("landing.capabilities.autoTasks") },
                  { icon: Calendar, label: t("landing.capabilities.unifiedCalendar") },
                  { icon: Siren, label: t("landing.capabilities.emergencySOS") },
                  { icon: Ambulance, label: t("landing.capabilities.emergencyResponseDispatch") },
                  { icon: Building2, label: t("landing.capabilities.hospitalNetwork") },
                ].map((p) => (
                  <span
                    key={p.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 backdrop-blur-sm px-3 py-1.5 text-xs text-foreground/80 hover:border-primary/40 transition-colors"
                  >
                    <p.icon className="h-3.5 w-3.5 text-primary" />
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* BOTTOM ROW — CTAs left, SOS card right */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="lg:col-span-7 space-y-5"
            >
              <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3">
                <Button
                  size="lg"
                  onClick={() => setShowRoleDialog(true)}
                  className="btn-pill text-base px-7 py-6 shadow-lg hover:shadow-xl transition-shadow w-full sm:w-auto"
                >
                  {t("landing.hero.cta")}
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
                    {t("landing.hero.doctorsButton")}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/auth?mode=login&role=patient")}
                    className="btn-pill flex-1 sm:flex-initial"
                  >
                    <UserCircle className="mr-2 h-5 w-5" />
                    {t("landing.hero.patientsButton")}
                  </Button>
                </div>
              </div>

              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
                {t("landing.hero.description")}
              </p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" /> {t("landing.trustStrip.patientAccess")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" /> {t("landing.trustStrip.collaboration")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-[#E01837]" /> {t("landing.trustStrip.patientCentric")}
                </span>
              </div>
            </motion.div>

            {/* Holarc Help (SOS) */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="lg:col-span-5 card-modern p-4 border border-[#E01837]/30 bg-gradient-to-br from-[#E01837]/5 to-[#E01837]/10"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E01837] text-white shrink-0">
                  <Siren className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{t("landing.features.holarcHelp")}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t("landing.features.holarcHelpDescription")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      { key: "emergencyResponders", label: t("landing.features.emergencyResponders") },
                      { key: "hospitals", label: t("landing.features.hospitals") },
                      { key: "bloodBanks", label: t("landing.features.bloodBanks") },
                    ].map((b) => (
                      <span
                        key={b.key}
                        className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2 py-0.5 text-xs text-foreground/80"
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Mobile app download */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-[#E01837]/10 p-4 sm:p-5 shadow-lg"
          >
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-base font-bold text-foreground">{t("landing.mobile.title")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("landing.mobile.description")}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button asChild size="sm" variant="outline" className="btn-pill flex-1 sm:flex-initial border-primary/40">
                  <a href="#" aria-label="Download on the App Store">
                    <Apple className="mr-1.5 h-4 w-4" />
                    {t("landing.mobile.appStore")}
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="btn-pill flex-1 sm:flex-initial border-primary/40">
                  <a href="#" aria-label="Get it on Google Play">
                    <Play className="mr-1.5 h-4 w-4" />
                    {t("landing.mobile.googlePlay")}
                  </a>
                </Button>
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
            <div className="inline-flex items-center gap-2 bg-primary text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <UserCircle className="h-4 w-4" />
              {t("landing.patientBenefits.sectionBadge")}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t("landing.patientBenefits.sectionTitle")} <span className="text-primary">360°</span> {t("landing.patientBenefits.sectionTitleHighlight")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("landing.patientBenefits.sectionDescription")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getPatientBenefits(t).map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card-modern p-6 hover-lift"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-4">
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
            <div className="inline-flex items-center gap-2 bg-primary text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Stethoscope className="h-4 w-4" />
              {t("landing.providerBenefits.sectionBadge")}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t("landing.providerBenefits.sectionTitle")}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("landing.providerBenefits.sectionDescription")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getProviderBenefits(t).map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card-modern p-6 hover-lift"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <SecurityBadges />

      {/* Social proof */}
      <Testimonials />

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
            <h2 className="text-3xl font-bold text-foreground mb-4">{t("landing.cta.title")}</h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t("landing.cta.description")}
            </p>
            <Button size="lg" onClick={() => setShowRoleDialog(true)} className="btn-pill text-lg px-8 py-6">
              {t("landing.cta.button")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Role Selection Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">{t("landing.roleDialog.title")}</DialogTitle>
            <DialogDescription className="text-center">{t("landing.roleDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="join-role">{t("landing.roleDialog.label")}</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="join-role">
                  <SelectValue placeholder={t("landing.roleDialog.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">{t("landing.roleDialog.options.patient")}</SelectItem>
                  <SelectItem value="doctor">{t("landing.roleDialog.options.doctor")}</SelectItem>
                  <SelectItem value="hospital">{t("landing.roleDialog.options.hospital")}</SelectItem>
                  <SelectItem value="emergency">{t("landing.roleDialog.options.emergency")}</SelectItem>
                  <SelectItem value="insurance">{t("landing.roleDialog.options.insurance")}</SelectItem>
                  <SelectItem value="pharmacy">{t("landing.roleDialog.options.pharmacy")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={!selectedRole}
              onClick={() => selectedRole && handleRoleSelect(selectedRole)}
            >
              {t("landing.roleDialog.continueButton")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <Footer />
    </div>
  );
}
