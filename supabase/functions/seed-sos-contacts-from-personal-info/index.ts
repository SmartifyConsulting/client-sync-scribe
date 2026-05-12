import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RawContact = {
  id?: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  relationship?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull personal-info emergency contacts from the patient record
    const { data: patient } = await sb
      .from("patients")
      .select("emergency_contacts, emergency_contact_name, emergency_contact_phone, emergency_contact_email")
      .eq("patient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const rawList: RawContact[] = Array.isArray(patient?.emergency_contacts)
      ? (patient!.emergency_contacts as any[])
      : [];

    // Include legacy single-contact fields if no list
    const merged: RawContact[] = rawList.length > 0
      ? rawList
      : (patient?.emergency_contact_name
          ? [{
              id: "legacy-primary",
              name: patient.emergency_contact_name,
              phone: patient.emergency_contact_phone,
              email: patient.emergency_contact_email,
            }]
          : []);

    if (merged.length === 0) {
      return new Response(JSON.stringify({ seeded: 0, reason: "no_personal_info_contacts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate + normalise
    const rows = merged
      .filter((c) => c?.name && String(c.name).trim().length > 0)
      .map((c) => ({
        user_id: user.id,
        name: String(c.name!).trim().slice(0, 100),
        phone: c.phone ? String(c.phone).trim().slice(0, 20) : null,
        email: c.email ? String(c.email).trim().slice(0, 255) : null,
        relationship: c.relationship ? String(c.relationship).trim().slice(0, 60) : null,
        notify_min_severity: "low",
        source: "personal_info_seed",
        personal_info_ref: c.id ? String(c.id).slice(0, 64) : `seed-${Math.random().toString(36).slice(2, 10)}`,
      }));

    if (rows.length === 0) {
      return new Response(JSON.stringify({ seeded: 0, reason: "no_named_contacts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await sb
      .from("holarchelp_emergency_contacts")
      .upsert(rows as any, { onConflict: "user_id,personal_info_ref", ignoreDuplicates: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ seeded: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error)?.message ?? "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
