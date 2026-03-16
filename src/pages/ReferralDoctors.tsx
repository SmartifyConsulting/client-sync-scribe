import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
  "Dermatologist",
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
  "Oncologist",
  "Ophthalmologist",
  "Orthopedic Surgeon",
  "Otolaryngologist (ENT)",
  "Pathologist",
  "Pediatrician",
  "Physiatrist",
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

export default function ReferralDoctors() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<ReferralDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [form, setForm] = useState({
    first_name: "", last_name: "", practice_number: "", address: "", email: "", phone: "", specialty: "",
  });

  useEffect(() => {
    if (user) fetchDoctors();
  }, [user]);

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
    setShowForm(false);
    setEditingId(null);
    setForm({ first_name: "", last_name: "", practice_number: "", address: "", email: "", phone: "", specialty: "" });
    setCustomSpecialty("");
    fetchDoctors();
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
    `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Referral Doctors</h1>
          <p className="mt-1 text-muted-foreground">Manage doctors you refer patients to</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ first_name: "", last_name: "", practice_number: "", address: "", email: "", phone: "", specialty: "" }); setCustomSpecialty(""); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Doctor
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-foreground">{editingId ? "Edit" : "Add"} Referral Doctor</h3>
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
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editingId ? "Update" : "Save"}</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search doctors..." className="pl-10" />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No referral doctors found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Practice Number</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Referrals</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.first_name} {doc.last_name}</TableCell>
                  <TableCell>{doc.specialty || "-"}</TableCell>
                  <TableCell>{doc.practice_number || "-"}</TableCell>
                  <TableCell>{doc.email || "-"}</TableCell>
                  <TableCell>{doc.phone || "-"}</TableCell>
                  <TableCell className="text-center font-semibold">{doc.referral_count}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(doc)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(doc.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}