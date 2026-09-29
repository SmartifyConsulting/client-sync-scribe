import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, X, Sparkles, FileText } from "lucide-react";
// @ts-ignore
import readXlsxFile from 'read-excel-file/browser';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ParsedPatient {
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  dob?: string;
  physical_address?: string;
  postal_address?: string;
  medical_aid?: string;
  medical_aid_number?: string;
  medical_insurance_product?: string;
  allergies?: string;
  employer?: string;
  occupation?: string;
  referred_by?: string;
  general_practitioner?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_email?: string;
  notes?: string;
  id_passport_number?: string;
  gender?: string;
  marital_status?: string;
  status?: string;
}

// Common column name mappings
const COLUMN_MAPPINGS: Record<string, keyof ParsedPatient> = {
  // Name variations
  "name": "name",
  "full name": "name",
  "fullname": "name",
  "patient name": "name",
  "patient": "name",
  
  // First name variations
  "first name": "first_name",
  "firstname": "first_name",
  "first": "first_name",
  "given name": "first_name",
  "givenname": "first_name",
  
  // Last name variations
  "surname": "last_name",
  "last name": "last_name",
  "lastname": "last_name",
  "last": "last_name",
  "family name": "last_name",
  "familyname": "last_name",
  
  // Email variations
  "email": "email",
  "e-mail": "email",
  "email address": "email",
  "emailaddress": "email",
  "patient email": "email",
  
  // Phone variations
  "phone": "phone",
  "telephone": "phone",
  "tel": "phone",
  "mobile": "phone",
  "cell": "phone",
  "cellphone": "phone",
  "phone number": "phone",
  "contact number": "phone",
  "contact": "phone",
  
  // DOB variations
  "dob": "dob",
  "date of birth": "dob",
  "dateofbirth": "dob",
  "birth date": "dob",
  "birthdate": "dob",
  "birthday": "dob",
  
  // Address variations
  "address": "physical_address",
  "physical address": "physical_address",
  "street address": "physical_address",
  "residential address": "physical_address",
  "home address": "physical_address",
  "postal address": "postal_address",
  "mailing address": "postal_address",
  
  // Medical aid variations
  "medical aid": "medical_aid",
  "medical insurance": "medical_aid",
  "insurance": "medical_aid",
  "insurance provider": "medical_aid",
  "health insurance": "medical_aid",
  "medical scheme": "medical_aid",
  "scheme": "medical_aid",
  "medical aid number": "medical_aid_number",
  "membership number": "medical_aid_number",
  "member number": "medical_aid_number",
  "policy number": "medical_aid_number",
  "insurance number": "medical_aid_number",
  "medical insurance product": "medical_insurance_product",
  "plan": "medical_insurance_product",
  "product": "medical_insurance_product",
  "option": "medical_insurance_product",
  
  // Allergies
  "allergies": "allergies",
  "allergy": "allergies",
  "known allergies": "allergies",
  
  // Employment
  "employer": "employer",
  "company": "employer",
  "workplace": "employer",
  "occupation": "occupation",
  "job": "occupation",
  "profession": "occupation",
  "job title": "occupation",
  
  // Referral
  "referred by": "referred_by",
  "referral": "referred_by",
  "referred": "referred_by",
  "referrer": "referred_by",
  
  // GP
  "general practitioner": "general_practitioner",
  "gp": "general_practitioner",
  "family doctor": "general_practitioner",
  "primary doctor": "general_practitioner",
  
  // Next of kin
  "next of kin": "next_of_kin_name",
  "next of kin name": "next_of_kin_name",
  "emergency contact": "next_of_kin_name",
  "emergency contact name": "next_of_kin_name",
  "nok": "next_of_kin_name",
  "nok name": "next_of_kin_name",
  "next of kin phone": "next_of_kin_phone",
  "next of kin contact": "next_of_kin_phone",
  "next of kin contact number": "next_of_kin_phone",
  "nok phone": "next_of_kin_phone",
  "nok contact": "next_of_kin_phone",
  "nok contact number": "next_of_kin_phone",
  "emergency phone": "next_of_kin_phone",
  "emergency contact number": "next_of_kin_phone",
  "emergency number": "next_of_kin_phone",
  "next of kin email": "next_of_kin_email",
  "nok email": "next_of_kin_email",
  "emergency email": "next_of_kin_email",
  
  // Notes
  "notes": "notes",
  "comments": "notes",
  "remarks": "notes",
  "additional info": "notes",

  // ID/Passport
  "id": "id_passport_number",
  "id number": "id_passport_number",
  "id/passport": "id_passport_number",
  "passport": "id_passport_number",
  "passport number": "id_passport_number",
  "id_passport_number": "id_passport_number",

  // Gender
  "gender": "gender",
  "sex": "gender",

  // Marital status
  "marital status": "marital_status",
  "marital": "marital_status",
  
  // Status
  "status": "status",
  "patient status": "status",
  "active/inactive": "status",
};

function mapColumnName(header: string): keyof ParsedPatient | null {
  const normalized = header.toLowerCase().trim();
  return COLUMN_MAPPINGS[normalized] || null;
}

function parseExcelDate(value: any): string | undefined {
  if (!value) return undefined;
  
  // If it's already a string in a date format
  if (typeof value === "string") {
    // Try to parse common date formats
    const dateStr = value.trim();
    
    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    
    // YYYY/MM/DD or YYYY-MM-DD
    const ymdMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    
    // Try native Date parsing as fallback
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
  }
  
  // Excel serial date number
  if (typeof value === "number") {
    // Excel dates are number of days since 1900-01-01
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }
  
  return undefined;
}

interface PatientImportProps {
  onImportComplete?: () => void;
}

export function PatientImport({ onImportComplete }: PatientImportProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [parsedPatients, setParsedPatients] = useState<ParsedPatient[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

  const processWithAI = useCallback(async (content: string, fileType: string) => {
    setIsAiProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('parse-patient-import', {
        body: { content, fileType }
      });

      if (error) throw error;
      
      if (data?.patients && data.patients.length > 0) {
        setParsedPatients(data.patients);
        toast({
          title: "AI Processing Complete",
          description: `Found ${data.patients.length} patient${data.patients.length === 1 ? "" : "s"} to import`,
        });
      } else {
        toast({
          title: "No clients found",
          description: "AI could not extract any valid client records from the content",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("AI processing error:", error);
      toast({
        title: "AI Processing Failed",
        description: error.message || "Could not process the file with AI",
        variant: "destructive",
      });
    } finally {
      setIsAiProcessing(false);
    }
  }, [toast]);

  const processSpreadsheet = useCallback(async (file: File) => {
    setIsProcessing(true);
    setParsedPatients([]);
    setImportResults(null);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let jsonData: any[][];

      if (extension === 'csv') {
        const text = await file.text();
        const lines = text.split('\n').map(line => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        }).filter(row => row.some(cell => cell !== ''));
        jsonData = lines;
      } else {
        const rows = await readXlsxFile(file);
        jsonData = rows.map(row => row.map(cell => cell === null ? '' : cell));
      }

      if (jsonData.length < 2) {
        const textContent = jsonData.map(row => row.join(',')).join('\n');
        setIsProcessing(false);
        await processWithAI(textContent, 'csv');
        return;
      }

      // First row is headers
      const headers = jsonData[0] as string[];
      const columnMap: Record<number, keyof ParsedPatient> = {};

      // Map headers to our fields
      headers.forEach((header, index) => {
        if (header) {
          const mappedField = mapColumnName(String(header));
          if (mappedField) {
            columnMap[index] = mappedField;
          }
        }
      });

      // Check if we have at least a name column or first/last name columns
      const hasNameColumn = Object.values(columnMap).includes("name");
      const hasFirstName = Object.values(columnMap).includes("first_name");
      const hasLastName = Object.values(columnMap).includes("last_name");
      
      if (!hasNameColumn && !hasFirstName && !hasLastName) {
        // Try AI parsing when columns can't be mapped
        const textContent = jsonData.map(row => row.join(',')).join('\n');
        setIsProcessing(false);
        await processWithAI(textContent, 'csv');
        return;
      }

      // Parse data rows
      const patients: ParsedPatient[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.every(cell => !cell)) continue; // Skip empty rows

        const patient: ParsedPatient = { name: "" };

        Object.entries(columnMap).forEach(([indexStr, field]) => {
          const index = parseInt(indexStr);
          const value = row[index];
          
          if (value !== undefined && value !== null && value !== "") {
            if (field === "dob") {
              patient.dob = parseExcelDate(value);
            } else {
              (patient as any)[field] = String(value).trim();
            }
          }
        });

        // Combine first_name and last_name into name if no full name was provided
        if (!patient.name && (patient.first_name || patient.last_name)) {
          patient.name = `${patient.first_name || ""} ${patient.last_name || ""}`.trim();
        }

        // Only add if we have a name
        if (patient.name) {
          patients.push(patient);
        }
      }

      if (patients.length === 0) {
        toast({
          title: "No valid clients",
          description: "Could not parse any valid client records from the file",
          variant: "destructive",
        });
      } else {
        setParsedPatients(patients);
        toast({
          title: "File processed",
          description: `Found ${patients.length} patient${patients.length === 1 ? "" : "s"} to import`,
        });
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error processing file",
        description: "Could not read the spreadsheet. Please check the file format.",
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  }, [toast, processWithAI]);

  const processFile = useCallback(async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'txt') {
      // Text/Notepad file - use AI parsing
      setIsProcessing(true);
      setParsedPatients([]);
      setImportResults(null);
      
      try {
        const content = await file.text();
        setIsProcessing(false);
        await processWithAI(content, 'txt');
      } catch (error) {
        console.error("Error reading text file:", error);
        toast({
          title: "Error reading file",
          description: "Could not read the text file",
          variant: "destructive",
        });
        setIsProcessing(false);
      }
    } else if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
      await processSpreadsheet(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a text (.txt), Excel (.xlsx, .xls) or CSV file",
        variant: "destructive",
      });
    }
  }, [toast, processWithAI, processSpreadsheet]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (!user || parsedPatients.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < parsedPatients.length; i++) {
      const patient = parsedPatients[i];
      
      try {
        const { error } = await supabase.from("patients").insert({
          user_id: user.id,
          name: patient.name,
          email: patient.email || null,
          phone: patient.phone || null,
          dob: patient.dob || null,
          physical_address: patient.physical_address || null,
          postal_address: patient.postal_address || null,
          medical_aid: patient.medical_aid || null,
          medical_aid_number: patient.medical_aid_number || null,
          medical_insurance_product: patient.medical_insurance_product || null,
          allergies: patient.allergies || null,
          employer: patient.employer || null,
          occupation: patient.occupation || null,
          referred_by: patient.referred_by || null,
          general_practitioner: patient.general_practitioner || null,
          next_of_kin_name: patient.next_of_kin_name || null,
          next_of_kin_phone: patient.next_of_kin_phone || null,
          next_of_kin_email: patient.next_of_kin_email || null,
          notes: patient.notes || null,
          id_passport_number: patient.id_passport_number || null,
          gender: patient.gender || null,
          marital_status: patient.marital_status || null,
          status: patient.status || "active",
        });

        if (error) {
          console.error("Error importing patient:", patient.name, error);
          failedCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error("Error importing patient:", patient.name, err);
        failedCount++;
      }

      setImportProgress(Math.round(((i + 1) / parsedPatients.length) * 100));
    }

    setIsImporting(false);
    setImportResults({ success: successCount, failed: failedCount });

    if (successCount > 0) {
      toast({
        title: "Import completed",
        description: `Successfully imported ${successCount} patient${successCount === 1 ? "" : "s"}${failedCount > 0 ? `. ${failedCount} failed.` : ""}`,
      });
      onImportComplete?.();
    } else {
      toast({
        title: "Import failed",
        description: "Could not import any clients. Please check the data.",
        variant: "destructive",
      });
    }
  };

  const clearData = () => {
    setParsedPatients([]);
    setImportResults(null);
    setImportProgress(0);
  };

  const isLoading = isProcessing || isAiProcessing;

  return (
    <div className="space-y-6">
      {/* Upload area */}
      {parsedPatients.length === 0 && (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              {isAiProcessing ? (
                <>
                  <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                  <p className="text-foreground font-medium">AI is analyzing your data...</p>
                  <p className="text-sm text-muted-foreground">This may take a moment</p>
                </>
              ) : (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-muted-foreground">Processing file...</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-3 mb-4">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-1">
                Drag & drop your file here
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Supports Excel, CSV, and text/notepad files
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">AI-powered field detection</span>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="patient-import-file"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("patient-import-file")?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </Button>
            </>
          )}
        </div>
      )}

      {/* Preview table */}
      {parsedPatients.length > 0 && !importResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">
                Preview ({parsedPatients.length} patient{parsedPatients.length === 1 ? "" : "s"})
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearData}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '400px' }}>
            <Table style={{ minWidth: '1100px' }}>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-card z-10 w-[30px] px-1">#</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 min-w-[110px] px-1">Name</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 min-w-[130px] px-1">Email</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 min-w-[90px] px-1">Phone</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 min-w-[100px] px-1">DOB</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 min-w-[65px] px-1">Gender</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 min-w-[90px] px-1">ID/Passport</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 min-w-[100px] px-1">Provider</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 min-w-[90px] px-1">Employer</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 min-w-[90px] px-1">Allergies</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 min-w-[100px] px-1">Address</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 min-w-[65px] px-1">Status</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 w-[30px] px-1"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedPatients.map((patient, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-muted-foreground text-xs px-1">{index + 1}</TableCell>
                    <TableCell className="px-1"><Input className="h-7 text-xs px-1.5" value={patient.name} onChange={(e) => { const updated = [...parsedPatients]; updated[index] = { ...updated[index], name: e.target.value }; setParsedPatients(updated); }} /></TableCell>
                    <TableCell className="px-1"><Input className="h-7 text-xs px-1.5" value={patient.email || ""} onChange={(e) => { const updated = [...parsedPatients]; updated[index] = { ...updated[index], email: e.target.value }; setParsedPatients(updated); }} /></TableCell>
                    <TableCell className="px-1"><Input className="h-7 text-xs px-1.5" value={patient.phone || ""} onChange={(e) => { const updated = [...parsedPatients]; updated[index] = { ...updated[index], phone: e.target.value }; setParsedPatients(updated); }} /></TableCell>
                    <TableCell className="px-1"><Input className="h-7 text-xs px-1.5" type="date" value={patient.dob || ""} onChange={(e) => { const updated = [...parsedPatients]; updated[index] = { ...updated[index], dob: e.target.value }; setParsedPatients(updated); }} /></TableCell>
                    <TableCell className="px-1"><Input className="h-7 text-xs px-1.5" value={patient.gender || ""} onChange={(e) => { const updated = [...parsedPatients]; updated[index] = { ...updated[index], gender: e.target.value }; setParsedPatients(updated); }} /></TableCell>
                    <TableCell className="px-1"><Input className="h-7 text-xs px-1.5" value={patient.id_passport_number || ""} onChange={(e) => { const updated = [...parsedPatients]; updated[index] = { ...updated[index], id_passport_number: e.target.value }; setParsedPatients(updated); }} /></TableCell>
                    <TableCell className="px-1"><Input className="h-7 text-xs px-1.5" value={patient.medical_aid || ""} onChange={(e) => { const updated = [...parsedPatients]; updated[index] = { ...updated[index], medical_aid: e.target.value }; setParsedPatients(updated); }} /></TableCell>
                    <TableCell className="px-1"><Input className="h-7 text-xs px-1.5" value={patient.employer || ""} onChange={(e) => { const updated = [...parsedPatients]; updated[index] = { ...updated[index], employer: e.target.value }; setParsedPatients(updated); }} /></TableCell>
                    <TableCell className="px-1"><Input className="h-7 text-xs px-1.5" value={patient.allergies || ""} onChange={(e) => { const updated = [...parsedPatients]; updated[index] = { ...updated[index], allergies: e.target.value }; setParsedPatients(updated); }} /></TableCell>
                    <TableCell className="px-1"><Input className="h-7 text-xs px-1.5" value={patient.physical_address || ""} onChange={(e) => { const updated = [...parsedPatients]; updated[index] = { ...updated[index], physical_address: e.target.value }; setParsedPatients(updated); }} /></TableCell>
                    <TableCell className="px-1"><Input className="h-7 text-xs px-1.5" value={patient.status || "active"} onChange={(e) => { const updated = [...parsedPatients]; updated[index] = { ...updated[index], status: e.target.value }; setParsedPatients(updated); }} /></TableCell>
                    <TableCell className="px-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setParsedPatients(parsedPatients.filter((_, i) => i !== index))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>

          {isImporting && (
            <div className="space-y-2">
              <Progress value={importProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Importing... {importProgress}%
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleImport} disabled={isImporting} className="gap-2">
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isImporting ? "Importing..." : "Import Patients"}
            </Button>
            <Button variant="outline" onClick={clearData} disabled={isImporting}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {importResults && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <Check className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Import Complete</p>
              <p className="text-sm text-muted-foreground">
                {importResults.success} patient{importResults.success === 1 ? "" : "s"} imported successfully
                {importResults.failed > 0 && (
                  <span className="text-destructive"> · {importResults.failed} failed</span>
                )}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={clearData}>
            Import More Patients
          </Button>
        </div>
      )}

      {/* Supported formats hint */}
      {parsedPatients.length === 0 && !isLoading && (
        <div className="p-4 rounded-lg bg-muted/30">
          <p className="text-sm font-medium text-foreground mb-2">Supported Formats</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="secondary" className="text-xs">.xlsx</Badge>
            <Badge variant="secondary" className="text-xs">.xls</Badge>
            <Badge variant="secondary" className="text-xs">.csv</Badge>
            <Badge variant="secondary" className="text-xs">.txt</Badge>
          </div>
          <p className="text-sm font-medium text-foreground mb-2">Auto-detected Fields</p>
          <div className="flex flex-wrap gap-2">
            {["Name", "Email", "Phone", "DOB", "Gender", "ID/Passport", "Address", "Medical Aid", "Allergies", "Employer", "Occupation", "GP", "Next of Kin"].map((col) => (
              <Badge key={col} variant="outline" className="text-xs">
                {col}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            <Sparkles className="h-4 w-4 inline mr-1" />
            AI automatically detects and maps fields from any format, including unstructured text notes.
          </p>
        </div>
      )}
    </div>
  );
}

// Dialog wrapper for use in other components
interface PatientImportDialogProps {
  trigger: React.ReactNode;
  onImportComplete?: () => void;
}

export function PatientImportDialog({ trigger, onImportComplete }: PatientImportDialogProps) {
  const [open, setOpen] = useState(false);

  const handleComplete = () => {
    onImportComplete?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Import Patients
          </DialogTitle>
          <DialogDescription>
            Import patients from spreadsheets or text notes using AI-powered field detection
          </DialogDescription>
        </DialogHeader>
        <PatientImport onImportComplete={handleComplete} />
      </DialogContent>
    </Dialog>
  );
}
