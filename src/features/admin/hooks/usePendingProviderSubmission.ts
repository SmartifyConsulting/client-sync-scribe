import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PendingProviderSubmission {
  id: string;
  kind: "hospital" | "ambulance";
  status: string;
  org_name: string;
  registration_number: string | null;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  admin_full_name: string | null;
  admin_email: string | null;
  admin_phone: string | null;
  directors: Array<{ full_name: string; role?: string }>;
  license_file_path: string | null;
  license_file_mime: string | null;
  license_file_size_bytes: number | null;
  rejection_reason: string | null;
  created_at: string;
}

export function usePendingProviderSubmission(ownerUserId: string | null | undefined) {
  return useQuery({
    queryKey: ["pending-provider-submission", ownerUserId],
    enabled: !!ownerUserId,
    queryFn: async (): Promise<PendingProviderSubmission | null> => {
      if (!ownerUserId) return null;
      const [hospitalRes, ambRes] = await Promise.all([
        supabase
          .from("holarchelp_hospitals" as any)
          .select("id, status, name, registration_number, address, contact_email, contact_phone, admin_full_name, admin_email, admin_phone, directors, license_file_path, license_file_mime, license_file_size_bytes, rejection_reason, created_at")
          .eq("owner_id", ownerUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("holarchelp_ambulance_providers" as any)
          .select("id, status, company_name, registration_number, base_address, contact_email, contact_phone, admin_full_name, admin_email, admin_phone, directors, license_file_path, license_file_mime, license_file_size_bytes, rejection_reason, created_at")
          .eq("owner_id", ownerUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const h = hospitalRes.data as any;
      const a = ambRes.data as any;
      // Prefer the most recent record across both tables
      const candidates: PendingProviderSubmission[] = [];
      if (h) candidates.push({
        id: h.id, kind: "hospital", status: h.status, org_name: h.name,
        registration_number: h.registration_number, address: h.address,
        contact_email: h.contact_email, contact_phone: h.contact_phone,
        admin_full_name: h.admin_full_name, admin_email: h.admin_email, admin_phone: h.admin_phone,
        directors: Array.isArray(h.directors) ? h.directors : [],
        license_file_path: h.license_file_path, license_file_mime: h.license_file_mime,
        license_file_size_bytes: h.license_file_size_bytes,
        rejection_reason: h.rejection_reason, created_at: h.created_at,
      });
      if (a) candidates.push({
        id: a.id, kind: "ambulance", status: a.status, org_name: a.company_name,
        registration_number: a.registration_number, address: a.base_address,
        contact_email: a.contact_email, contact_phone: a.contact_phone,
        admin_full_name: a.admin_full_name, admin_email: a.admin_email, admin_phone: a.admin_phone,
        directors: Array.isArray(a.directors) ? a.directors : [],
        license_file_path: a.license_file_path, license_file_mime: a.license_file_mime,
        license_file_size_bytes: a.license_file_size_bytes,
        rejection_reason: a.rejection_reason, created_at: a.created_at,
      });
      candidates.sort((x, y) => y.created_at.localeCompare(x.created_at));
      return candidates[0] || null;
    },
  });
}
