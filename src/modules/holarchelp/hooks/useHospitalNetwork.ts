import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HospitalNetworkRow {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  accepting_patients: boolean | null;
  beds_available: number | null;
  bed_capacity: number | null;
  icu_available: number | null;
  er_capacity_status: string | null;
  er_beds_available: number | null;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
}

const SELECT_COLS =
  "id, name, address, city, state, country, contact_phone, contact_email, accepting_patients, beds_available, bed_capacity, icu_available, er_capacity_status, er_beds_available, latitude, longitude, status";

export function useHospitalNetwork(opts: { acceptingOnly?: boolean } = {}) {
  const acceptingOnly = !!opts.acceptingOnly;
  return useQuery({
    queryKey: ["hospital-network", { acceptingOnly }],
    queryFn: async (): Promise<HospitalNetworkRow[]> => {
      let q = supabase
        .from("holarchelp_hospitals" as any)
        .select(SELECT_COLS)
        .eq("status", "approved")
        .order("name", { ascending: true });
      if (acceptingOnly) {
        q = q.eq("accepting_patients", true);
      }
      const { data, error } = await q;
      if (error) throw error;
      return ((data as any) ?? []) as HospitalNetworkRow[];
    },
  });
}

export function useAvailableHospitals() {
  return useHospitalNetwork({ acceptingOnly: true });
}

// Haversine distance in km
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
