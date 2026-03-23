import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope, Search, Lock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InviteDoctorDialog } from "@/components/patient/InviteDoctorDialog";

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

export default function MyDoctors({ hideHeader = false }: { hideHeader?: boolean }) {
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

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) return;
    setIsSearching(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, practice_address, mobile_number, avatar_url, practice_number, doctor_number")
        .eq("role", "doctor")
        .or(`full_name.ilike.%${query}%,practice_number.eq.${query}`);

      if (error) throw error;

      const connectedIds = doctors?.map((d) => d.doctor_id) || [];
      setSearchResults((data || []).filter((d) => !connectedIds.includes(d.id)));
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  }, [doctors]);

  // Debounced auto-search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    const timeout = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, handleSearch]);

  const getSpecialtyColor = (specialty: string): string => {
    const s = specialty.toLowerCase();
    if (s.includes("cardio")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    if (s.includes("dent")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    if (s.includes("derma")) return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
    if (s.includes("ortho")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
    if (s.includes("neuro")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
    if (s.includes("paed") || s.includes("pedia")) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
    if (s.includes("psych")) return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
    if (s.includes("general") || s.includes("gp") || s.includes("family")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300";
  };

  const formatPermission = (p: string) => p.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const DoctorTableRow = ({ doctor, permissions }: { doctor: DoctorProfile; permissions?: string[] }) => {
    const filteredPermissions = permissions?.filter(p => p !== 'patient_info' && p !== 'patient_information') || [];

    return (
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={doctor.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {doctor.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "DR"}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">{doctor.full_name || "Unknown Doctor"}</span>
          </div>
        </TableCell>
        <TableCell>
          {doctor.specialty && (
            <Badge className={`text-xs font-medium border-0 ${getSpecialtyColor(doctor.specialty)}`}>
              {doctor.specialty}
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground">{doctor.mobile_number || "—"}</TableCell>
        <TableCell className="text-muted-foreground">{doctor.practice_number || "—"}</TableCell>
        <TableCell>
          {filteredPermissions.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="h-4 w-4 text-primary cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[200px]">
                  <p className="text-xs font-semibold mb-1">Access granted:</p>
                  <ul className="text-xs space-y-0.5">
                    {filteredPermissions.map(p => (
                      <li key={p}>• {formatPermission(p)}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
       {!hideHeader ? (
          <div>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">My Doctors</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Healthcare providers with access to your profile
            </p>
          </div>
        ) : <div />}
        <InviteDoctorDialog />
      </div>

      {/* Doctor Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Find a Doctor on Holarc</CardTitle>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Specialty</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Practice #</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((doctor) => (
                      <TableRow key={doctor.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={doctor.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {doctor.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "DR"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{doctor.full_name || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {doctor.specialty && (
                            <Badge className={`text-xs font-medium border-0 ${getSpecialtyColor(doctor.specialty)}`}>
                              {doctor.specialty}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{doctor.mobile_number || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{doctor.practice_number || "—"}</TableCell>
                        <TableCell>
                          <InviteDoctorDialog
                            prefillPracticeNumber={doctor.practice_number || ""}
                            prefillRegistrationNumber={doctor.doctor_number || ""}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Practice #</TableHead>
                  <TableHead className="w-[50px]">Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.map((access) =>
                  access.doctor ? (
                    <DoctorTableRow key={access.id} doctor={access.doctor} permissions={access.permissions} />
                  ) : null
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
