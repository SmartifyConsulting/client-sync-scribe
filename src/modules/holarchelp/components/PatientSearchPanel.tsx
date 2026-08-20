import { useRef, useEffect } from "react";
import { usePatientSearch, type PatientSearchResult } from "../hooks/usePatientSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Search, Link2, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatientSearchPanelProps {
  hospitalId: string;
  onPatientSelected?: (patient: PatientSearchResult) => void;
  onLinkAdmission?: (admissionId: string, patientUserId: string) => void;
  admissionId?: string; // If provided, shows link button
  className?: string;
}

/**
 * Patient Search Panel for hospital staff
 * Allows searching for patients by name/phone and linking them to admissions
 */
export function PatientSearchPanel({
  hospitalId,
  onPatientSelected,
  onLinkAdmission,
  admissionId,
  className,
}: PatientSearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    query,
    setQuery,
    results,
    loading,
    error,
    linkAdmissionToPatient,
    clearResults,
  } = usePatientSearch({
    hospitalId,
    enabled: true,
  });

  const handleResultClick = (patient: PatientSearchResult) => {
    onPatientSelected?.(patient);
  };

  const handleLinkAdmission = async (patient: PatientSearchResult) => {
    if (!admissionId) return;

    const success = await linkAdmissionToPatient(admissionId, patient.user_id);
    if (success) {
      clearResults();
      setQuery("");
      onLinkAdmission?.(admissionId, patient.user_id);
    }
  };

  const getAdmissionStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      admitted: "default",
      in_treatment: "default",
      in_emergency: "destructive",
      no_admission: "outline",
    };
    return variants[status] || "outline";
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search by name, phone, or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {query && results.length === 0 && !loading && (
          <p className="mt-2 text-sm text-muted-foreground">No patients found</p>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Searching...
        </div>
      )}

      {/* Results List */}
      {results.length > 0 && (
        <div className="space-y-2 border rounded-lg overflow-hidden">
          {results.map((patient) => (
            <div
              key={patient.id}
              className="p-3 border-b last:border-b-0 hover:bg-muted/50 transition cursor-pointer"
              onClick={() => handleResultClick(patient)}
            >
              {/* Header: Name and Status */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-foreground">{patient.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {patient.id.slice(0, 8)}
                  </p>
                </div>
                <Badge variant={getAdmissionStatusBadge(patient.admission_status)}>
                  {patient.admission_status === "no_admission"
                    ? "No admission"
                    : patient.admission_status}
                </Badge>
              </div>

              {/* Contact Info */}
              <div className="space-y-1 mb-3">
                {patient.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{patient.email}</span>
                  </div>
                )}
              </div>

              {/* Incident/Admission Info */}
              {(patient.incident_id || patient.admission_id) && (
                <div className="space-y-1 mb-3 text-xs text-muted-foreground">
                  {patient.incident_number && (
                    <p>
                      <strong>SOS:</strong> {patient.incident_number}
                    </p>
                  )}
                  {patient.admission_id && (
                    <p>
                      <strong>Admission:</strong> {patient.admission_id.slice(0, 8)}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {admissionId && patient.admission_status === "no_admission" && (
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLinkAdmission(patient);
                    }}
                    disabled={loading}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Link to this admission
                  </Button>
                )}

                {patient.admission_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to patient context panel
                      window.location.hash = `#/patient/${patient.user_id}`;
                    }}
                  >
                    View Profile
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!query && !results.length && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">
            {admissionId
              ? "Search for a patient to link to this admission"
              : "Search for a patient by name, phone, or email"}
          </p>
        </div>
      )}
    </div>
  );
}
