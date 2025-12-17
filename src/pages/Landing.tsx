import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Stethoscope,
  UserCircle,
  Calendar,
  FileText,
  Brain,
  Shield,
  Clock,
  Users,
  Mic,
  PillIcon,
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

const benefits = [
  {
    icon: Brain,
    title: "AI-Powered Summaries",
    description: "Automatically generate professional session summaries and extract action points using advanced AI.",
  },
  {
    icon: Mic,
    title: "Voice-First Workflow",
    description: "Dictate notes, prescriptions, and documents hands-free with real-time transcription.",
  },
  {
    icon: Calendar,
    title: "Smart Calendar Sync",
    description: "Two-way sync with Google Calendar. Auto-schedule follow-ups and manage appointments seamlessly.",
  },
  {
    icon: FileText,
    title: "Document Templates",
    description: "Create medical certificates, referral letters, and prescriptions with auto-populated patient data.",
  },
  {
    icon: PillIcon,
    title: "Prescription Management",
    description: "AI-powered medication conflict checking and complete prescription history tracking.",
  },
  {
    icon: Users,
    title: "Multi-Doctor Collaboration",
    description: "Round Table notes for team communication and shared patient care coordination.",
  },
  {
    icon: Shield,
    title: "Patient-Controlled Access",
    description: "Patients decide which doctors can access their records with granular permission controls.",
  },
  {
    icon: Clock,
    title: "Save Hours Daily",
    description: "Automate administrative tasks so you can focus on what matters most—patient care.",
  },
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <span className="text-xl font-bold text-primary-foreground">M</span>
              </div>
              <span className="text-xl font-bold text-foreground">mIRI<span className="text-primary">360</span></span>
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
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Your Practice,{" "}
              <span className="text-gradient">Reimagined</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The intelligent medical practice management platform that automates documentation, 
              streamlines workflows, and puts patient care first.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => setShowRoleDialog(true)}
                className="btn-pill text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                Start Free Trial
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
                  Doctors Login
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth?mode=login&role=patient")}
                  className="btn-pill"
                >
                  <UserCircle className="mr-2 h-5 w-5" />
                  Patients Login
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Modernize Your Practice
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed for healthcare professionals who want to spend less time on admin and more time with patients.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
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
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="card-modern p-12 bg-gradient-to-br from-primary/5 to-primary/10"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Transform Your Practice?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join healthcare providers who are saving hours every day with mIRI360.
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

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} mIRI360. All rights reserved.</p>
        </div>
      </footer>

      {/* Role Selection Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Welcome to mIRI360</DialogTitle>
            <DialogDescription className="text-center">
              Select your role to get started
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
              <span className="text-sm text-muted-foreground mt-1">Doctor, Specialist, etc.</span>
            </button>
            <button
              onClick={() => handleRoleSelect("patient")}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-6 hover:border-primary hover:bg-accent transition-all duration-200"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <UserCircle className="h-8 w-8 text-primary" />
              </div>
              <span className="text-lg font-semibold text-foreground">Patient</span>
              <span className="text-sm text-muted-foreground mt-1">Manage your health</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
