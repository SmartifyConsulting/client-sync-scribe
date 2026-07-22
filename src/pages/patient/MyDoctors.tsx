import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope, Search, Lock, UserMinus, MoreVertical, Building2, Ambulance, Star, EyeOff, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InviteDoctorDialog } from "@/components/patient/InviteDoctorDialog";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGES, COMMON_SPECIALTIES } from "@/lib/languages";
import { cn } from "@/lib/utils";

interface ProviderResult {
  id: string;
  kind: 'doctor' | 'hospital' | 'ambulance';
  full_name: string | null;
  specialty: string | null;
  address: string | null;
  phone: string | null;
  avatar_url: string | null;
  registration: string | null;
  about_me: string | null;
  preferred_language: string | null;
  stars: number;
  ownership?: string | null;
}

interface DoctorProfile {
  id: string;
  full_name: string | null;
  specialty: string | null;
  practice_address: string | null;
  mobile_number: string | null;
  avatar_url: string | null;
  practice_number: string | null;
  doctor_number: string | null;
  about_me?: string | null;
  preferred_language?: string | null;
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
  const [nameQuery, setNameQuery] = useState("");
  const [specialtyQuery, setSpecialtyQuery] = useState<string>("any");
  const [languageQuery, setLanguageQuery] = useState<string>("any");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ProviderResult[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [uninviteTarget, setUninviteTarget] = useState<DoctorAccess | null>(null);
  const [uninviteLoading, setUninviteLoading] = useState(false);
  const [detailsDoctor, setDetailsDoctor] = useState<ProviderResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sidebar filters for the connected-providers list (separate from the
  // "find a new provider" search above).
  const [filterSearch, setFilterSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("any");
  const [filterLanguage, setFilterLanguage] = useState<string>("any");
  const [filterAccessLevel, setFilterAccessLevel] = useState<string>("any");
  const [appliedFilters, setAppliedFilters] = useState({ search: "", specialty: "any", language: "any", accessLevel: "any" });
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc">("name-asc");

  const applyFilters = () => {
    setAppliedFilters({ search: filterSearch, specialty: filterSpecialty, language: filterLanguage, accessLevel: filterAccessLevel });
  };
  const clearFilters = () => {
    setFilterSearch(""); setFilterSpecialty("any"); setFilterLanguage("any"); setFilterAccessLevel("any");
    setAppliedFilters({ search: "", specialty: "any", language: "any", accessLevel: "any" });
  };

  const getAccessLevel = (permissions?: string[]): "full" | "limited" => {
    const filtered = (permissions || []).filter(p => p !== 'patient_info' && p !== 'patient_information');
    return filtered.length >= 4 ? "full" : "limited";
  };

  const matchesFilters = (access: DoctorAccess) => {
    const doctor = access.doctor;
    if (!doctor) return false;
    const q = appliedFilters.search.trim().toLowerCase();
    if (q && !(doctor.full_name?.toLowerCase().includes(q) || doctor.practice_number?.toLowerCase().includes(q))) return false;
    if (appliedFilters.specialty !== "any" && doctor.specialty !== appliedFilters.specialty) return false;
    if (appliedFilters.language !== "any" && doctor.preferred_language !== appliedFilters.language) return false;
    if (appliedFilters.accessLevel !== "any" && getAccessLevel(access.permissions) !== appliedFilters.accessLevel) return false;
    return true;
  };

  const sortAccess = (list: DoctorAccess[]) => {
    const sorted = [...list].sort((a, b) => (a.doctor?.full_name || "").localeCompare(b.doctor?.full_name || ""));
    return sortBy === "name-desc" ? sorted.reverse() : sorted;
  };

  const { data: doctorsData, isLoading } = useQuery({
    queryKey: ["patient-doctors-with-hidden"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { active: [] as DoctorAccess[], hidden: [] as DoctorAccess[], hiddenIds: new Set<string>() };

      const [{ data: accessData, error: accessError }, { data: hiddenRows }] = await Promise.all([
        supabase
          .from("doctor_patient_access")
          .select("*")
          .eq("patient_user_id", user.id),
        supabase
          .from("patient_hidden_doctors")
          .select("doctor_id")
          .eq("patient_user_id", user.id),
      ]);

      if (accessError) throw accessError;
      const hiddenIds = new Set<string>((hiddenRows ?? []).map((r: any) => r.doctor_id));
      if (!accessData || accessData.length === 0) {
        return { active: [], hidden: [], hiddenIds };
      }

      const doctorIds = accessData.map((a: any) => a.doctor_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, practice_address, mobile_number, avatar_url, practice_number, doctor_number, about_me, preferred_language")
        .in("id", doctorIds);

      if (profilesError) throw profilesError;

      const enriched = accessData.map((access: any) => ({
        ...access,
        doctor: profilesData?.find((p: any) => p.id === access.doctor_id),
      })) as DoctorAccess[];

      const active = enriched.filter((d) => d.is_active && !hiddenIds.has(d.doctor_id));
      const hidden = enriched.filter((d) => hiddenIds.has(d.doctor_id) || !d.is_active);
      return { active, hidden, hiddenIds };
    },
  });

  // General Practitioner — always shown in the list (by default), flagged
  // with whether they're a registered Holarc Health doctor or an external GP.
  const { data: gpInfo } = useQuery({
    queryKey: ["patient-gp-holarc-status"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: patientRow } = await supabase
        .from("patients")
        .select("general_practitioner")
        .eq("patient_user_id", user.id)
        .maybeSingle();
      const gpName = patientRow?.general_practitioner?.trim();
      if (!gpName) return null;
      const { data: match } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, avatar_url, practice_number")
        .eq("role", "doctor")
        .ilike("full_name", gpName)
        .maybeSingle();
      return { name: gpName, onHolarc: !!match, matchedProfile: match || null };
    },
  });

  const doctors = doctorsData?.active ?? [];
  const hiddenDoctors = doctorsData?.hidden ?? [];
  const hiddenIds = doctorsData?.hiddenIds ?? new Set<string>();

  const handleHide = async (access: DoctorAccess) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("patient_hidden_doctors").insert({
      patient_user_id: user.id,
      doctor_id: access.doctor_id,
    } as any);
    if (error && !error.message.includes("duplicate")) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Doctor hidden", description: "They won't appear in your active list. Historic records remain." });
    queryClient.invalidateQueries({ queryKey: ["patient-doctors-with-hidden"] });
  };

  const handleRestore = async (access: DoctorAccess) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Unhide
    await supabase
      .from("patient_hidden_doctors")
      .delete()
      .eq("patient_user_id", user.id)
      .eq("doctor_id", access.doctor_id);
    // If deactivated, re-activate
    if (!access.is_active) {
      await supabase
        .from("doctor_patient_access")
        .update({ is_active: true, revoked_at: null } as any)
        .eq("id", access.id);
    }
    toast({ title: "Doctor restored", description: "They're back in your active list." });
    queryClient.invalidateQueries({ queryKey: ["patient-doctors-with-hidden"] });
  };

  const handleSearch = useCallback(async () => {
    const name = nameQuery.trim();
    const spec = specialtyQuery === "any" ? "" : specialtyQuery;
    const lang = languageQuery === "any" ? "" : languageQuery;
    if (!name && !spec && !lang) {
      setSearchResults([]);
      setTotalFound(0);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .rpc("search_providers", { _name: name, _specialty: spec, _language: lang });

      if (error) throw error;

      const allResults = (data || []) as ProviderResult[];
      setTotalFound(allResults.length);
      const connectedIds = doctors?.map((d) => d.doctor_id) || [];
      setSearchResults(allResults.filter((d) => !(d.kind === 'doctor' && connectedIds.includes(d.id))));
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  }, [nameQuery, specialtyQuery, languageQuery, doctors]);

  // Debounced auto-search
  useEffect(() => {
    const timeout = setTimeout(() => handleSearch(), 350);
    return () => clearTimeout(timeout);
  }, [handleSearch]);

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

  const handleUninvite = async () => {
    if (!uninviteTarget) return;
    setUninviteLoading(true);
    try {
      await supabase
        .from("doctor_patient_access")
        .update({ is_active: false, revoked_at: new Date().toISOString() } as any)
        .eq("id", uninviteTarget.id);

      // Intentionally do NOT notify the doctor when a patient revokes access.
      toast({ title: "Doctor deactivated", description: "They no longer have live access. Historic records are preserved." });
      queryClient.invalidateQueries({ queryKey: ["patient-doctors-with-hidden"] });
      setUninviteTarget(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUninviteLoading(false);
    }
  };

  const DoctorRow = ({ access, doctor, permissions, mode }: { access: DoctorAccess; doctor: DoctorProfile; permissions?: string[]; mode: "active" | "hidden" }) => {
    const filteredPermissions = permissions?.filter(p => p !== 'patient_info' && p !== 'patient_information') || [];
    const accessLevel = getAccessLevel(permissions);

    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={doctor.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {doctor.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "DR"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-foreground truncate">{doctor.full_name || "Unknown Doctor"}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {doctor.specialty && (
                <Badge className={`text-xs font-medium border-0 ${getSpecialtyColor(doctor.specialty)}`}>
                  {doctor.specialty}
                </Badge>
              )}
              {doctor.practice_number && (
                <span className="text-xs text-muted-foreground">PR#: {doctor.practice_number}</span>
              )}
              {doctor.practice_address && (
                <span className="text-xs text-muted-foreground">· {doctor.practice_address.split(",")[0]}</span>
              )}
            </div>
            {mode === "hidden" && (
              <span className="text-xs text-muted-foreground italic">
                {!access.is_active ? "Deactivated" : "Hidden"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {mode === "active" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={accessLevel === "full" ? "default" : "secondary"}
                    className={`text-xs cursor-help ${accessLevel === "full" ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    {accessLevel === "full" ? "Full access" : "Limited"}
                  </Badge>
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
          {mode === "active" ? (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleHide(access)}
                      aria-label="Hide doctor"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Hide from your active list (keeps history)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setUninviteTarget(access)}
                      aria-label="Deactivate doctor"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Deactivate (revoke live access, keep history)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => handleRestore(access)}
            >
              <Eye className="h-3.5 w-3.5" /> Restore
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Healthcare Providers</h1>
            <p className="text-muted-foreground text-sm">
              Healthcare providers with access to your profile
            </p>
          </div>
        </div>
      )}

      {/* General Practitioner — shown by default, flagged with Holarc status */}
      {gpInfo && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={gpInfo.matchedProfile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {gpInfo.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{gpInfo.name}</p>
                <p className="text-xs text-muted-foreground">General Practitioner</p>
              </div>
            </div>
            <Badge
              variant={gpInfo.onHolarc ? "default" : "secondary"}
              className={cn("text-xs shrink-0", gpInfo.onHolarc && "bg-primary text-primary-foreground")}
            >
              {gpInfo.onHolarc ? "On Holarc Health" : "Not on Holarc Health"}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Doctor Search */}
      <Card>
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm">Find a Healthcare Provider on Holarc</CardTitle>
          <CardDescription className="text-xs">Filter by name, specialty, language — or any combination</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Doctor name, practice or registration #"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={specialtyQuery} onValueChange={setSpecialtyQuery}>
              <SelectTrigger><SelectValue placeholder="Any specialty" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="any">Any specialty</SelectItem>
                {COMMON_SPECIALTIES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={languageQuery} onValueChange={setLanguageQuery}>
              <SelectTrigger><SelectValue placeholder="Any language" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="any">Any language</SelectItem>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasSearched && (
            <div className="mt-4">
              {isSearching ? (
                <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
              ) : searchResults.length === 0 ? (
                 <p className="text-sm text-muted-foreground text-center py-4">
                   {totalFound > 0
                     ? "All matching providers are already on your profile."
                     : "No healthcare providers found matching your search."}
                 </p>
              ) : (
                <div className="space-y-4">
                  {(['doctor','hospital','ambulance'] as const).map((groupKind) => {
                    const groupRows = searchResults.filter((r) => r.kind === groupKind);
                    if (groupRows.length === 0) return null;
                    const groupLabel = groupKind === 'doctor' ? 'Doctors' : groupKind === 'hospital' ? 'Hospitals' : 'Emergency Responders';
                    const GroupIcon = groupKind === 'hospital' ? Building2 : groupKind === 'ambulance' ? Ambulance : Stethoscope;
                    return (
                      <div key={groupKind} className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <GroupIcon className="h-3.5 w-3.5 text-primary" />
                          {groupLabel} <span className="text-muted-foreground font-normal">({groupRows.length})</span>
                        </div>
                        <Table className="table-fixed w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[45%]">Provider</TableHead>
                              <TableHead className="w-[30%]">{groupKind === 'doctor' ? 'Specialty' : 'Type'}</TableHead>
                              <TableHead className="w-[25%]">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupRows.map((doctor) => {
                              const KindIcon = doctor.kind === 'hospital' ? Building2 : doctor.kind === 'ambulance' ? Ambulance : Stethoscope;
                              return (
                                <TableRow key={`${doctor.kind}-${doctor.id}`}>
                                  <TableCell className="p-2">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-7 w-7 shrink-0">
                                        <AvatarImage src={doctor.avatar_url || undefined} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                          <KindIcon className="h-3.5 w-3.5" />
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-medium text-foreground text-xs truncate">{doctor.full_name || "Unknown"}</span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          {Array.from({ length: Math.min(5, Math.max(0, Math.round(Number(doctor.stars) || 0))) }).map((_, i) => (
                                            <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                          ))}
                                        </span>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="p-2">
                                    {doctor.kind === 'doctor' && doctor.specialty ? (
                                      <Badge className={`text-xs font-medium border-0 ${getSpecialtyColor(doctor.specialty)}`}>
                                        {doctor.specialty}
                                      </Badge>
                                    ) : (
                                      <div className="flex flex-col gap-0.5">
                                        <Badge variant="outline" className="text-xs capitalize">{doctor.kind}</Badge>
                                        {doctor.ownership && (
                                          <Badge
                                            variant="outline"
                                            className={`text-[9px] capitalize ${doctor.ownership === 'public' ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'}`}
                                          >
                                            {doctor.ownership}
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <div className="flex items-center gap-1">
                                      {doctor.kind === 'doctor' && (
                                        <InviteDoctorDialog
                                          prefillDoctorId={doctor.id}
                                          prefillDoctorName={doctor.full_name || ""}
                                          prefillAvatarUrl={doctor.avatar_url || ""}
                                          prefillSpecialty={doctor.specialty || ""}
                                        />
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => setDetailsDoctor(doctor)}
                                        aria-label="View details"
                                      >
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Doctors — Sidebar filters + Active / Hidden list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : doctors.length === 0 && hiddenDoctors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Stethoscope className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No healthcare providers on your profile</h3>
             <p className="text-muted-foreground text-center mt-2 max-w-md">
               Search for a healthcare provider above or use the invite button to connect.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-4">
          {/* Sidebar filters */}
          <Card className="h-fit">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-primary-dark">Filters</h3>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground underline" onClick={clearFilters}>
                  Clear all
                </button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8 h-9 text-sm"
                    placeholder="Search providers..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Specialty</Label>
                <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Specialties" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="any">All Specialties</SelectItem>
                    {COMMON_SPECIALTIES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Language</Label>
                <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Languages" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="any">All Languages</SelectItem>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Access Level</Label>
                <Select value={filterAccessLevel} onValueChange={setFilterAccessLevel}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Access Levels" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All Access Levels</SelectItem>
                    <SelectItem value="full">Full access</SelectItem>
                    <SelectItem value="limited">Limited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={applyFilters}>Apply Filters</Button>
            </CardContent>
          </Card>

          {/* Provider list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Healthcare Providers</h2>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name-asc" | "name-desc")}>
                <SelectTrigger className="h-9 w-[160px] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Tabs defaultValue="active" className="w-full">
              <TabsList>
                <TabsTrigger value="active">Active ({doctors.length})</TabsTrigger>
                <TabsTrigger value="hidden">Hidden ({hiddenDoctors.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="space-y-2 mt-3">
                {doctors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No active providers. Check the Hidden tab to restore one.</p>
                ) : sortAccess(doctors).filter(matchesFilters).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No providers match your filters.</p>
                ) : (
                  sortAccess(doctors).filter(matchesFilters).map((access) =>
                    access.doctor ? (
                      <DoctorRow key={access.id} access={access} doctor={access.doctor} permissions={access.permissions} mode="active" />
                    ) : null
                  )
                )}
              </TabsContent>
              <TabsContent value="hidden" className="space-y-2 mt-3">
                {hiddenDoctors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No hidden or deactivated providers. Historic records always remain visible elsewhere.</p>
                ) : sortAccess(hiddenDoctors).filter(matchesFilters).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No providers match your filters.</p>
                ) : (
                  sortAccess(hiddenDoctors).filter(matchesFilters).map((access) =>
                    access.doctor ? (
                      <DoctorRow key={access.id} access={access} doctor={access.doctor} permissions={access.permissions} mode="hidden" />
                    ) : null
                  )
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Uninvite Confirmation Dialog */}
      <Dialog open={!!uninviteTarget} onOpenChange={() => setUninviteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Healthcare Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {uninviteTarget?.doctor?.full_name || "this doctor"} from your healthcare providers? They will lose access to your health information.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUninviteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleUninvite} disabled={uninviteLoading}>
              {uninviteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserMinus className="h-4 w-4 mr-2" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Doctor Details (credentials + About Me) */}
      <Dialog open={!!detailsDoctor} onOpenChange={(o) => !o && setDetailsDoctor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={detailsDoctor?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {detailsDoctor?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "DR"}
                </AvatarFallback>
              </Avatar>
              <span>{detailsDoctor?.full_name || "Provider"}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, Math.max(0, Math.round(Number(detailsDoctor?.stars) || 0))) }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-muted-foreground ml-1 capitalize">({detailsDoctor?.kind})</span>
            </div>
            {detailsDoctor?.specialty && <div><span className="text-muted-foreground">Specialty:</span> {detailsDoctor.specialty}</div>}
            {detailsDoctor?.registration && <div><span className="text-muted-foreground">Registration #:</span> {detailsDoctor.registration}</div>}
            {detailsDoctor?.preferred_language && (
              <div><span className="text-muted-foreground">Language:</span> {LANGUAGES.find(l => l.code === detailsDoctor.preferred_language)?.name || detailsDoctor.preferred_language}</div>
            )}
            {detailsDoctor?.address && <div><span className="text-muted-foreground">Address:</span> {detailsDoctor.address}</div>}
            {detailsDoctor?.phone && <div><span className="text-muted-foreground">Phone:</span> {detailsDoctor.phone}</div>}
            <div className="pt-2 border-t">
              <div className="text-muted-foreground mb-1 font-medium">About Me</div>
              {detailsDoctor?.about_me ? (
                <p className="whitespace-pre-wrap leading-relaxed">{detailsDoctor.about_me}</p>
              ) : (
                <p className="italic text-muted-foreground">Not provided yet.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
