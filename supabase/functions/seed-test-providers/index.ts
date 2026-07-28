// Seed two test HolarcHelp provider accounts (idempotent). Admin-only invocation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

type Seed = {
  email: string;
  password: string;
  type: "hospital" | "ambulance";
  name: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
};

const SEEDS: Seed[] = [
  {
    email: "sandton@mediclinic.co.za", password: "Password123",
    type: "hospital", name: "Mediclinic Sandton",
    city: "Sandton", country: "South Africa",
    latitude: -26.1076, longitude: 28.0567,
  },
  {
    email: "milpark@netcare.co.za", password: "Password123",
    type: "hospital", name: "Netcare Milpark Hospital",
    city: "Johannesburg", country: "South Africa",
    latitude: -26.1858, longitude: 28.0197,
  },
  {
    email: "admin@grooteschuur.gov.za", password: "Password123",
    type: "hospital", name: "Groote Schuur Hospital",
    city: "Cape Town", country: "South Africa",
    latitude: -33.9425, longitude: 18.4635,
  },
  {
    email: "EmergencyER@jhn.co.za", password: "Password123",
    type: "ambulance", name: "Emergency ER (JHN)",
    city: "Johannesburg", country: "South Africa",
    latitude: -26.2041, longitude: 28.0473,
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: ures } = await userClient.auth.getUser();
    if (!ures.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", ures.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Admin role required" }, 403);

    const results: any[] = [];

    for (const s of SEEDS) {
      // Try to create user
      let userId: string | null = null;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: s.email, password: s.password, email_confirm: true,
      });
      if (createErr) {
        // Likely exists — look it up
        const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
        const existing = list?.users?.find((u: any) => (u.email ?? "").toLowerCase() === s.email.toLowerCase());
        if (existing) {
          userId = existing.id;
          // Reset password to known value
          await admin.auth.admin.updateUserById(existing.id, { password: s.password, email_confirm: true });
        } else {
          results.push({ email: s.email, error: createErr.message });
          continue;
        }
      } else {
        userId = created.user!.id;
      }
      if (!userId) continue;

      // Profile (no doctor role — these are facility/ambulance accounts)
      await admin.from("profiles").upsert({ id: userId, full_name: s.name } as any, { onConflict: "id" });

      // Provider row
      if (s.type === "hospital") {
        const { data: hosp } = await admin.from("holarchelp_hospitals").select("id").eq("owner_id", userId).maybeSingle();
        if (hosp) {
          await admin.from("holarchelp_hospitals").update({
            name: s.name, city: s.city, country: s.country, contact_email: s.email,
            latitude: s.latitude, longitude: s.longitude,
            status: "approved", approved_at: new Date().toISOString(),
          }).eq("id", hosp.id);
        } else {
          await admin.from("holarchelp_hospitals").insert({
            owner_id: userId, name: s.name, contact_email: s.email,
            city: s.city, country: s.country,
            latitude: s.latitude, longitude: s.longitude,
            status: "approved", approved_at: new Date().toISOString(),
          });
        }
        await admin.from("user_roles").upsert({ user_id: userId, role: "hospital_staff" }, { onConflict: "user_id,role" });
      } else {
        const { data: amb } = await admin.from("holarchelp_ambulance_providers").select("id").eq("owner_id", userId).maybeSingle();
        if (amb) {
          await admin.from("holarchelp_ambulance_providers").update({
            company_name: s.name, city: s.city, country: s.country, contact_email: s.email,
            latitude: s.latitude, longitude: s.longitude,
            status: "approved", approved_at: new Date().toISOString(),
          }).eq("id", amb.id);
        } else {
          await admin.from("holarchelp_ambulance_providers").insert({
            owner_id: userId, company_name: s.name, contact_email: s.email,
            city: s.city, country: s.country,
            latitude: s.latitude, longitude: s.longitude,
            status: "approved", approved_at: new Date().toISOString(),
          });
        }
        await admin.from("user_roles").upsert({ user_id: userId, role: "ambulance_staff" }, { onConflict: "user_id,role" });
      }

      results.push({ email: s.email, userId, ok: true });
    }

    return json({ ok: true, results });
  } catch (e: any) {
    return json({ error: e?.message ?? "Failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
