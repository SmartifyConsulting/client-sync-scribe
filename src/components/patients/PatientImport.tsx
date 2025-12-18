import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2, X } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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

export function PatientImport() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedPatients, setParsedPatients] = useState<ParsedPatient[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx?|csv)$/i)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel (.xlsx, .xls) or CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setParsedPatients([]);
    setImportResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast({
          title: "Empty file",
          description: "The file appears to be empty or has no data rows",
          variant: "destructive",
        });
        setIsProcessing(false);
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
        toast({
          title: "Missing required column",
          description: "Could not find a 'Name', 'First Name', or 'Last Name' column in the spreadsheet",
          variant: "destructive",
        });
        setIsProcessing(false);
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
          title: "No valid patients",
          description: "Could not parse any valid patient records from the file",
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
  }, [toast]);

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
          status: "active",
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
    } else {
      toast({
        title: "Import failed",
        description: "Could not import any patients. Please check the data.",
        variant: "destructive",
      });
    }
  };

  const clearData = () => {
    setParsedPatients([]);
    setImportResults(null);
    setImportProgress(0);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <FileSpreadsheet className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Import Patients</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Import existing patients from an Excel spreadsheet (.xlsx, .xls) or CSV file. 
        Column names are automatically matched to patient fields.
      </p>

      {/* Upload area */}
      {parsedPatients.length === 0 && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-muted-foreground">Processing file...</p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">
                Drag & drop your spreadsheet here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="patient-import-file"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("patient-import-file")?.click()}
              >
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
            <p className="text-sm font-medium text-foreground">
              Preview ({parsedPatients.length} patient{parsedPatients.length === 1 ? "" : "s"})
            </p>
            <Button variant="ghost" size="sm" onClick={clearData}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>

          <ScrollArea className="h-[300px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-card">Name</TableHead>
                  <TableHead className="sticky top-0 bg-card">Email</TableHead>
                  <TableHead className="sticky top-0 bg-card">Phone</TableHead>
                  <TableHead className="sticky top-0 bg-card">DOB</TableHead>
                  <TableHead className="sticky top-0 bg-card">Medical Aid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedPatients.map((patient, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.email || "-"}</TableCell>
                    <TableCell>{patient.phone || "-"}</TableCell>
                    <TableCell>{patient.dob || "-"}</TableCell>
                    <TableCell>{patient.medical_aid || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

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

      {/* Supported columns hint */}
      <div className="mt-6 p-4 rounded-lg bg-muted/30">
        <p className="text-sm font-medium text-foreground mb-2">Supported Columns</p>
        <div className="flex flex-wrap gap-2">
          {["Name", "Email", "Phone", "Date of Birth", "Address", "Medical Aid", "Medical Aid Number", "Allergies", "Employer", "Occupation", "Referred By", "GP", "Next of Kin"].map((col) => (
            <Badge key={col} variant="secondary" className="text-xs">
              {col}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Column names are flexible - e.g., "Phone", "Tel", "Mobile", "Cell" all map to the phone field.
        </p>
      </div>
    </div>
  );
}
