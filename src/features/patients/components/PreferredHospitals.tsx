import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { SectionHeader } from "@/features/patients/components/sectionStyles";
import { Search, Building2, Plus, X, Loader2 } from "lucide-react";

export interface PreferredHospital {
  id: string;
  name: string;
  city?: string | null;
}

interface Props {
  value: PreferredHospital[];
  onChange: (next: PreferredHospital[]) => void;
  readOnly?: boolean;
}

export function PreferredHospitals({ value, onChange, readOnly }: Props) {
  const [search, setSearch] = useState("");

  const { data: hospitals, isLoading } = useQuery({
    queryKey: ["registered-hospitals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holarchelp_hospitals")
        .select("id, name, city")
        .eq("status", "approved")
        .order("name");
      if (error) throw error;
      return (data || []) as PreferredHospital[];
    },
  });

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return (hospitals || [])
      .filter((h) => h.name?.toLowerCase().includes(q) || (h.city || "").toLowerCase().includes(q))
      .filter((h) => !value.some((v) => v.id === h.id))
      .slice(0, 8);
  }, [hospitals, search, value]);

  return (
    <Collapsible defaultOpen className="rounded-xl border border-border bg-card overflow-hidden">
      <SectionHeader icon={Building2} label="Preferred Hospitals" />
      <CollapsibleContent className="p-3 space-y-3">
        <p className="text-xs text-muted-foreground">
          Hospitals you would like to be taken to in an emergency
        </p>

        {!readOnly && (
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search registered hospitals..."
              className="pl-8 h-9 text-xs"
            />
            {search.trim() && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : results.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-muted-foreground">No hospitals found</p>
                ) : (
                  results.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        onChange([...value, h]);
                        setSearch("");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
                    >
                      <Plus className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-foreground">{h.name}</span>
                      {h.city && <span className="text-muted-foreground">· {h.city}</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border border-border/60 overflow-hidden">
          {value.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">No preferred hospitals selected</p>
          ) : (
            value.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 border-b border-border/50 px-3 py-2 last:border-b-0"
              >
                <Building2 className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{h.name}</p>
                  {h.city && <p className="truncate text-xs text-muted-foreground">{h.city}</p>}
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onChange(value.filter((v) => v.id !== h.id))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
