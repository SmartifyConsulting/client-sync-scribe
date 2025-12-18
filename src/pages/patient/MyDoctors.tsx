import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Stethoscope, MapPin, Phone } from "lucide-react";

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
  const { data: doctors, isLoading } = useQuery({
    queryKey: ["patient-doctors"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get all doctor access records for this patient
      const { data: accessData, error: accessError } = await supabase
        .from("doctor_patient_access")
        .select("*")
        .eq("patient_user_id", user.id)
        .eq("is_active", true);

      if (accessError) throw accessError;
      if (!accessData || accessData.length === 0) return [];

      // Get doctor profiles for each access record
      const doctorIds = accessData.map((a) => a.doctor_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, practice_address, mobile_number, avatar_url, practice_number, doctor_number")
        .in("id", doctorIds);

      if (profilesError) throw profilesError;

      // Combine access data with profile data
      return accessData.map((access) => ({
        ...access,
        doctor: profilesData?.find((p) => p.id === access.doctor_id),
      })) as DoctorAccess[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Doctors</h1>
        <p className="text-muted-foreground mt-1">
          Healthcare providers with access to your profile
        </p>
      </div>

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
                When doctors are granted access to your profile, they will appear here. 
                You can manage doctor access from the Access page.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {doctors.map((access) => (
              <Card key={access.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={access.doctor?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {access.doctor?.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "DR"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {access.doctor?.full_name || "Unknown Doctor"}
                      </CardTitle>
                      {access.doctor?.specialty && (
                        <CardDescription className="mt-0.5">
                          {access.doctor.specialty}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {access.doctor?.practice_address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{access.doctor.practice_address}</span>
                    </div>
                  )}
                  {access.doctor?.mobile_number && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{access.doctor.mobile_number}</span>
                    </div>
                  )}
                  {access.doctor?.practice_number && (
                    <div className="text-xs text-muted-foreground">
                      Practice #: {access.doctor.practice_number}
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Access granted to:</p>
                    <div className="flex flex-wrap gap-1">
                      {access.permissions.map((permission) => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {permission.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  );
}
