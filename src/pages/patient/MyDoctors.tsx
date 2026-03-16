import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope, MapPin, Phone, Search, UserPlus } from "lucide-react";
import { InviteDoctorDialog } from "@/components/patient/InviteDoctorDialog";
import { RequestConnectionButton } from "@/components/patients/RequestConnectionButton";

interface DoctorProfile {
  id: string;
  full_name: string | null;
  specialty: string | null;
  practice_address: string | null;
  mobile_number: string | null;
  avatar_url: string | null;
  practice_number: string | null;
  doctor_number: string | null;
}

interface DoctorAccess {
  id: string;
  doctor_id: string;
  permissions: string[];
  granted_at: string;
  is_active: boolean;
  doctor?: DoctorProfile;
}

export default function MyDoctors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DoctorProfile[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const { data: doctors, isLoading } = useQuery({
    queryKey: ["patient-doctors"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: accessData, error: accessError } = await supabase
        .from("doctor_patient_access")
        .select("*")
        .eq("patient_user_id", user.id)
        .eq("is_active", true);

      if (accessError) throw accessError;
      if (!accessData || accessData.length === 0) return [];

      const doctorIds = accessData.map((a) => a.doctor_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, practice_address, mobile_number, avatar_url, practice_number, doctor_number")
        .in("id", doctorIds);

      if (profilesError) throw profilesError;

      return accessData.map((access) => ({
        ...access,
        doctor: profilesData?.find((p) => p.id === access.doctor_id),
      })) as DoctorAccess[];
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, practice_address, mobile_number, avatar_url, practice_number, doctor_number")
        .eq("role", "doctor")
        .or(`full_name.ilike.%${searchQuery}%,practice_number.eq.${searchQuery}`);

      if (error) throw error;

      // Filter out doctors already connected
      const connectedIds = doctors?.map((d) => d.doctor_id) || [];
      setSearchResults((data || []).filter((d) => !connectedIds.includes(d.id)));
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const DoctorCard = ({ doctor, permissions }: { doctor: DoctorProfile; permissions?: string[] }) => (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={doctor.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {doctor.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "DR"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">
              {doctor.full_name || "Unknown Doctor"}
            </CardTitle>
            {doctor.specialty && (
              <CardDescription className="mt-0.5">
                {doctor.specialty}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {doctor.practice_address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{doctor.practice_address}</span>
          </div>
        )}
        {doctor.mobile_number && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <span>{doctor.mobile_number}</span>
          </div>
        )}
        {doctor.practice_number && (
          <div className="text-xs text-muted-foreground">
            Practice #: {doctor.practice_number}
          </div>
        )}
        
        {permissions ? (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Access granted to:</p>
            <div className="flex flex-wrap gap-1">
              {permissions.map((permission) => (
                <Badge key={permission} variant="secondary" className="text-xs">
                  {permission.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-border">
            <RequestConnectionButton
              doctorRegistrationNumber={doctor.doctor_number || ""}
              doctorPracticeNumber={doctor.practice_number || ""}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Doctors</h1>
          <p className="text-muted-foreground mt-1">
            Healthcare providers with access to your profile
          </p>
        </div>
        <InviteDoctorDialog />
      </div>

      {/* Doctor Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Find a Doctor on MediPad</CardTitle>
          <CardDescription>Search by full name or practice number</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or practice number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          {hasSearched && (
            <div className="mt-4">
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No doctors found matching your search.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {searchResults.map((doctor) => (
                    <DoctorCard key={doctor.id} doctor={doctor} />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Doctors */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !doctors || doctors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Stethoscope className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No doctors on your profile</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-md">
              Search for a doctor above or use the invite button to connect with your healthcare provider.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {doctors.map((access) =>
            access.doctor ? (
              <DoctorCard key={access.id} doctor={access.doctor} permissions={access.permissions} />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
