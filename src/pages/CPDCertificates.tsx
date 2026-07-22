import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Pencil, Loader2, Award, Upload, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/utils/storageUrls";
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
  const [uploading, setUploading] = useState(false);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const uploadCertificateFile = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("cpd-certificates").upload(filePath, file);
    if (error) {
      toast({ title: "Upload Error", description: error.message, variant: "destructive" });
      return null;
    }
    // Bucket is private — store the path; signed URLs are generated on demand.
    return filePath;
  };

  const openCertificate = async (pathOrUrl: string) => {
    const url = await getSignedUrl("cpd-certificates", pathOrUrl);
    if (!url) {
      toast({ title: "Unable to open file", variant: "destructive" });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSave = async () => {
    if (!user || !form.certificate_name.trim() || !form.date_earned) {
      toast({ title: "Required", description: "Certificate name and date are required", variant: "destructive" });
      return;
    }
    setSaving(true);

    let certificateUrl: string | null = null;
    if (certificateFile) {
      setUploading(true);
      certificateUrl = await uploadCertificateFile(certificateFile);
      setUploading(false);
    }

    const record: any = {
      certificate_name: form.certificate_name,
      issuing_body: form.issuing_body || null,
      date_earned: form.date_earned,
      cpd_points: parseInt(form.cpd_points) || 0,
    };
    if (certificateUrl) record.certificate_url = certificateUrl;

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
    setCertificateFile(null);
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
    setCertificateFile(null);
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
          <h1 className="text-2xl font-bold text-foreground">Certificates</h1>
          <p className="mt-1 text-muted-foreground text-xs">Track your continuing professional development</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-base px-4 py-2 gap-2">
            <Award className="h-4 w-4 text-primary" />
            {totalPoints} CPD Points
          </Badge>
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ certificate_name: "", issuing_body: "", date_earned: "", cpd_points: "" }); setCertificateFile(null); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Certificate
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-primary bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-foreground">{editingId ? "Edit" : "Add"} Certificate</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Certificate Name *</Label><Input value={form.certificate_name} onChange={(e) => setForm({ ...form, certificate_name: e.target.value })} placeholder="e.g., Advanced Cardiac Life Support" /></div>
            <div className="space-y-2"><Label>Issuing Body</Label><Input value={form.issuing_body} onChange={(e) => setForm({ ...form, issuing_body: e.target.value })} placeholder="e.g., HPCSA" /></div>
            <div className="space-y-2"><Label>Date Earned *</Label><Input type="date" value={form.date_earned} onChange={(e) => setForm({ ...form, date_earned: e.target.value })} /></div>
            <div className="space-y-2"><Label>CPD Points</Label><Input type="number" min="0" value={form.cpd_points} onChange={(e) => setForm({ ...form, cpd_points: e.target.value })} placeholder="0" /></div>
          </div>
          <div className="space-y-2">
            <Label>Attach Certificate (PDF/Image)</Label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
              />
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {certificateFile ? certificateFile.name : "Choose File"}
              </Button>
              {certificateFile && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setCertificateFile(null)}>Remove</Button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || uploading}>
              {(saving || uploading) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {uploading ? "Uploading..." : editingId ? "Update" : "Save"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setCertificateFile(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-primary bg-card shadow-sm overflow-hidden">
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
                <TableHead>File</TableHead>
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
                    {cert.certificate_url ? (
                      <button
                        type="button"
                        onClick={() => openCertificate(cert.certificate_url!)}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
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