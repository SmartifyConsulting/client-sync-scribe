import { useState, useEffect, useCallback, useRef } from "react";
import { X, FileText, Loader2, Save, Eye, Plus, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useTemplateWithHeaderFooter } from "@/hooks/useTemplateWithHeaderFooter";
import { DocumentPreview } from "./DocumentPreview";

interface HospitalAdmissionEditorProps {
  patientId: string;
  patientName: string;
  sessionId?: string;
  onClose: () => void;
  onSave: (doc: { content: string }) => void;
}

interface CodeEntry {
  code: string;
  description: string;
}

interface CodeSystem {
  name: string;
  key: string;
  entries: CodeEntry[];
}

interface InstructionEntry {
  instruction: string;
  description: string;
}

interface CodeSuggestion {
  code: string;
  description: string;
}

const FALLBACK_TEMPLATE = `HOSPITAL ADMISSION FORM

[PRACTICE_ADDRESS]
Practice No: [PRACTICE_NUMBER]
Registration No: [DOCTOR_NUMBER]

─────────────────────────────────────

ADMISSION DETAILS

Admitting Doctor: [DOCTOR_NAME]
Practice Number: [PRACTICE_NUMBER]
Hospital: [HOSPITAL]
Date of Admission: [ADMISSION_DATE]

─────────────────────────────────────

DIAGNOSIS DETAILS — ICD-10 CODES

[ICD10_CODES]

─────────────────────────────────────

PROCEDURE DETAILS

Date of Procedure: [PROCEDURE_DATE]
Procedure Description: [PROCEDURE_DESCRIPTION]

[PROCEDURE_CODES]

─────────────────────────────────────

[ADDITIONAL_CODE_SYSTEMS]

PATIENT SPECIAL INSTRUCTIONS

[SPECIAL_INSTRUCTIONS]

─────────────────────────────────────

Patient: [PATIENT_NAME]

Signature: ___________________
           [DOCTOR_NAME]
`;

function useCodeSearch(country: string) {
  const [suggestions, setSuggestions] = useState<Record<string, CodeSuggestion[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const timerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const search = useCallback((query: string, codeSystem: string, fieldKey: string) => {
    if (timerRef.current[fieldKey]) clearTimeout(timerRef.current[fieldKey]);
    
    if (!query || query.trim().length < 2) {
      setSuggestions(prev => ({ ...prev, [fieldKey]: [] }));
      return;
    }

    setLoading(prev => ({ ...prev, [fieldKey]: true }));
    timerRef.current[fieldKey] = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('lookup-medical-codes', {
          body: { query, codeSystem, country },
        });
        if (error) throw error;
        const results = Array.isArray(data) ? data : [];
        setSuggestions(prev => ({ ...prev, [fieldKey]: results }));
      } catch (e) {
        console.error("Code search error:", e);
        setSuggestions(prev => ({ ...prev, [fieldKey]: [] }));
      } finally {
        setLoading(prev => ({ ...prev, [fieldKey]: false }));
      }
    }, 400);
  }, [country]);

  const clearSuggestions = useCallback((fieldKey: string) => {
    setSuggestions(prev => ({ ...prev, [fieldKey]: [] }));
  }, []);

  return { suggestions, loading, search, clearSuggestions };
}

function CodeEntryRow({
  entry,
  index,
  systemKey,
  systemName,
  canRemove,
  onUpdate,
  onRemove,
  suggestions,
  isLoading,
  onSearch,
  onClearSuggestions,
}: {
  entry: CodeEntry;
  index: number;
  systemKey: string;
  systemName: string;
  canRemove: boolean;
  onUpdate: (field: keyof CodeEntry, value: string) => void;
  onRemove: () => void;
  suggestions: CodeSuggestion[];
  isLoading: boolean;
  onSearch: (query: string) => void;
  onClearSuggestions: () => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex items-start gap-2">
      <div className="relative w-32 shrink-0" ref={dropdownRef}>
        <Input
          value={entry.code}
          onChange={(e) => {
            onUpdate("code", e.target.value);
            onSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          placeholder="Code"
          className="pr-7"
        />
        {isLoading && <Loader2 className="absolute right-2 top-2.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        {!isLoading && entry.code.length >= 2 && <Search className="absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 mt-1 w-80 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {suggestions.map((s, si) => (
              <button
                key={si}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex gap-2"
                onClick={() => {
                  onUpdate("code", s.code);
                  onUpdate("description", s.description);
                  setShowDropdown(false);
                  onClearSuggestions();
                }}
              >
                <span className="font-mono font-medium shrink-0">{s.code}</span>
                <span className="text-muted-foreground truncate">{s.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Input
        className="flex-1"
        value={entry.description}
        onChange={(e) => onUpdate("description", e.target.value)}
        placeholder="Description"
      />
      {canRemove && (
        <Button variant="ghost" size="icon" onClick={onRemove} className="shrink-0 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function HospitalAdmissionEditor({
  patientId,
  patientName,
  sessionId,
  onClose,
  onSave,
}: HospitalAdmissionEditorProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { formattedContent: savedTemplate, headerFooter, isLoading: templateLoading } =
    useTemplateWithHeaderFooter("Hospital Admission Form");

  const doctorName = profile?.full_name || "Doctor";
  const practiceNumber = profile?.practice_number || "";
  const practiceAddress = profile?.practice_address || "";
  const doctorNumber = profile?.doctor_number || "";
  const country = (profile as any)?.country || "ZA";

  const [hospital, setHospital] = useState("");
  const [admissionDate, setAdmissionDate] = useState<Date | undefined>(new Date());
  const [procedureDate, setProcedureDate] = useState<Date | undefined>(new Date());
  const [procedureDescription, setProcedureDescription] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState<InstructionEntry[]>([
    { instruction: "", description: "" },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Dynamic code systems
  const [codeSystems, setCodeSystems] = useState<CodeSystem[]>([
    { name: "ICD-10", key: "icd10", entries: [{ code: "", description: "" }] },
    { name: "NHRPL", key: "nhrpl", entries: [{ code: "", description: "" }] },
  ]);
  const [newSystemName, setNewSystemName] = useState("");

  const { suggestions, loading, search, clearSuggestions } = useCodeSearch(country);
  const procedureCodeSearch = useCodeSearch(country);
  const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);
  const procedureDropdownRef = useRef<HTMLDivElement>(null);

  // Close procedure dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (procedureDropdownRef.current && !procedureDropdownRef.current.contains(e.target as Node)) {
        setShowProcedureDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // AI auto-populate procedure from session
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const { data: session } = await supabase
          .from("sessions")
          .select("summary, notes, transcript")
          .eq("id", sessionId)
          .maybeSingle();
        if (!session) return;
        const context = session.summary || session.notes || session.transcript || "";
        if (context.length < 10) return;
        const { data, error } = await supabase.functions.invoke('lookup-medical-codes', {
          body: { query: context.slice(0, 300), codeSystem: 'NHRPL', country },
        });
        if (!error && Array.isArray(data) && data.length > 0) {
          const best = data[0];
          setProcedureDescription(best.description);
          const nhrplIndex = codeSystems.findIndex(s => s.key === 'nhrpl');
          if (nhrplIndex >= 0) {
            const updated = [...codeSystems];
            if (updated[nhrplIndex].entries.length === 1 && !updated[nhrplIndex].entries[0].code) {
              updated[nhrplIndex].entries = [{ code: best.code, description: best.description }];
            }
            setCodeSystems(updated);
          }
        }
      } catch (e) {
        console.error("AI procedure auto-populate error:", e);
      }
    })();
  }, [sessionId]);

  const addCodeSystem = () => {
    if (!newSystemName.trim()) return;
    const key = newSystemName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    setCodeSystems([...codeSystems, { name: newSystemName.trim(), key, entries: [{ code: "", description: "" }] }]);
    setNewSystemName("");
  };

  const removeCodeSystem = (index: number) => {
    setCodeSystems(codeSystems.filter((_, i) => i !== index));
  };

  const addEntry = (sysIndex: number) => {
    const updated = [...codeSystems];
    updated[sysIndex].entries.push({ code: "", description: "" });
    setCodeSystems(updated);
  };

  const removeEntry = (sysIndex: number, entryIndex: number) => {
    const updated = [...codeSystems];
    updated[sysIndex].entries = updated[sysIndex].entries.filter((_, i) => i !== entryIndex);
    setCodeSystems(updated);
  };

  const updateEntry = (sysIndex: number, entryIndex: number, field: keyof CodeEntry, value: string) => {
    const updated = [...codeSystems];
    updated[sysIndex].entries[entryIndex][field] = value;
    setCodeSystems(updated);
  };

  const addInstruction = () =>
    setSpecialInstructions([...specialInstructions, { instruction: "", description: "" }]);
  const removeInstruction = (i: number) =>
    setSpecialInstructions(specialInstructions.filter((_, idx) => idx !== i));
  const updateInstruction = (i: number, field: keyof InstructionEntry, value: string) => {
    const updated = [...specialInstructions];
    updated[i][field] = value;
    setSpecialInstructions(updated);
  };

  const baseTemplate = savedTemplate || FALLBACK_TEMPLATE;

  const generateContent = () => {
    const icd10System = codeSystems.find(s => s.key === "icd10");
    const nhrplSystem = codeSystems.find(s => s.key === "nhrpl");
    const additionalSystems = codeSystems.filter(s => s.key !== "icd10" && s.key !== "nhrpl");

    const icd10Text = icd10System?.entries
      .filter((e) => e.code.trim())
      .map((e) => `• ${e.code}${e.description ? ` — ${e.description}` : ""}`)
      .join("\n") || "None specified";

    const nhrplText = nhrplSystem?.entries
      .filter((e) => e.code.trim())
      .map((e) => `• ${e.code}${e.description ? ` — ${e.description}` : ""}`)
      .join("\n") || "—";

    const procedureCodesText = `NHRPL Codes:\n${nhrplText}`;

    const additionalText = additionalSystems
      .map(sys => {
        const entries = sys.entries
          .filter(e => e.code.trim())
          .map(e => `• ${e.code}${e.description ? ` — ${e.description}` : ""}`)
          .join("\n");
        return entries ? `${sys.name} CODES\n\n${entries}\n\n─────────────────────────────────────\n` : "";
      })
      .filter(Boolean)
      .join("\n");

    const instructionsText = specialInstructions
      .filter((e) => e.instruction.trim())
      .map((e) => `• ${e.instruction}${e.description ? ` — ${e.description}` : ""}`)
      .join("\n");

    return baseTemplate
      .replace(/\[DOCTOR_NAME\]/g, doctorName)
      .replace(/\[DoctorName\]/g, doctorName)
      .replace(/\[PRACTICE_NUMBER\]/g, practiceNumber)
      .replace(/\[PracticeNumber\]/g, practiceNumber)
      .replace(/\[PRACTICE_ADDRESS\]/g, practiceAddress)
      .replace(/\[PracticeAddress\]/g, practiceAddress)
      .replace(/\[DOCTOR_NUMBER\]/g, doctorNumber)
      .replace(/\[DoctorNumber\]/g, doctorNumber)
      .replace(/\[PATIENT_NAME\]/g, patientName)
      .replace(/\[PatientName\]/g, patientName)
      .replace("[HOSPITAL]", hospital || "—")
      .replace("[ADMISSION_DATE]", admissionDate ? format(admissionDate, "dd/MM/yyyy") : "—")
      .replace("[ICD10_CODES]", icd10Text)
      .replace("[PROCEDURE_DATE]", procedureDate ? format(procedureDate, "dd/MM/yyyy") : "—")
      .replace("[PROCEDURE_DESCRIPTION]", procedureDescription || "—")
      .replace("[PROCEDURE_CODES]", procedureCodesText)
      .replace("[NHRPL_CODES]", nhrplText)
      .replace("[ADDITIONAL_CODE_SYSTEMS]", additionalText)
      .replace("[SPECIAL_INSTRUCTIONS]", instructionsText || "None");
  };

  const handleSave = async () => {
    if (!hospital.trim()) {
      toast({ title: "Missing Information", description: "Please enter the hospital name", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const content = generateContent();

      const { data: docRow, error } = await supabase.from("documents").insert({
        name: `Hospital Admission Form - ${patientName} - ${admissionDate ? format(admissionDate, "dd/MM/yyyy") : new Date().toLocaleDateString()}`,
        content,
        patient_id: patientId,
        patient_name: patientName,
        template_name: "Hospital Admission Form",
        user_id: user.id,
      }).select().single();

      if (error) throw error;

      // Auto-create hospital admission record linked to this document
      const { error: admErr } = await supabase.from("hospital_admissions").insert({
        patient_id: patientId,
        doctor_id: user.id,
        document_id: docRow?.id || null,
        hospital: hospital || null,
        admission_date: admissionDate ? admissionDate.toISOString() : new Date().toISOString(),
        diagnosis: codeSystems.flatMap(cs => cs.entries.filter(e => e.description).map(e => `${cs.name}: ${e.code} ${e.description}`)).join(" | ") || null,
        procedure_description: procedureDescription || null,
        status: "admitted",
      });
      if (admErr) console.error("Failed to create admission record:", admErr);

      onSave({ content });
      toast({ title: "Hospital Admission Form Saved", description: "The form has been saved successfully." });
      onClose();
    } catch (error: any) {
      console.error("Error saving hospital admission form:", error);
      toast({ title: "Error", description: error.message || "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (showPreview) {
    return (
      <DocumentPreview
        title="Hospital Admission Form"
        subtitle={`Patient: ${patientName}`}
        content={generateContent()}
        logoUrl={profile?.logo_url || undefined}
        fontFamily={headerFooter?.font_family || undefined}
        headerFooter={headerFooter}
        onClose={() => setShowPreview(false)}
        closeLabel="Back to Form"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-primary bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10">
              <FileText className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Hospital Admission Form</h2>
              <p className="text-sm text-muted-foreground">Patient: {patientName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Admission Details */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Admission Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Admitting Doctor</Label>
                <Input value={doctorName} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Practice Number</Label>
                <Input value={practiceNumber} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Hospital *</Label>
                <Input value={hospital} onChange={(e) => setHospital(e.target.value)} placeholder="e.g., Mediclinic Sandton" />
              </div>
              <div className="space-y-2">
                <Label>Date of Admission</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !admissionDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {admissionDate ? format(admissionDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={admissionDate} onSelect={setAdmissionDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Procedure Description */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Procedure</h3>
            <div className="space-y-2">
              <div className="relative" ref={procedureDropdownRef}>
                <Input
                  placeholder="Search procedure (e.g. Total Knee Replacement)"
                  value={procedureDescription}
                  onChange={(e) => {
                    setProcedureDescription(e.target.value);
                    procedureCodeSearch.search(e.target.value, 'NHRPL', 'procedure');
                    setShowProcedureDropdown(true);
                  }}
                  onFocus={() => {
                    if ((procedureCodeSearch.suggestions['procedure'] || []).length > 0) setShowProcedureDropdown(true);
                  }}
                  onBlur={async () => {
                    // Delay to allow click on dropdown
                    setTimeout(async () => {
                      if (procedureDescription.trim().length >= 3) {
                        try {
                          const { data, error } = await supabase.functions.invoke('lookup-medical-codes', {
                            body: { query: procedureDescription, codeSystem: 'NHRPL', country },
                          });
                          if (!error && Array.isArray(data) && data.length > 0) {
                            const nhrplIndex = codeSystems.findIndex(s => s.key === 'nhrpl');
                            if (nhrplIndex >= 0) {
                              const updated = [...codeSystems];
                              const existingCodes = new Set(updated[nhrplIndex].entries.map(e => e.code).filter(Boolean));
                              const newEntries = data
                                .filter((d: any) => !existingCodes.has(d.code))
                                .map((d: any) => ({ code: d.code, description: d.description }));
                              if (newEntries.length > 0) {
                                if (updated[nhrplIndex].entries.length === 1 && !updated[nhrplIndex].entries[0].code) {
                                  updated[nhrplIndex].entries = newEntries;
                                } else {
                                  updated[nhrplIndex].entries = [...updated[nhrplIndex].entries, ...newEntries];
                                }
                                setCodeSystems(updated);
                              }
                            }
                          }
                        } catch (e) {
                          console.error("Procedure code lookup error:", e);
                        }
                      }
                    }, 200);
                  }}
                />
                {procedureCodeSearch.loading['procedure'] && (
                  <Loader2 className="absolute right-2 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {showProcedureDropdown && (procedureCodeSearch.suggestions['procedure'] || []).length > 0 && (
                  <div className="absolute z-50 top-full left-0 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                    {[...(procedureCodeSearch.suggestions['procedure'] || [])]
                      .sort((a, b) => a.description.localeCompare(b.description))
                      .map((s, si) => (
                        <button
                          key={si}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex gap-2"
                          onClick={() => {
                            setProcedureDescription(s.description);
                            setShowProcedureDropdown(false);
                            procedureCodeSearch.clearSuggestions('procedure');
                            // Auto-fill NHRPL code
                            const nhrplIndex = codeSystems.findIndex(sys => sys.key === 'nhrpl');
                            if (nhrplIndex >= 0) {
                              const updated = [...codeSystems];
                              const existingCodes = new Set(updated[nhrplIndex].entries.map(e => e.code).filter(Boolean));
                              if (!existingCodes.has(s.code)) {
                                if (updated[nhrplIndex].entries.length === 1 && !updated[nhrplIndex].entries[0].code) {
                                  updated[nhrplIndex].entries = [{ code: s.code, description: s.description }];
                                } else {
                                  updated[nhrplIndex].entries.push({ code: s.code, description: s.description });
                                }
                                setCodeSystems(updated);
                              }
                            }
                          }}
                        >
                          <span className="font-mono font-medium shrink-0">{s.code}</span>
                          <span className="text-muted-foreground truncate">{s.description}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">NHRPL codes will be auto-filled based on the procedure</p>
            </div>
          </div>

          {/* Dynamic Code Systems */}
          {codeSystems.map((sys, sysIndex) => (
            <div key={sys.key}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  {sys.key === "icd10" ? "Diagnosis Details — ICD-10 Codes" :
                   sys.key === "nhrpl" ? "Procedure — NHRPL Codes" :
                   `${sys.name} Codes`}
                </h3>
                {sys.key !== "icd10" && sys.key !== "nhrpl" && (
                  <Button variant="ghost" size="sm" onClick={() => removeCodeSystem(sysIndex)} className="text-destructive hover:text-destructive h-7 px-2">
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {sys.entries.map((entry, entryIndex) => {
                  const fieldKey = `${sys.key}-${entryIndex}`;
                  return (
                    <CodeEntryRow
                      key={fieldKey}
                      entry={entry}
                      index={entryIndex}
                      systemKey={sys.key}
                      systemName={sys.name}
                      canRemove={sys.entries.length > 1}
                      onUpdate={(field, value) => updateEntry(sysIndex, entryIndex, field, value)}
                      onRemove={() => removeEntry(sysIndex, entryIndex)}
                      suggestions={suggestions[fieldKey] || []}
                      isLoading={loading[fieldKey] || false}
                      onSearch={(query) => search(query, sys.name, fieldKey)}
                      onClearSuggestions={() => clearSuggestions(fieldKey)}
                    />
                  );
                })}
                <Button variant="outline" size="sm" onClick={() => addEntry(sysIndex)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add {sys.name} Code
                </Button>
              </div>
            </div>
          ))}

          {/* Add Code System */}
          <div className="border border-dashed border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Add additional code systems (e.g., CPT, OPCS, MBS)</p>
            <div className="flex gap-2">
              <Input
                value={newSystemName}
                onChange={(e) => setNewSystemName(e.target.value)}
                placeholder="Code system name"
                className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") addCodeSystem(); }}
              />
              <Button variant="outline" size="sm" onClick={addCodeSystem} disabled={!newSystemName.trim()} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>

          {/* Procedure Details */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Procedure Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Procedure</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !procedureDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {procedureDate ? format(procedureDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={procedureDate} onSelect={setProcedureDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Procedure Description</Label>
                <Textarea
                  value={procedureDescription}
                  onChange={(e) => setProcedureDescription(e.target.value)}
                  placeholder="Describe the procedure..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Patient Special Instructions</h3>
            <div className="space-y-2">
              {specialInstructions.map((entry, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Input
                    className="w-40 shrink-0"
                    value={entry.instruction}
                    onChange={(e) => updateInstruction(i, "instruction", e.target.value)}
                    placeholder="Instruction"
                  />
                  <Input
                    className="flex-1"
                    value={entry.description}
                    onChange={(e) => updateInstruction(i, "description", e.target.value)}
                    placeholder="Description"
                  />
                  {specialInstructions.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeInstruction(i)} className="shrink-0 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addInstruction} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Instruction
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowPreview(true)} className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
