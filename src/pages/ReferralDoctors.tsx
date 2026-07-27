import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Loader2, Search, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const SPECIALTIES = [
  "General Practitioner",
  "Allergist/Immunologist",
  "Anesthesiologist",
  "Cardiologist",
  "Chiropractor",
  "Dermatologist",
  "Dietitian",
  "Emergency Medicine Physician",
  "Endocrinologist",
  "Family Medicine Physician",
  "Gastroenterologist",
  "Geriatrician",
  "Hematologist",
  "Infectious Disease Specialist",
  "Internist",
  "Nephrologist",
  "Neurologist",
  "Obstetrician/Gynecologist",
  "Occupational Therapist",
  "Oncologist",
  "Ophthalmologist",
  "Optometrist",
  "Orthopedic Surgeon",
  "Otolaryngologist (ENT)",
  "Pathologist",
  "Pediatrician",
  "Physiatrist",
  "Physiotherapist",
  "Plastic Surgeon",
  "Podiatrist",
  "Psychiatrist",
  "Psychologist",
  "Pulmonologist",
  "Radiologist",
  "Rheumatologist",
  "Sports Medicine Physician",
  "Surgeon (General)",
  "Urologist",
  "Vascular Surgeon",
];

/** Common wordings that should resolve to a canonical specialty above. */
const SPECIALTY_ALIASES: Record<string, string> = {
  physiotherapy: "Physiotherapist",
  physio: "Physiotherapist",
  physicaltherapist: "Physiotherapist",
  physicaltherapy: "Physiotherapist",
  occupationaltherapy: "Occupational Therapist",
  dietetics: "Dietitian",
  dietician: "Dietitian",
  gp: "General Practitioner",
  optometry: "Optometrist",
  chiropractic: "Chiropractor",
};

const normalizeSpecialty = (value?: string | null): string => {
  const raw = (value || "").trim().toLowerCase();
  if (!raw) return "";
  const key = raw.replace(/[^a-z]/g, "");
  return (SPECIALTY_ALIASES[key] || raw).toLowerCase();
};

interface ReferralDoctor {
  id: string;
  first_name: string;
  last_name: string;
  practice_number: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  referral_count: number;
  specialty: string | null;
}

interface DoctorProfileSuggestion {
  id: string;
  full_name: string | null;
  specialty: string | null;
  practice_number: string | null;
  mobile_number: string | null;
}

type AddMode = "search" | "manual" | "invite";

interface ReferralDoctorsProps {
  hideHeader?: boolean;
}

export default function ReferralDoctors({ hideHeader = false }: ReferralDoctorsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [doctors, setDoctors] = useState<ReferralDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("any");
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [form, setForm] = useState({
    first_name: "", last_name: "", practice_number: "", address: "", email: "", phone: "", specialty: "",
  });

  // Search-first state
  const [addMode, setAddMode] = useState<AddMode>("search");
  const [profileSearch, setProfileSearch] = useState("");
  const [profileSuggestions, setProfileSuggestions] = useState<DoctorProfileSuggestion[]>([]);
  const [searchingProfiles, setSearchingProfiles] = useState(false);
  const [showProfileSuggestions, setShowProfileSuggestions] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (user) fetchDoctors();
  }, [user]);

  // Debounced profile search
  useEffect(() => {
    if (profileSearch.length < 2) {
      setProfileSuggestions([]);
      setShowProfileSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingProfiles(true);
      try {
        // RLS blocks doctors from reading other doctors' profile rows, so go
        // through the security-definer directory search instead.
        const { data, error } = await supabase.rpc("search_doctor_profiles", {
          _name: profileSearch,
        });
        if (error) throw error;
        const doctors = ((data as any[]) || [])
          .filter((p) => p.id !== user?.id)
          .slice(0, 5)
          .map((p) => ({
            id: p.id,
            full_name: p.full_name,
            specialty: p.specialty,
            practice_number: p.practice_number,
            mobile_number: p.mobile_number,
          }));
        setProfileSuggestions(doctors);
        setShowProfileSuggestions(true);
      } catch (e) {
        console.error("Profile search error:", e);
      } finally {
        setSearchingProfiles(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [profileSearch]);

  const handleSelectProfile = (doc: DoctorProfileSuggestion) => {
    const fullName = doc.full_name || "";
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts.slice(0, -1).join(" ") || fullName;
    const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
    setForm({
      first_name: firstName,
      last_name: lastName,
      practice_number: doc.practice_number || "",
      address: "",
      email: "",
      phone: doc.mobile_number || "",
      specialty: doc.specialty && SPECIALTIES.includes(doc.specialty) ? doc.specialty : (doc.specialty ? "__other__" : ""),
    });
    if (doc.specialty && !SPECIALTIES.includes(doc.specialty)) {
      setCustomSpecialty(doc.specialty);
    }
    setShowProfileSuggestions(false);
    setAddMode("manual"); // Show the form pre-filled
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Email required", description: "Please enter the doctor's email address.", variant: "destructive" });
      return;
    }
    setSendingInvite(true);
    try {
      const { error } = await supabase.functions.invoke("send-user-invitation", {
        body: {
          recipientEmail: inviteEmail.trim(),
          senderName: profile?.full_name || "A colleague",
          message: `${profile?.full_name || "A colleague"} has invited you to join Holarc Health for referrals. Sign up to connect and collaborate on patient care.`,
        },
      });
      if (error) throw error;
      toast({ title: "Invitation sent", description: `An invitation has been sent to ${inviteEmail}.` });
      setInviteEmail("");
      setAddMode("search");
    } catch (error: any) {
      console.error("Failed to send invitation:", error);
      toast({ title: "Failed to send invitation", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setSendingInvite(false);
    }
  };

  const fetchDoctors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("referral_doctors")
      .select("*")
      .order("last_name", { ascending: true });
    if (!error && data) setDoctors(data as any);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !form.first_name.trim() || !form.last_name.trim()) {
      toast({ title: "Required", description: "First and last name are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const specialty = form.specialty === "__other__" ? customSpecialty : (form.specialty || null);
    const record = {
      first_name: form.first_name, last_name: form.last_name,
      practice_number: form.practice_number || null, address: form.address || null,
      email: form.email || null, phone: form.phone || null, specialty,
    };
    if (editingId) {
      const { error } = await supabase.from("referral_doctors").update(record).eq("id", editingId);
      if (error) toast({ title: "Error", description: "Failed to update", variant: "destructive" });
      else toast({ title: "Updated", description: "Referral doctor updated" });
    } else {
      const { error } = await supabase.from("referral_doctors").insert({ ...record, user_id: user.id });
      if (error) toast({ title: "Error", description: "Failed to add", variant: "destructive" });
      else toast({ title: "Added", description: "Referral doctor added" });
    }
    setSaving(false);
    resetForm();
    fetchDoctors();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ first_name: "", last_name: "", practice_number: "", address: "", email: "", phone: "", specialty: "" });
    setCustomSpecialty("");
    setAddMode("search");
    setProfileSearch("");
    setProfileSuggestions([]);
    setInviteEmail("");
  };

  const handleEdit = (doc: ReferralDoctor) => {
    setEditingId(doc.id);
    const isCustom = doc.specialty && !SPECIALTIES.includes(doc.specialty);
    setForm({
      first_name: doc.first_name, last_name: doc.last_name,
      practice_number: doc.practice_number || "", address: doc.address || "",
      email: doc.email || "", phone: doc.phone || "",
      specialty: isCustom ? "__other__" : (doc.specialty || ""),
    });
    if (isCustom) setCustomSpecialty(doc.specialty || "");
    setAddMode("manual");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("referral_doctors").delete().eq("id", id);
    if (!error) {
      setDoctors(doctors.filter(d => d.id !== id));
      toast({ title: "Removed", description: "Referral doctor removed" });
    }
  };

  const filtered = doctors.filter(d =>
    `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (specialtyFilter === "any" || d.specialty === specialtyFilter)
  );

  const noSearchResults = profileSearch.length >= 3 && !searchingProfiles && profileSuggestions.length === 0;

  return (
    <div className={hideHeader ? "space-y-4 animate-fade-in" : "space-y-6 animate-fade-in"}>
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Referrals</h1>
            <p className="mt-1 text-muted-foreground text-xs">Manage doctors you refer patients to</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Doctor
          </Button>
        </div>
      )}
      {hideHeader && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">Manage doctors you refer patients to</p>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Doctor
          </Button>
        </div>
      )}

      {showForm && !editingId && (
        <div className="rounded-xl border border-primary bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-foreground">Add Referral Doctor</h3>

          {/* Search Step */}
          {addMode === "search" && (
            <div className="space-y-4">
              <div className="relative">
                <Label>Search for a doctor on Holarc</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Type doctor name..."
                    value={profileSearch}
                    onChange={(e) => setProfileSearch(e.target.value)}
                    onFocus={() => profileSuggestions.length > 0 && setShowProfileSuggestions(true)}
                    className="pl-10"
                  />
                  {searchingProfiles && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                </div>
                {showProfileSuggestions && profileSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {profileSuggestions.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                        onClick={() => handleSelectProfile(doc)}
                      >
                        <p className="font-medium text-foreground text-sm">{doc.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.specialty && `${doc.specialty} · `}
                          {doc.practice_number && `PR: ${doc.practice_number}`}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Not found → invite or manual */}
              {noSearchResults && (
                <div className="rounded-lg border border-dashed border-border p-4 space-y-3 bg-muted/30">
                  <p className="text-sm text-muted-foreground">Doctor not found on Holarc</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAddMode("invite")} className="gap-2">
                      <Mail className="h-4 w-4" /> Invite
                    </Button>
                  </div>
                </div>
              )}

              {/* Always show manual fallback link */}
              {!noSearchResults && (
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => setAddMode("manual")}
                >
                  Or add manually without searching
                </button>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Invite Step */}
          {addMode === "invite" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Send an email invitation to join Holarc Health</p>
              <div className="space-y-2">
                <Label>Doctor's Email</Label>
                <Input
                  type="email"
                  placeholder="doctor@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSendInvite} disabled={sendingInvite} className="gap-2">
                  {sendingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Invite
                </Button>
                <Button variant="outline" onClick={() => setAddMode("search")}>Back</Button>
                <Button variant="ghost" size="sm" onClick={() => setAddMode("manual")}>Add manually instead</Button>
              </div>
            </div>
          )}

          {/* Manual Form */}
          {addMode === "manual" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2"><Label>First Name *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Last Name *</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Specialty</Label>
                  <Select value={form.specialty} onValueChange={(v) => { setForm({ ...form, specialty: v }); if (v !== "__other__") setCustomSpecialty(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      <SelectItem value="__other__">Other...</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.specialty === "__other__" && (
                    <Input value={customSpecialty} onChange={(e) => setCustomSpecialty(e.target.value)} placeholder="Enter specialty" className="mt-2" />
                  )}
                </div>
                <div className="space-y-2"><Label>Practice Number</Label><Input value={form.practice_number} onChange={(e) => setForm({ ...form, practice_number: e.target.value })} /></div>
                <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save</Button>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Edit form (always manual) */}
      {showForm && editingId && (
        <div className="rounded-xl border border-primary bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-foreground">Edit Referral Doctor</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2"><Label>First Name *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Last Name *</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Specialty</Label>
              <Select value={form.specialty} onValueChange={(v) => { setForm({ ...form, specialty: v }); if (v !== "__other__") setCustomSpecialty(""); }}>
                <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  <SelectItem value="__other__">Other...</SelectItem>
                </SelectContent>
              </Select>
              {form.specialty === "__other__" && (
                <Input value={customSpecialty} onChange={(e) => setCustomSpecialty(e.target.value)} placeholder="Enter specialty" className="mt-2" />
              )}
            </div>
            <div className="space-y-2"><Label>Practice Number</Label><Input value={form.practice_number} onChange={(e) => setForm({ ...form, practice_number: e.target.value })} /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Update</Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-4">
        {/* Sidebar filters */}
        <div className="rounded-xl border border-primary bg-card shadow-sm p-4 space-y-4 h-fit">
          <h3 className="text-xs font-medium text-primary-dark">Filters</h3>
          <div className="space-y-1.5">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search doctors..." className="pl-8 h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Specialty</Label>
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Specialties" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="any">All Specialties</SelectItem>
                {SPECIALTIES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Referral doctor list */}
        <div className="space-y-2">
          {loading ? (
            <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground rounded-xl border border-primary bg-card">No referral doctors found</div>
          ) : (
            filtered.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {`${doc.first_name?.[0] || ""}${doc.last_name?.[0] || ""}`.toUpperCase() || "DR"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-foreground truncate">{doc.first_name} {doc.last_name}</span>
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                      {doc.specialty && <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">{doc.specialty}</span>}
                      {doc.practice_number && <span>PR#: {doc.practice_number}</span>}
                      {doc.email && <span>· {doc.email}</span>}
                      {doc.phone && <span>· {doc.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{doc.referral_count} referral{doc.referral_count === 1 ? "" : "s"}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(doc)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(doc.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
