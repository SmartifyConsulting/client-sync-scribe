import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Save,
  User,
  Search,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePatients } from "@/hooks/usePatients";
import { useProfile } from "@/hooks/useProfile";
import { useDocuments } from "@/hooks/useDocuments";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  placeholders: string[];
  logoUrl?: string;
  logoPosition?: { x: number; y: number };
  fontFamily?: string;
  category?: string;
}

interface DocumentEditorProps {
  template: Template;
  preSelectedPatientId?: string;
  onClose: () => void;
  onSave: (document: { name: string; content: string }) => void;
}

interface ProcedureSuggestion {
  code: string;
  description: string;
}

function ProcedureSearchInput({
  onSelect,
}: {
  onSelect: (procedure: ProcedureSuggestion) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProcedureSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const searchProcedures = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("lookup-medical-codes", {
        body: { query: searchQuery, codeSystem: "NHRPL", country: "ZA" },
      });
      if (!error && Array.isArray(data)) {
        const sorted = [...data].sort((a, b) =>
          (a.description || "").localeCompare(b.description || "")
        );
        setSuggestions(sorted);
        setShowDropdown(sorted.length > 0);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchProcedures(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchProcedures]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-2 relative">
      <Label>Search Procedure (NHRPL)</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Type to search procedures..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
          {suggestions.map((s) => (
            <button
              key={s.code}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => {
                onSelect(s);
                setQuery(s.description);
                setShowDropdown(false);
              }}
            >
              <span className="font-medium">{s.code}</span>
              <span className="text-muted-foreground ml-2">— {s.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentEditor({ template, preSelectedPatientId, onClose, onSave }: DocumentEditorProps) {
  const { toast } = useToast();
  const { patients } = usePatients();
  const { profile } = useProfile();
  const { createDocument } = useDocuments();
  const [documentName, setDocumentName] = useState(`${template.name} - ${new Date().toLocaleDateString()}`);
  const [content, setContent] = useState(template.content);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(preSelectedPatientId || "");
  const [isSaving, setIsSaving] = useState(false);

  const isAdmissionTemplate =
    template.name?.toLowerCase().includes("admission") ||
    template.category?.toLowerCase().includes("admission");

  // Auto-fill placeholders when patient or profile changes
  useEffect(() => {
    let updatedContent = template.content;
    
    if (profile) {
      updatedContent = updatedContent
        .replace(/\[PracticeNumber\]/g, profile.practice_number || "[PracticeNumber]")
        .replace(/\[DoctorNumber\]/g, profile.doctor_number || "[DoctorNumber]")
        .replace(/\[DoctorName\]/g, profile.full_name || "[DoctorName]")
        .replace(/\[PracticeAddress\]/g, profile.practice_address || "[PracticeAddress]");
    }

    if (selectedPatientId && selectedPatientId !== "none") {
      const patient = patients.find(p => p.id === selectedPatientId);
      if (patient) {
        updatedContent = updatedContent
          .replace(/\[PatientName\]/g, patient.name || "[PatientName]")
          .replace(/\[ClientName\]/g, patient.name || "[ClientName]")
          .replace(/\[PatientAddress\]/g, patient.physical_address || patient.address || "[PatientAddress]")
          .replace(/\[PatientDOB\]/g, patient.dob ? new Date(patient.dob).toLocaleDateString() : "[PatientDOB]")
          .replace(/\[PatientContact\]/g, patient.phone || patient.email || "[PatientContact]")
          .replace(/\[MedicalAid\]/g, patient.medical_aid || "[MedicalAid]")
          .replace(/\[MedicalAidNumber\]/g, patient.medical_aid_number || "[MedicalAidNumber]");
        
        setDocumentName(`${template.name} - ${patient.name} - ${new Date().toLocaleDateString()}`);
      }
    }

    const today = new Date().toLocaleDateString();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    updatedContent = updatedContent
      .replace(/\[Date\]/g, today)
      .replace(/\[SessionDate\]/g, today)
      .replace(/\[ConsultationDate\]/g, today)
      .replace(/\[ReferralDate\]/g, today)
      .replace(/\[PrescriptionDate\]/g, today)
      .replace(/\[SignatureDate\]/g, today)
      .replace(/\[InvoiceDate\]/g, today)
      .replace(/\[ConsultationTime\]/g, now);

    setContent(updatedContent);
  }, [selectedPatientId, profile, patients, template.content]);

  const handleProcedureSelect = (procedure: ProcedureSuggestion) => {
    setContent((prev) =>
      prev
        .replace(/\[ProcedureDescription\]/g, procedure.description)
        .replace(/\[ProcedureCode\]/g, procedure.code)
    );
    toast({ title: "Procedure selected", description: `${procedure.code} — ${procedure.description}` });
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    
    const result = await createDocument({
      patient_id: selectedPatientId || undefined,
      template_id: template.id,
      name: documentName,
      content: content,
      template_name: template.name,
      patient_name: selectedPatient?.name,
    });

    setIsSaving(false);

    if (result) {
      onSave({ name: documentName, content });
    }
  };

  const unfilledPlaceholders = template.placeholders.filter(p => 
    content.includes(`[${p}]`)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-primary bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Document Editor</h2>
            <p className="text-sm text-muted-foreground">Template: {template.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Editor */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient">Select Patient (for auto-fill)</Label>
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a patient to auto-fill placeholders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No patient selected</SelectItem>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {patient.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPatientId && selectedPatientId !== "none" && (
              <p className="text-xs text-green-600">
                ✓ Patient data has been auto-filled into the document
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="docName">Document Name</Label>
            <Input
              id="docName"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
            />
          </div>

          {/* Procedure Search — only for admission templates */}
          {isAdmissionTemplate && (
            <ProcedureSearchInput onSelect={handleProcedureSelect} />
          )}

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          {/* Unfilled Placeholders */}
          {unfilledPlaceholders.length > 0 && (
            <div className="space-y-2 p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Remaining Placeholders to Fill
              </p>
              <div className="flex flex-wrap gap-2">
                {unfilledPlaceholders.map((placeholder) => (
                  <span
                    key={placeholder}
                    className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2.5 py-1 text-xs font-medium"
                  >
                    [{placeholder}]
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Edit the content above to fill in these placeholders manually
              </p>
            </div>
          )}

          {/* Auto-filled info */}
          {profile && (
            <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Auto-filled from Your Profile
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                {profile.full_name && <p>• Doctor: {profile.full_name}</p>}
                {profile.practice_number && <p>• Practice #: {profile.practice_number}</p>}
                {profile.doctor_number && <p>• Registration #: {profile.doctor_number}</p>}
                {profile.practice_address && <p>• Address: {profile.practice_address}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Document"}
          </Button>
        </div>
      </div>
    </div>
  );
}
