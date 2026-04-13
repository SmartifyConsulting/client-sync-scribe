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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/layout/Footer";

const patientBenefits = [
  {
    icon: Eye,
    title: "Complete Health Picture",
    description: "See your entire medical history, prescriptions, and care team in one unified view—no more scattered records.",
  },
  {
    icon: Users,
    title: "Connect Your Care Team",
    description: "Invite specialists, GPs, and other providers to collaborate on your care with your full consent.",
  },
  {
    icon: Shield,
    title: "You're in Control",
    description: "Decide exactly which doctors see your records. Grant or revoke access anytime with granular permissions.",
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
    description: "Get comprehensive patient history summaries and medication conflict alerts before every consultation.",
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
    description: "Access complete patient history across all their providers—make informed decisions with the full picture.",
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
            <div className="flex items-center gap-3">
              <img src={holarcLogo} alt="Holarc Health" className="h-[68px] w-auto" />
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate("/auth?mode=login&role=doctor")}
                className="text-muted-foreground hover:text-foreground"
              >
                Doctors Login
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/auth?mode=login&role=patient")}
                className="text-muted-foreground hover:text-foreground"
              >
                Patients Login
              </Button>
              <Button onClick={() => setShowRoleDialog(true)} className="btn-pill">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-8"
            >
              <img src={holarcLogo} alt="Holarc Health" className="h-32 sm:h-40 w-auto mx-auto" />
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              One Ecosystem.
              <span className="block text-gradient pb-4">360° Healthcare Intelligence.</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Powerful practice management for providers. A complete 360° health profile for patients. 
              One unified ecosystem where every consultation, prescription, and clinical note connects 
              seamlessly—putting the patient at the center of their care.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => setShowRoleDialog(true)}
                className="btn-pill text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                Join the Ecosystem
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <div className="flex gap-3">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth?mode=login&role=doctor")}
                  className="btn-pill"
                >
                  <Stethoscope className="mr-2 h-5 w-5" />
                  Doctors
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth?mode=login&role=patient")}
                  className="btn-pill"
                >
                  <UserCircle className="mr-2 h-5 w-5" />
                  Patients
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
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <UserCircle className="h-4 w-4" />
              For Patients
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Your Health. <span className="text-primary">360°</span> View.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Holarc gives you a complete 360-degree view of your health profile—every consultation, prescription, and clinical note from every provider, unified in one place and entirely under your control.
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
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
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
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Practice with the Full Picture
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              When patients grant you access, you see everything—their complete history across all providers. Make better decisions with better information.
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
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
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
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready for Healthcare That Works Together?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of patients and providers building a better healthcare experience—one where your health story is complete, connected, and under your control.
            </p>
            <Button
              size="lg"
              onClick={() => setShowRoleDialog(true)}
              className="btn-pill text-lg px-8 py-6"
            >
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
            <DialogDescription className="text-center">
              How will you use the platform?
            </DialogDescription>
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
