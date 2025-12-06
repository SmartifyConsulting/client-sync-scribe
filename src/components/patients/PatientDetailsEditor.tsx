import { useState, useEffect } from "react";
import { Pencil, Save, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Patient } from "@/hooks/usePatients";

interface PatientDetailsEditorProps {
  patient: Patient;
  onSave: (updates: Partial<Patient>) => Promise<any>;
}

export function PatientDetailsEditor({ patient, onSave }: PatientDetailsEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    occupation: "",
    employer: "",
    referred_by: "",
    physical_address: "",
    postal_address: "",
    same_as_physical: false,
    medical_aid: "",
    medical_insurance_product: "",
    medical_aid_number: "",
    primary_member: "",
    claims_email: "",
    general_practitioner: "",
    allergies: "",
    next_of_kin_name: "",
    next_of_kin_phone: "",
    next_of_kin_email: "",
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        name: patient.name || "",
        email: patient.email || "",
        phone: patient.phone || "",
        dob: patient.dob || "",
        occupation: patient.occupation || "",
        employer: patient.employer || "",
        referred_by: patient.referred_by || "",
        physical_address: patient.physical_address || "",
        postal_address: patient.postal_address || "",
        same_as_physical: patient.same_as_physical || false,
        medical_aid: patient.medical_aid || "",
        medical_insurance_product: (patient as any).medical_insurance_product || "",
        medical_aid_number: patient.medical_aid_number || "",
        primary_member: patient.primary_member || "",
        claims_email: (patient as any).claims_email || "",
        general_practitioner: patient.general_practitioner || "",
        allergies: (patient as any).allergies || "",
        next_of_kin_name: patient.next_of_kin_name || "",
        next_of_kin_phone: patient.next_of_kin_phone || "",
        next_of_kin_email: patient.next_of_kin_email || "",
      });
    }
  }, [patient]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      dob: formData.dob || null,
      occupation: formData.occupation || null,
      employer: formData.employer || null,
      referred_by: formData.referred_by || null,
      physical_address: formData.physical_address || null,
      postal_address: formData.same_as_physical ? formData.physical_address : (formData.postal_address || null),
      same_as_physical: formData.same_as_physical,
      medical_aid: formData.medical_aid || null,
      medical_aid_number: formData.medical_aid_number || null,
      primary_member: formData.primary_member || null,
      general_practitioner: formData.general_practitioner || null,
      next_of_kin_name: formData.next_of_kin_name || null,
      next_of_kin_phone: formData.next_of_kin_phone || null,
      next_of_kin_email: formData.next_of_kin_email || null,
      // These fields need to be cast as they may not be in the Patient type yet
      ...({
        medical_insurance_product: formData.medical_insurance_product || null,
        claims_email: formData.claims_email || null,
        allergies: formData.allergies || null,
      } as any),
    });
    setSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset form data to patient values
    setFormData({
      name: patient.name || "",
      email: patient.email || "",
      phone: patient.phone || "",
      dob: patient.dob || "",
      occupation: patient.occupation || "",
      employer: patient.employer || "",
      referred_by: patient.referred_by || "",
      physical_address: patient.physical_address || "",
      postal_address: patient.postal_address || "",
      same_as_physical: patient.same_as_physical || false,
      medical_aid: patient.medical_aid || "",
      medical_insurance_product: (patient as any).medical_insurance_product || "",
      medical_aid_number: patient.medical_aid_number || "",
      primary_member: patient.primary_member || "",
      claims_email: (patient as any).claims_email || "",
      general_practitioner: patient.general_practitioner || "",
      allergies: (patient as any).allergies || "",
      next_of_kin_name: patient.next_of_kin_name || "",
      next_of_kin_phone: patient.next_of_kin_phone || "",
      next_of_kin_email: patient.next_of_kin_email || "",
    });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-8">
        {/* Header with Edit Button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Patient Details</h2>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </div>

        {/* Personal Information */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Personal Information</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="mt-1 text-foreground">{patient.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="mt-1 text-foreground">
                {patient.dob ? format(new Date(patient.dob), "MMMM d, yyyy") : "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="mt-1 text-foreground">{patient.email || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="mt-1 text-foreground">{patient.phone || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Occupation</p>
              <p className="mt-1 text-foreground">{patient.occupation || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Employer</p>
              <p className="mt-1 text-foreground">{patient.employer || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Referred By</p>
              <p className="mt-1 text-foreground">{patient.referred_by || "Not provided"}</p>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Address</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Physical Address</p>
              <p className="mt-1 text-foreground">{patient.physical_address || patient.address || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Postal Address</p>
              <p className="mt-1 text-foreground">
                {patient.same_as_physical ? "Same as physical address" : (patient.postal_address || "Not provided")}
              </p>
            </div>
          </div>
        </div>

        {/* Medical Insurance Information */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Medical Insurance</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Medical Insurance Provider</p>
              <p className="mt-1 text-foreground">{patient.medical_aid || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Medical Insurance Product</p>
              <p className="mt-1 text-foreground">{(patient as any).medical_insurance_product || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Medical Insurance Number</p>
              <p className="mt-1 text-foreground">{patient.medical_aid_number || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Primary Member</p>
              <p className="mt-1 text-foreground">{patient.primary_member || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Claims Email</p>
              <p className="mt-1 text-foreground">{(patient as any).claims_email || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">General Practitioner</p>
              <p className="mt-1 text-foreground">{patient.general_practitioner || "Not provided"}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Allergies
              </p>
              <p className="mt-1 text-foreground">{(patient as any).allergies || "None recorded"}</p>
            </div>
          </div>
        </div>

        {/* Next of Kin */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Next of Kin</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="mt-1 text-foreground">{patient.next_of_kin_name || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="mt-1 text-foreground">{patient.next_of_kin_phone || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="mt-1 text-foreground">{patient.next_of_kin_email || "Not provided"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-8">
      {/* Header with Save/Cancel Buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Edit Patient Details</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleCancel} disabled={saving}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Personal Information */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Personal Information</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Patient name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="patient@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              placeholder="Job title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employer">Employer</Label>
            <Input
              id="employer"
              value={formData.employer}
              onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
              placeholder="Company name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referred_by">Referred By</Label>
            <Input
              id="referred_by"
              value={formData.referred_by}
              onChange={(e) => setFormData({ ...formData, referred_by: e.target.value })}
              placeholder="Referral source"
            />
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Address</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="physical_address">Physical Address</Label>
            <Textarea
              id="physical_address"
              value={formData.physical_address}
              onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
              placeholder="Enter physical address"
              rows={2}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="same_as_physical"
              checked={formData.same_as_physical}
              onCheckedChange={(checked) => setFormData({ ...formData, same_as_physical: checked as boolean })}
            />
            <Label htmlFor="same_as_physical" className="text-sm">Postal address same as physical address</Label>
          </div>
          {!formData.same_as_physical && (
            <div className="space-y-2">
              <Label htmlFor="postal_address">Postal Address</Label>
              <Textarea
                id="postal_address"
                value={formData.postal_address}
                onChange={(e) => setFormData({ ...formData, postal_address: e.target.value })}
                placeholder="Enter postal address"
                rows={2}
              />
            </div>
          )}
        </div>
      </div>

      {/* Medical Insurance Information */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Medical Insurance</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="medical_aid">Medical Insurance Provider</Label>
            <Input
              id="medical_aid"
              value={formData.medical_aid}
              onChange={(e) => setFormData({ ...formData, medical_aid: e.target.value })}
              placeholder="Insurance provider"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="medical_insurance_product">Medical Insurance Product</Label>
            <Input
              id="medical_insurance_product"
              value={formData.medical_insurance_product}
              onChange={(e) => setFormData({ ...formData, medical_insurance_product: e.target.value })}
              placeholder="e.g., Executive Plan"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="medical_aid_number">Medical Insurance Number</Label>
            <Input
              id="medical_aid_number"
              value={formData.medical_aid_number}
              onChange={(e) => setFormData({ ...formData, medical_aid_number: e.target.value })}
              placeholder="Member number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primary_member">Primary Member</Label>
            <Input
              id="primary_member"
              value={formData.primary_member}
              onChange={(e) => setFormData({ ...formData, primary_member: e.target.value })}
              placeholder="Primary member name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="claims_email">Claims Email</Label>
            <Input
              id="claims_email"
              type="email"
              value={formData.claims_email}
              onChange={(e) => setFormData({ ...formData, claims_email: e.target.value })}
              placeholder="claims@insurance.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="general_practitioner">General Practitioner</Label>
            <Input
              id="general_practitioner"
              value={formData.general_practitioner}
              onChange={(e) => setFormData({ ...formData, general_practitioner: e.target.value })}
              placeholder="GP name"
            />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="allergies" className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              Allergies
            </Label>
            <Textarea
              id="allergies"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              placeholder="List any allergies (medications, food, etc.)"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Next of Kin */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Next of Kin</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="next_of_kin_name">Name</Label>
            <Input
              id="next_of_kin_name"
              value={formData.next_of_kin_name}
              onChange={(e) => setFormData({ ...formData, next_of_kin_name: e.target.value })}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next_of_kin_phone">Phone</Label>
            <Input
              id="next_of_kin_phone"
              value={formData.next_of_kin_phone}
              onChange={(e) => setFormData({ ...formData, next_of_kin_phone: e.target.value })}
              placeholder="Phone number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next_of_kin_email">Email</Label>
            <Input
              id="next_of_kin_email"
              type="email"
              value={formData.next_of_kin_email}
              onChange={(e) => setFormData({ ...formData, next_of_kin_email: e.target.value })}
              placeholder="Email address"
            />
          </div>
        </div>
      </div>
    </div>
  );
}