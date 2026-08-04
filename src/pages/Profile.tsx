import { useState, useEffect, useMemo, useRef } from "react";
import { Loader2, Search, Plus, MoreVertical, Trash2, Upload, Send } from "lucide-react";
import { PatientDetailsEditor } from "@/components/patients/PatientDetailsEditor";
import { Patient, usePatients } from "@/hooks/usePatients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientImportDialog } from "@/components/patients/PatientImport";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

function AutoCreatePatientFallback({ user, onCreated }: { user: any; onCreated: (record: Patient) => void }) {
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const { data: profileData } = await supabase.from("profiles").select("full_name, mobile_number").eq("id", user.id).single();
      const { data, error } = await supabase.from("patients").insert({
        user_id: user.id,
        patient_user_id: user.id,
        name: profileData?.full_name || "My Record",
        email: user.email || null,
        phone: profileData?.mobile_number || null,
      }).select().single();
      if (error) throw error;
      if (data) {
        onCreated({
          ...data,
          surgeries: [],
          pharmacies: [],
          family_history: [],
          
          next_of_kin_members: [],
          current_medications: [],
        } as unknown as Patient);
        toast({ title: "Record created", description: "Your Holarchive has been initialized." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary bg-card p-8 text-center space-y-4">
      <p className="text-muted-foreground">No clinical record found. Create your Holarchive to start managing your health information.</p>
      <Button onClick={handleCreate} disabled={creating}>
        {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : "Create My Holarchive"}
      </Button>
    </div>
  );
}

function DoctorPatientsTab() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { patients, loading, createPatient, deletePatient, fetchPatients } = usePatients();
  const [searchQuery, setSearchQuery] = useState("");

  const getSurname = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1].toUpperCase();
  };

  const filteredPatients = patients.filter((p) =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedPatients = useMemo(() => {
    const sorted = [...filteredPatients].sort((a, b) =>
      getSurname(a.name).localeCompare(getSurname(b.name))
    );
    if (user?.email) {
      const meIdx = sorted.findIndex(p => p.email?.toLowerCase() === user.email?.toLowerCase());
      if (meIdx > 0) {
        const [me] = sorted.splice(meIdx, 1);
        sorted.unshift(me);
      }
    }
    return sorted;
  }, [filteredPatients, user?.email]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <PatientImportDialog
          trigger={
            <Button variant="outline" size="sm" className="gap-1">
              <Upload className="h-4 w-4" />
              Import
            </Button>
          }
          onImportComplete={() => fetchPatients()}
        />
        <Button size="sm" className="gap-1" onClick={() => navigate("/patients")}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
        {sortedPatients.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? "No patients found" : "No patients yet"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-primary-foreground">Patient</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-primary-foreground">Contact</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-primary-foreground">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-primary-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedPatients.map((patient) => {
                  const isMe = patient.email?.toLowerCase() === user?.email?.toLowerCase();
                  return (
                    <tr key={patient.id} className={cn("group transition-colors hover:bg-muted/50", isMe && "bg-muted/30")}>
                      <td className="px-4 py-2.5">
                        <Link to={`/patients/${patient.id}`} className="flex items-center gap-2">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full font-medium text-xs text-primary-foreground",
                            isMe ? "bg-terracotta" : "bg-primary"
                          )}>
                            {isMe ? "ME" : patient.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-foreground">{patient.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">
                        {patient.email || patient.phone || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          patient.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        )}>
                          {patient.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/patients/${patient.id}`)}>
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/sessions?patient=${patient.id}&autoStart=true`)}>
                              Start Session
                            </DropdownMenuItem>
                            {!isMe && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm(`Delete ${patient.name}?`)) deletePatient(patient.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { role } = useUserRole();
  const { profile, loading } = useProfile();
  const navigate = useNavigate();
  const [patientRecord, setPatientRecord] = useState<Patient | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const lastSavedToastRef = useRef<number>(0);

  const isDoctor = role === "doctor";
  const isPatient = role === "patient";

  // Fetch patient record for Holarchive
  useEffect(() => {
    if (!user) return;
    const fetchPatientRecord = async () => {
      setPatientLoading(true);
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq("patient_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setPatientRecord({
            ...data,
            surgeries: Array.isArray(data.surgeries) ? data.surgeries as unknown as Patient["surgeries"] : [],
            pharmacies: Array.isArray(data.pharmacies) ? data.pharmacies as unknown as Patient["pharmacies"] : [],
            family_history: Array.isArray(data.family_history) ? data.family_history as unknown as Patient["family_history"] : [],
            next_of_kin_members: Array.isArray(data.next_of_kin_members) ? data.next_of_kin_members as unknown as Patient["next_of_kin_members"] : [],
            current_medications: Array.isArray(data.current_medications) ? data.current_medications as unknown as Patient["current_medications"] : [],
          } as unknown as Patient);
        }
      } catch (err) {
        console.error("Error fetching patient record:", err);
      } finally {
        setPatientLoading(false);
      }
    };
    fetchPatientRecord();
  }, [user]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Holarchive</h1>
        <p className="text-muted-foreground text-xs">Manage your health information</p>
      </div>

      {patientLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : patientRecord ? (
        <PatientDetailsEditor
          patient={patientRecord}
          onSave={async (updates: Partial<Patient>) => {
            const { error } = await supabase
              .from("patients")
              .update(updates as any)
              .eq("id", patientRecord.id);
            if (error) {
              toast({ title: "Error saving", description: error.message, variant: "destructive" });
              throw error;
            }
            setPatientRecord((prev) => prev ? { ...prev, ...updates } : prev);

            // Autosave fires frequently while typing — only surface a toast
            // every 20s so it doesn't interrupt the user mid-keystroke.
            const now = Date.now();
            if (now - lastSavedToastRef.current > 20000) {
              lastSavedToastRef.current = now;
              toast({ title: "Saved", description: "Your details have been updated." });
            }
          }}
          isSelfService
        />
      ) : (
        <AutoCreatePatientFallback
          user={user}
          onCreated={(record) => setPatientRecord(record)}
        />
      )}
    </div>
  );
}
