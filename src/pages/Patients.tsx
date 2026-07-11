import React, { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Filter, MoreVertical, Mail, Phone, Loader2, Edit3, Trash2, Clock, X, CalendarIcon, Upload, Pill, Send, Share2, ChevronDown, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PatientImportDialog } from "@/components/patients/PatientImport";
import { usePatients } from "@/hooks/usePatients";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { SampleBadge } from "@/components/patients/SampleBadge";
import { isSamplePatient } from "@/lib/samplePatients";


export default function Patients({ hideHeader = false }: { hideHeader?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { patients, loading, createPatient, deletePatient, fetchPatients } = usePatients();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    status: "active",
    physical_address: "",
    postal_address: "",
    same_as_physical: false,
    referred_by: "",
    employer: "",
    occupation: "",
    medical_insurance: "",
    medical_insurance_product: "",
    medical_insurance_number: "",
    primary_member: "",
    next_of_kin_name: "",
    next_of_kin_phone: "",
    next_of_kin_email: "",
    general_practitioner: "",
    claims_email: "",
  });
  const [creating, setCreating] = useState(false);
  const [invitingPatient, setInvitingPatient] = useState(false);
  const meAutoCreated = useRef(false);

  // Autofind patient state
  const [patientSuggestions, setPatientSuggestions] = useState<Array<{ id: string; full_name: string | null; mobile_number: string | null }>>([]);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatientUserId, setSelectedPatientUserId] = useState<string | null>(null);

  // Debounced patient name search
  useEffect(() => {
    if (newPatient.name.length < 2) {
      setPatientSuggestions([]);
      setShowPatientSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const { data: patientRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "patient");
        const patientIds = (patientRoles || []).map(r => r.user_id);
        if (patientIds.length === 0) {
          setPatientSuggestions([]);
          setShowPatientSuggestions(false);
          setSearchingPatients(false);
          return;
        }
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, mobile_number")
          .ilike("full_name", `%${newPatient.name}%`)
          .in("id", patientIds)
          .limit(10);
        // Filter out the current user (doctor can't add themselves)
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const filtered = (profiles || []).filter(p => p.id !== currentUser?.id);
        setPatientSuggestions(filtered);
        setShowPatientSuggestions(true);
      } catch (e) {
        console.error("Patient search error:", e);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [newPatient.name]);

  const handleSelectPatientSuggestion = (suggestion: { id: string; full_name: string | null; mobile_number: string | null }) => {
    const name = suggestion.full_name || "";
    // Format as "Surname, FirstNames"
    const parts = name.trim().split(/\s+/);
    let formatted = name;
    if (parts.length > 1) {
      const surname = parts[parts.length - 1];
      const firstNames = parts.slice(0, -1).join(" ");
      formatted = `${surname}, ${firstNames}`;
    }
    setNewPatient(prev => ({
      ...prev,
      name: formatted,
      phone: suggestion.mobile_number || prev.phone,
    }));
    setSelectedPatientUserId(suggestion.id);
    setShowPatientSuggestions(false);
  };

  const handleSendPatientInvite = async () => {
    if (!newPatient.email) return;
    setInvitingPatient(true);
    try {
      const { error } = await supabase.functions.invoke("send-patient-invitation", {
        body: {
          patientEmail: newPatient.email,
          patientName: newPatient.name,
          patientId: null,
          doctorName: profile?.full_name || "Your Doctor",
          practiceName: profile?.practice_address || "Medical Practice",
        },
      });
      if (error) throw error;
      toast({ title: "Invitation sent", description: `An invitation has been sent to ${newPatient.email}.` });
    } catch (error: any) {
      toast({ title: "Failed to send invitation", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setInvitingPatient(false);
    }
  };

  // Auto-create "ME" patient record for doctors who don't have one
  useEffect(() => {
    if (loading || !user?.email || meAutoCreated.current) return;
    const hasMe = patients.some(p => p.email?.toLowerCase() === user.email?.toLowerCase());
    if (!hasMe) {
      meAutoCreated.current = true;
      // Format as "Surname, FirstNames" from profile name
      const profileName = profile?.full_name || user.user_metadata?.full_name || '';
      let formattedName = profileName || user.email?.split('@')[0] || 'Me';
      if (profileName) {
        const parts = profileName.trim().split(/\s+/);
        if (parts.length > 1) {
          const surname = parts[parts.length - 1];
          const firstNames = parts.slice(0, -1).join(' ');
          formattedName = `${surname}, ${firstNames}`;
        }
      }
      createPatient({
        name: formattedName,
        email: user.email || null,
        phone: null,
        dob: null,
        address: null,
        notes: null,
        status: 'active',
        physical_address: null,
        postal_address: null,
        same_as_physical: false,
        referred_by: null,
        employer: null,
        occupation: null,
        medical_aid: null,
        medical_aid_number: null,
        primary_member: null,
        next_of_kin_name: null,
        next_of_kin_phone: null,
        next_of_kin_email: null,
        next_of_kin_relationship: null,
        general_practitioner: null,
        allergies: null,
        claims_email: null,
        medical_insurance_product: null,
        marital_status: null,
        height_cm: null,
        weight_kg: null,
        surgeries: null,
        id_passport_number: null,
        gender: null,
        pharmacy_name: null,
        pharmacy_email: null,
        pharmacies: null,
        is_chronic: false,
        reporting_to_email: null,
        blood_type: null,
        family_history: null,
        organ_donor: false,
        organ_donor_organs: null,
        first_name: null,
        last_name: null,
        
        next_of_kin_members: null,
        current_medications: null,
        patient_user_id: user.id,
      });
    }
  }, [loading, user, patients, profile]);

  const filteredPatients = patients.filter((patient) => {
    // Name filter
    if (searchQuery && !patient.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Status filter
    if (statusFilter !== "all" && patient.status !== statusFilter) {
      return false;
    }
    // Date range filter (using created_at)
    const patientDate = new Date(patient.created_at);
    if (dateFrom && patientDate < dateFrom) {
      return false;
    }
    if (dateTo && patientDate > dateTo) {
      return false;
    }
    return true;
  });

  // Sort alphabetically by surname (last word in name)
  const getSurname = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1].toUpperCase();
  };

  const sortedPatients = useMemo(() => {
    const sorted = [...filteredPatients].sort((a, b) => 
      getSurname(a.name).localeCompare(getSurname(b.name))
    );
    // Move "ME" (doctor's own patient record) to top
    if (user?.id) {
      const meIndex = sorted.findIndex(p => p.email?.toLowerCase() === user.email?.toLowerCase());
      if (meIndex > 0) {
        const [me] = sorted.splice(meIndex, 1);
        sorted.unshift(me);
      }
    }
    return sorted;
  }, [filteredPatients, user?.id]);

  // Extract ME patient before grouping
  const mePatient = sortedPatients.find(p => p.email?.toLowerCase() === user?.email?.toLowerCase()) || null;
  const patientsForGrouping = mePatient ? sortedPatients.filter(p => p.id !== mePatient.id) : sortedPatients;

  // Group by first letter of surname
  const groupedPatients: Record<string, typeof filteredPatients> = {};
  patientsForGrouping.forEach((patient) => {
    const letter = getSurname(patient.name)[0] || '#';
    if (!groupedPatients[letter]) groupedPatients[letter] = [];
    groupedPatients[letter].push(patient);
  });

  const availableLetters = Object.keys(groupedPatients).sort();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [expandedLetters, setExpandedLetters] = useState<Set<string>>(new Set());

  const toggleLetterGroup = (letter: string) => {
    setExpandedLetters(prev => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setFilterOpen(false);
  };

  const hasActiveFilters = statusFilter !== "all" || dateFrom || dateTo;

  const handleCreatePatient = async () => {
    if (!newPatient.name.trim()) {
      toast({
        title: "Error",
        description: "Patient name is required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const result = await createPatient({
      name: newPatient.name,
      email: newPatient.email || null,
      phone: newPatient.phone || null,
      dob: null,
      address: null,
      notes: newPatient.notes || null,
      status: newPatient.status,
      physical_address: newPatient.physical_address || null,
      postal_address: newPatient.same_as_physical ? newPatient.physical_address : (newPatient.postal_address || null),
      same_as_physical: newPatient.same_as_physical,
      referred_by: newPatient.referred_by || null,
      employer: newPatient.employer || null,
      occupation: newPatient.occupation || null,
      medical_aid: newPatient.medical_insurance || null,
      medical_aid_number: newPatient.medical_insurance_number || null,
      medical_insurance_product: newPatient.medical_insurance_product || null,
      primary_member: newPatient.primary_member || null,
      next_of_kin_name: newPatient.next_of_kin_name || null,
      next_of_kin_phone: newPatient.next_of_kin_phone || null,
      next_of_kin_email: newPatient.next_of_kin_email || null,
      general_practitioner: newPatient.general_practitioner || null,
      claims_email: newPatient.claims_email || null,
      patient_user_id: selectedPatientUserId || null,
    } as any);

    if (result) {
      setIsDialogOpen(false);
      setNewPatient({
        name: "", email: "", phone: "", notes: "", status: "active",
        physical_address: "", postal_address: "", same_as_physical: false,
        referred_by: "", employer: "", occupation: "", medical_insurance: "",
        medical_insurance_product: "", medical_insurance_number: "", primary_member: "", next_of_kin_name: "",
        next_of_kin_phone: "", next_of_kin_email: "", general_practitioner: "",
        claims_email: "",
      });
    }
    setCreating(false);
  };

  const handleDeletePatient = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      await deletePatient(id);
    }
  };

  const handleStartSession = (patientId: string) => {
    navigate(`/sessions?patient=${patientId}`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn("animate-fade-in", hideHeader ? "space-y-4" : "space-y-6")}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {!hideHeader && (
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("nav.myPatients", "Patients")}</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              {t("patients.subtitle")}
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 ml-auto">

          <PatientImportDialog 
            trigger={
              <Button variant="outline" className="gap-1.5 h-8 md:h-9 text-xs md:text-xs">
                <Upload className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {t("patients.importPatients")}
              </Button>
            }
            onImportComplete={() => fetchPatients()}
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 h-8 md:h-9 text-xs md:text-xs">
                <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
                {t("patients.addPatient")}
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Add New Patient</DialogTitle>
              <DialogDescription>Enter patient information below</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6 pt-4">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 relative">
                      <Label>Name *</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Type patient name to search..."
                          value={newPatient.name}
                          onChange={(e) => { setNewPatient({ ...newPatient, name: e.target.value }); setSelectedPatientUserId(null); }}
                          onFocus={() => patientSuggestions.length > 0 && setShowPatientSuggestions(true)}
                          className="pl-10"
                        />
                        {searchingPatients && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                      </div>
                      {showPatientSuggestions && patientSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {patientSuggestions.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                              onClick={() => handleSelectPatientSuggestion(s)}
                            >
                              <p className="font-medium text-foreground text-sm">{s.full_name}</p>
                              {s.mobile_number && <p className="text-xs text-muted-foreground">{s.mobile_number}</p>}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Invite fallback when patient not found */}
                      {newPatient.name.length >= 3 && !searchingPatients && patientSuggestions.length === 0 && !selectedPatientUserId && (
                        <div className="mt-3 rounded-lg border border-dashed border-border p-4 space-y-3 bg-muted/30">
                          <p className="text-sm text-muted-foreground">Patient not found on Holarc? Send an invitation</p>
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="patient@email.com"
                              value={newPatient.email}
                              onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={!newPatient.email || invitingPatient}
                              onClick={handleSendPatientInvite}
                              className="gap-1"
                            >
                              {invitingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              Invite
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="patient@email.com"
                        value={newPatient.email}
                        onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        placeholder="+1 (555) 123-4567"
                        value={newPatient.phone}
                        onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Address Information</h3>
                  <div>
                    <Label>Physical Address</Label>
                    <Textarea
                      placeholder="Enter physical address"
                      value={newPatient.physical_address}
                      onChange={(e) => setNewPatient({ ...newPatient, physical_address: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sameAsPhysical"
                      checked={newPatient.same_as_physical}
                      onCheckedChange={(checked) => setNewPatient({ ...newPatient, same_as_physical: checked as boolean })}
                    />
                    <label htmlFor="sameAsPhysical" className="text-sm text-muted-foreground">
                      Postal address same as physical address
                    </label>
                  </div>
                  {!newPatient.same_as_physical && (
                    <div>
                      <Label>Postal Address</Label>
                      <Textarea
                        placeholder="Enter postal address"
                        value={newPatient.postal_address}
                        onChange={(e) => setNewPatient({ ...newPatient, postal_address: e.target.value })}
                        rows={2}
                      />
                    </div>
                  )}
                </div>

                {/* Employment Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Employment Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Employer</Label>
                      <Input
                        placeholder="Employer name"
                        value={newPatient.employer}
                        onChange={(e) => setNewPatient({ ...newPatient, employer: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Occupation</Label>
                      <Input
                        placeholder="Occupation"
                        value={newPatient.occupation}
                        onChange={(e) => setNewPatient({ ...newPatient, occupation: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Medical Insurance Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Medical Insurance Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Medical Insurance</Label>
                      <Input
                        placeholder="Insurance provider"
                        value={newPatient.medical_insurance}
                        onChange={(e) => setNewPatient({ ...newPatient, medical_insurance: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Medical Insurance Product</Label>
                      <Input
                        placeholder="e.g., Executive Plan"
                        value={newPatient.medical_insurance_product}
                        onChange={(e) => setNewPatient({ ...newPatient, medical_insurance_product: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Medical Insurance Number</Label>
                      <Input
                        placeholder="Member number"
                        value={newPatient.medical_insurance_number}
                        onChange={(e) => setNewPatient({ ...newPatient, medical_insurance_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Primary Member</Label>
                      <Input
                        placeholder="Primary member name"
                        value={newPatient.primary_member}
                        onChange={(e) => setNewPatient({ ...newPatient, primary_member: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Claims Email</Label>
                      <Input
                        type="email"
                        placeholder="claims@insurance.com"
                        value={newPatient.claims_email}
                        onChange={(e) => setNewPatient({ ...newPatient, claims_email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Medical Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>General Practitioner</Label>
                      <Input
                        placeholder="GP name"
                        value={newPatient.general_practitioner}
                        onChange={(e) => setNewPatient({ ...newPatient, general_practitioner: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Referred By</label>
                      <Input
                        placeholder="Referral source"
                        value={newPatient.referred_by}
                        onChange={(e) => setNewPatient({ ...newPatient, referred_by: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Next of Kin */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Next of Kin</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-foreground">Name and Surname</label>
                      <Input
                        placeholder="Full name"
                        value={newPatient.next_of_kin_name}
                        onChange={(e) => setNewPatient({ ...newPatient, next_of_kin_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Phone</label>
                      <Input
                        placeholder="Phone number"
                        value={newPatient.next_of_kin_phone}
                        onChange={(e) => setNewPatient({ ...newPatient, next_of_kin_phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Email</label>
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={newPatient.next_of_kin_email}
                        onChange={(e) => setNewPatient({ ...newPatient, next_of_kin_email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm font-medium text-foreground">Notes</label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={newPatient.notes}
                    onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button onClick={handleCreatePatient} className="w-full" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add New Patient
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("patients.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("gap-2", hasActiveFilters && "border-primary text-primary")}>
              <Filter className="h-4 w-4" />
              {t("patients.filter")}
              {hasActiveFilters && (
                <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs">
                  {[statusFilter !== "all", dateFrom, dateTo].filter(Boolean).length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filters</h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                    <X className="h-4 w-4 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
              
              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("patients.allStatuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Date Added (From)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Date Added (To)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                  </PopoverContent>
                </Popover>
              </div>

              <Button className="w-full" onClick={() => setFilterOpen(false)}>
                Apply Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Alphabet Jump Bar */}
      {sortedPatients.length > 0 && (
        <div className="hidden md:flex w-full gap-0.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedLetter(null)}
            className={cn(
              "flex-1 min-w-0 h-7 rounded-lg text-sm font-semibold transition-colors",
              selectedLetter === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-primary/20"
            )}
          >
            All
          </button>
          {alphabet.map((letter) => {
            const hasPatients = availableLetters.includes(letter);
            return (
              <button
                key={letter}
                onClick={() => {
                  if (hasPatients) {
                    setSelectedLetter(selectedLetter === letter ? null : letter);
                  }
                }}
                className={cn(
                  "flex-1 min-w-0 h-7 rounded-lg text-sm font-semibold transition-colors",
                  hasPatients
                    ? selectedLetter === letter
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-primary/20"
                    : "bg-muted/30 text-muted-foreground/40 cursor-default"
                )}
              >
                {letter}
              </button>
            );
          })}
        </div>
      )}

      {/* Patient List */}
      <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
        {sortedPatients.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? t("patients.noPatientsFound") : t("patients.noPatientsHint")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary">
                  <th className="px-2 lg:px-4 py-2.5 text-left text-xs font-medium text-primary-foreground">
                    {t("patients.colPatient")}
                  </th>
                  <th className="hidden lg:table-cell px-4 py-2.5 text-left text-xs font-medium text-primary-foreground">
                    {t("patients.colContact")}
                  </th>
                  <th className="px-3 lg:px-4 py-2.5 text-left text-xs font-medium text-primary-foreground">
                    {t("patients.colLastSeen")}
                  </th>
                  <th className="hidden lg:table-cell px-3 lg:px-4 py-2.5 text-left text-xs font-medium text-primary-foreground">
                    {t("patients.colSince")}
                  </th>
                  <th className="px-3 lg:px-4 py-2.5 text-right text-xs font-medium text-primary-foreground">
                    {t("patients.colActions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* ME patient row - always at top */}
                {mePatient && (
                  <>
                    <tr className="group transition-colors bg-gray-100 hover:bg-gray-200/60 dark:bg-gray-800/20 dark:hover:bg-gray-800/30">
                      <td className="px-2 lg:px-4 py-2.5">
                        <Link to={`/patients/${mePatient.id}`} className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full font-medium text-xs bg-[#E01837] text-white">
                            ME
                          </div>
                          <div className={cn("h-2 w-2 rounded-full flex-shrink-0", mePatient.status === "active" ? "bg-emerald-500" : "bg-red-400")} />
                          <span className="font-medium text-xs text-foreground group-hover:text-[#E01837] dark:group-hover:text-red-400 transition-colors whitespace-nowrap">
                            {mePatient.name.includes(',') ? mePatient.name : (() => {
                              const parts = mePatient.name.trim().split(/\s+/);
                              if (parts.length <= 1) return mePatient.name;
                              const lastName = parts[parts.length - 1];
                              const firstNames = parts.slice(0, -1).join(" ");
                              return `${lastName}, ${firstNames}`;
                            })()}
                          </span>
                        </Link>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-2.5">
                        <div className="space-y-0.5">
                          {mePatient.email && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="h-4 w-4" /> <span className="truncate">{mePatient.email}</span>
                            </div>
                          )}
                          {mePatient.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-4 w-4" /> {mePatient.phone}
                            </div>
                          )}
                          {!mePatient.email && !mePatient.phone && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 lg:px-4 py-2.5 text-xs text-muted-foreground">
                        {mePatient.last_visit ? new Date(mePatient.last_visit).toLocaleDateString() : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="hidden lg:table-cell px-3 lg:px-4 py-2.5 text-xs text-muted-foreground">
                        {new Date(mePatient.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 lg:px-4 py-2.5 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/patients/${mePatient.id}`)}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  </>
                )}
                {(selectedLetter ? availableLetters.filter(l => l === selectedLetter) : availableLetters.sort()).map((letter) => (
                  <React.Fragment key={letter}>
                    <tr
                      id={`patient-group-${letter}`}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => toggleLetterGroup(letter)}
                    >
                      <td colSpan={5} className="px-4 py-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(351,81%,49%)] text-white text-xs font-bold">
                            {letter}
                          </span>
                          <span className="text-xs text-muted-foreground">({groupedPatients[letter].length})</span>
                          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform", expandedLetters.has(letter) && "rotate-180")} />
                        </div>
                      </td>
                    </tr>
                    {expandedLetters.has(letter) && groupedPatients[letter].map((patient) => (
                      <tr
                        key={patient.id}
                        className="group transition-colors hover:bg-muted/30"
                      >
                        <td className="px-2 lg:px-4 py-2.5">
                          <Link
                            to={`/patients/${patient.id}`}
                            className="flex items-center gap-2.5"
                          >
                            <div className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full font-medium text-xs",
                              (() => {
                                const letterIdx = availableLetters.indexOf(letter);
                                const avatarColors = [
                                  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
                                  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                                  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
                                ];
                                return avatarColors[letterIdx % 3];
                              })()
                            )}>
                              {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className={cn("h-2 w-2 rounded-full flex-shrink-0", patient.status === "active" ? "bg-emerald-500" : "bg-red-400")} />
                            {patient.is_chronic && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center rounded-full bg-terracotta/10 px-1.5 py-0.5 text-xs font-bold text-terracotta">
                                      <Pill className="h-2.5 w-2.5" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Chronic Patient</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <span className="font-medium text-xs text-foreground group-hover:text-primary transition-colors whitespace-nowrap inline-flex items-center gap-1">
                              {patient.name.includes(',') ? patient.name : (() => {
                                const parts = patient.name.trim().split(/\s+/);
                                if (parts.length <= 1) return patient.name;
                                const lastName = parts[parts.length - 1];
                                const firstNames = parts.slice(0, -1).join(" ");
                                return `${lastName}, ${firstNames}`;
                              })()}
                              {isSamplePatient(patient) && <SampleBadge />}
                            </span>
                          </Link>
                        </td>
                        <td className="hidden lg:table-cell px-4 py-2.5">
                          <div className="space-y-0.5">
                            {patient.email && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span className="truncate max-w-[160px]">{patient.email}</span>
                              </div>
                            )}
                            {patient.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                {patient.phone}
                              </div>
                            )}
                            {!patient.email && !patient.phone && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 lg:px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {patient.last_visit 
                            ? new Date(patient.last_visit).toLocaleDateString() 
                            : <span className="text-muted-foreground/50">—</span>
                          }
                        </td>
                        <td className="hidden lg:table-cell px-3 lg:px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(patient.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 lg:px-4 py-2.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStartSession(patient.id)}>
                                <Clock className="mr-2 h-4 w-4" />
                                {t("patients.startSession")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/patients/${patient.id}`)}>
                                <Edit3 className="mr-2 h-4 w-4" />
                                {t("patients.viewProfile")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeletePatient(patient.id, patient.name)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("patients.deletePatient")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}