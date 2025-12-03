import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Filter, MoreVertical, Mail, Phone, Loader2, Edit3, Trash2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePatients } from "@/hooks/usePatients";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Patients() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { patients, loading, createPatient, deletePatient } = usePatients();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    status: "active",
    physical_address: "",
    postal_address: "",
    same_as_physical: false,
    referred_by: "",
    employer: "",
    occupation: "",
    medical_aid: "",
    medical_aid_number: "",
    primary_member: "",
    next_of_kin_name: "",
    next_of_kin_phone: "",
    next_of_kin_email: "",
    general_practitioner: "",
  });
  const [creating, setCreating] = useState(false);

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePatient = async () => {
    if (!newPatient.name.trim()) {
      toast({
        title: "Error",
        description: "Patient name is required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const result = await createPatient({
      name: newPatient.name,
      email: newPatient.email || null,
      phone: newPatient.phone || null,
      dob: null,
      address: null,
      notes: newPatient.notes || null,
      status: newPatient.status,
      physical_address: newPatient.physical_address || null,
      postal_address: newPatient.same_as_physical ? newPatient.physical_address : (newPatient.postal_address || null),
      same_as_physical: newPatient.same_as_physical,
      referred_by: newPatient.referred_by || null,
      employer: newPatient.employer || null,
      occupation: newPatient.occupation || null,
      medical_aid: newPatient.medical_aid || null,
      medical_aid_number: newPatient.medical_aid_number || null,
      primary_member: newPatient.primary_member || null,
      next_of_kin_name: newPatient.next_of_kin_name || null,
      next_of_kin_phone: newPatient.next_of_kin_phone || null,
      next_of_kin_email: newPatient.next_of_kin_email || null,
      general_practitioner: newPatient.general_practitioner || null,
    });

    if (result) {
      setIsDialogOpen(false);
      setNewPatient({
        name: "", email: "", phone: "", notes: "", status: "active",
        physical_address: "", postal_address: "", same_as_physical: false,
        referred_by: "", employer: "", occupation: "", medical_aid: "",
        medical_aid_number: "", primary_member: "", next_of_kin_name: "",
        next_of_kin_phone: "", next_of_kin_email: "", general_practitioner: "",
      });
    }
    setCreating(false);
  };

  const handleDeletePatient = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      await deletePatient(id);
    }
  };

  const handleStartSession = (patientId: string) => {
    navigate(`/sessions?patient=${patientId}`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patients</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your patient profiles and history
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Add New Patient</DialogTitle>
              <DialogDescription>Enter patient information below</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6 pt-4">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-foreground">Name *</label>
                      <Input
                        placeholder="Patient name"
                        value={newPatient.name}
                        onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Email</label>
                      <Input
                        type="email"
                        placeholder="patient@email.com"
                        value={newPatient.email}
                        onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Phone</label>
                      <Input
                        placeholder="+1 (555) 123-4567"
                        value={newPatient.phone}
                        onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Address Information</h3>
                  <div>
                    <label className="text-sm font-medium text-foreground">Physical Address</label>
                    <Textarea
                      placeholder="Enter physical address"
                      value={newPatient.physical_address}
                      onChange={(e) => setNewPatient({ ...newPatient, physical_address: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sameAsPhysical"
                      checked={newPatient.same_as_physical}
                      onCheckedChange={(checked) => setNewPatient({ ...newPatient, same_as_physical: checked as boolean })}
                    />
                    <label htmlFor="sameAsPhysical" className="text-sm text-muted-foreground">
                      Postal address same as physical address
                    </label>
                  </div>
                  {!newPatient.same_as_physical && (
                    <div>
                      <label className="text-sm font-medium text-foreground">Postal Address</label>
                      <Textarea
                        placeholder="Enter postal address"
                        value={newPatient.postal_address}
                        onChange={(e) => setNewPatient({ ...newPatient, postal_address: e.target.value })}
                        rows={2}
                      />
                    </div>
                  )}
                </div>

                {/* Employment Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Employment Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Employer</label>
                      <Input
                        placeholder="Employer name"
                        value={newPatient.employer}
                        onChange={(e) => setNewPatient({ ...newPatient, employer: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Occupation</label>
                      <Input
                        placeholder="Occupation"
                        value={newPatient.occupation}
                        onChange={(e) => setNewPatient({ ...newPatient, occupation: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Medical Aid Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Medical Aid Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Medical Aid</label>
                      <Input
                        placeholder="Medical aid provider"
                        value={newPatient.medical_aid}
                        onChange={(e) => setNewPatient({ ...newPatient, medical_aid: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Medical Aid Number</label>
                      <Input
                        placeholder="Member number"
                        value={newPatient.medical_aid_number}
                        onChange={(e) => setNewPatient({ ...newPatient, medical_aid_number: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-foreground">Primary Member</label>
                      <Input
                        placeholder="Primary member name"
                        value={newPatient.primary_member}
                        onChange={(e) => setNewPatient({ ...newPatient, primary_member: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Medical Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">General Practitioner</label>
                      <Input
                        placeholder="GP name"
                        value={newPatient.general_practitioner}
                        onChange={(e) => setNewPatient({ ...newPatient, general_practitioner: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Referred By</label>
                      <Input
                        placeholder="Referral source"
                        value={newPatient.referred_by}
                        onChange={(e) => setNewPatient({ ...newPatient, referred_by: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Next of Kin */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-2">Next of Kin</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-foreground">Name and Surname</label>
                      <Input
                        placeholder="Full name"
                        value={newPatient.next_of_kin_name}
                        onChange={(e) => setNewPatient({ ...newPatient, next_of_kin_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Phone</label>
                      <Input
                        placeholder="Phone number"
                        value={newPatient.next_of_kin_phone}
                        onChange={(e) => setNewPatient({ ...newPatient, next_of_kin_phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Email</label>
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={newPatient.next_of_kin_email}
                        onChange={(e) => setNewPatient({ ...newPatient, next_of_kin_email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm font-medium text-foreground">Notes</label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={newPatient.notes}
                    onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button onClick={handleCreatePatient} className="w-full" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Patient
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Patient List */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? "No patients found matching your search" : "No patients yet. Add your first patient!"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                    Added
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPatients.map((patient, index) => (
                  <tr
                    key={patient.id}
                    className="group transition-colors hover:bg-muted/30"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-4">
                      <Link
                        to={`/patients/${patient.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-medium">
                          {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {patient.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {patient.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {patient.email}
                          </div>
                        )}
                        {patient.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {patient.phone}
                          </div>
                        )}
                        {!patient.email && !patient.phone && (
                          <span className="text-sm text-muted-foreground">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(patient.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                          patient.status === "active"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {patient.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartSession(patient.id)}>
                            <Clock className="mr-2 h-4 w-4" />
                            Start Session
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/patients/${patient.id}`)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeletePatient(patient.id, patient.name)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Patient
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}