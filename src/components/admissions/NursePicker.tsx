import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Nurse {
  id: string;
  full_name: string;
  status: string;
  role_title: string | null;
}

interface Props {
  hospitalId: string | null | undefined;
  value: string | null;
  onChange: (nurse: { id: string; name: string } | null) => void;
  required?: boolean;
  label?: string;
}

/**
 * Dropdown picker for selecting a nurse on an admission record.
 * Active nurses are shown first; inactive (unregistered) nurses are listed
 * with an "(inactive)" suffix and can still be selected so their Vulas accrue.
 */
export function NursePicker({ hospitalId, value, onChange, required, label = "Nurse" }: Props) {
  const { data: nurses = [], isLoading } = useQuery({
    queryKey: ["hospital-nurses", hospitalId],
    enabled: !!hospitalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_nurses" as any)
        .select("id, full_name, status, role_title")
        .eq("hospital_id", hospitalId!)
        .order("status", { ascending: true }) // active before inactive
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data as unknown as Nurse[]) ?? [];
    },
  });

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && " *"}
      </Label>
      <Select
        value={value ?? ""}
        onValueChange={(id) => {
          const picked = nurses.find((n) => n.id === id);
          onChange(picked ? { id: picked.id, name: picked.full_name } : null);
        }}
        disabled={!hospitalId || isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={!hospitalId ? "No hospital linked" : isLoading ? "Loading..." : "Select a nurse"} />
        </SelectTrigger>
        <SelectContent>
          {nurses.map((n) => (
            <SelectItem key={n.id} value={n.id}>
              {n.full_name}
              {n.role_title ? ` Â· ${n.role_title}` : ""}
              {n.status !== "active" && " (inactive)"}
            </SelectItem>
          ))}
          {!nurses.length && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No nurses on roster yet.</div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

