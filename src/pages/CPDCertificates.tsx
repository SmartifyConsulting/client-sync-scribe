import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Loader2, Award, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface CPDCertificate {
  id: string;
  certificate_name: string;
  issuing_body: string | null;
  date_earned: string;
  cpd_points: number;
  certificate_url: string | null;
}

export default function CPDCertificates() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [certs, setCerts] = useState<CPDCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    certificate_name: "", issuing_body: "", date_earned: "", cpd_points: "",
  });

  useEffect(() => {
    if (user) fetchCerts();
  }, [user]);

  const fetchCerts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cpd_certificates")
      .select("*")
      .order("date_earned", { ascending: false });
    if (!error && data) setCerts(data as any);
    setLoading(false);
  };

  const totalPoints = certs.reduce((sum, c) => sum + (c.cpd_points || 0), 0);

  const handleSave = async () => {
    if (!user || !form.certificate_name.trim() || !form.date_earned) {
      toast({ title: "Required", description: "Certificate name and date are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const record = {
      certificate_name: form.certificate_name,
      issuing_body: form.issuing_body || null,
      date_earned: form.date_earned,
      cpd_points: parseInt(form.cpd_points) || 0,
    };
    if (editingId) {
      const { error } = await supabase.from("cpd_certificates").update(record).eq("id", editingId);
      if (error) toast({ title: "Error", description: "Failed to update", variant: "destructive" });
      else toast({ title: "Updated", description: "Certificate updated" });
    } else {
      const { error } = await supabase.from("cpd_certificates").insert({ ...record, user_id: user.id });
      if (error) toast({ title: "Error", description: "Failed to add", variant: "destructive" });
      else toast({ title: "Added", description: "Certificate added" });
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm({ certificate_name: "", issuing_body: "", date_earned: "", cpd_points: "" });
    fetchCerts();
  };

  const handleEdit = (cert: CPDCertificate) => {
    setEditingId(cert.id);
    setForm({
      certificate_name: cert.certificate_name,
      issuing_body: cert.issuing_body || "",
      date_earned: cert.date_earned,
      cpd_points: String(cert.cpd_points),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("cpd_certificates").delete().eq("id", id);
    if (!error) {
      setCerts(certs.filter(c => c.id !== id));
      toast({ title: "Removed", description: "Certificate removed" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">CPD Certificates</h1>
          <p className="mt-1 text-muted-foreground">Track your continuing professional development</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-base px-4 py-2 gap-2">
            <Award className="h-4 w-4 text-primary" />
            {totalPoints} CPD Points
          </Badge>
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ certificate_name: "", issuing_body: "", date_earned: "", cpd_points: "" }); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Certificate
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-foreground">{editingId ? "Edit" : "Add"} Certificate</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Certificate Name *</Label><Input value={form.certificate_name} onChange={(e) => setForm({ ...form, certificate_name: e.target.value })} placeholder="e.g., Advanced Cardiac Life Support" /></div>
            <div className="space-y-2"><Label>Issuing Body</Label><Input value={form.issuing_body} onChange={(e) => setForm({ ...form, issuing_body: e.target.value })} placeholder="e.g., HPCSA" /></div>
            <div className="space-y-2"><Label>Date Earned *</Label><Input type="date" value={form.date_earned} onChange={(e) => setForm({ ...form, date_earned: e.target.value })} /></div>
            <div className="space-y-2"><Label>CPD Points</Label><Input type="number" min="0" value={form.cpd_points} onChange={(e) => setForm({ ...form, cpd_points: e.target.value })} placeholder="0" /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editingId ? "Update" : "Save"}</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
        ) : certs.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No certificates recorded yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificate</TableHead>
                <TableHead>Issuing Body</TableHead>
                <TableHead>Date Earned</TableHead>
                <TableHead className="text-center">Points</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certs.map((cert) => (
                <TableRow key={cert.id}>
                  <TableCell className="font-medium">{cert.certificate_name}</TableCell>
                  <TableCell>{cert.issuing_body || "-"}</TableCell>
                  <TableCell>{format(new Date(cert.date_earned), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{cert.cpd_points}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cert)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cert.id)}><Trash2 className="h-4 w-4" /></Button>
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
