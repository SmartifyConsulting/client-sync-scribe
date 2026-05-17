import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Row = {
  nurse_registration_number?: string | null;
  email?: string | null;
  full_name?: string | null;
  role_title?: string | null;
  mobile_number?: string | null;
};

type Result = {
  full_name: string | null;
  status: "matched" | "pending" | "error" | "skipped";
  reason?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: auth } = await userClient.auth.getUser();
    const user = auth?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const hospitalId: string | undefined = body.hospital_id;
    const rows: Row[] = Array.isArray(body.rows) ? body.rows : [];
    if (!hospitalId || !rows.length) {
      return new Response(JSON.stringify({ error: "hospital_id and rows are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isStaff } = await admin.rpc("is_hospital_staff", { _hospital_id: hospitalId, _user_id: user.id });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Not authorised for this hospital" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Result[] = [];

    for (const raw of rows) {
      const row: Row = {
        nurse_registration_number: (raw.nurse_registration_number || "").toString().trim() || null,
        email: (raw.email || "").toString().trim().toLowerCase() || null,
        full_name: (raw.full_name || "").toString().trim() || null,
        role_title: (raw.role_title || "").toString().trim() || null,
        mobile_number: (raw.mobile_number || "").toString().trim() || null,
      };

      if (!row.full_name) {
        results.push({ full_name: null, status: "skipped", reason: "missing full_name" });
        continue;
      }

      let matchedId: string | null = null;
      if (row.email) {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = list?.users?.find((u) => (u.email || "").toLowerCase() === row.email);
        if (found) matchedId = found.id;
      }

      // Dedupe check
      const { data: existing } = await admin
        .from("hospital_nurses")
        .select("id")
        .eq("hospital_id", hospitalId)
        .or([
          row.email ? `email.eq.${row.email}` : null,
          row.nurse_registration_number ? `nurse_registration_number.eq.${row.nurse_registration_number}` : null,
        ].filter(Boolean).join(",") || "id.eq.00000000-0000-0000-0000-000000000000")
        .maybeSingle();

      if (existing?.id) {
        results.push({ full_name: row.full_name, status: "skipped", reason: "already on roster" });
        continue;
      }

      const { error } = await admin.from("hospital_nurses").insert({
        hospital_id: hospitalId,
        full_name: row.full_name,
        nurse_registration_number: row.nurse_registration_number,
        email: row.email,
        mobile_number: row.mobile_number,
        role_title: row.role_title,
        linked_user_id: matchedId,
        status: matchedId ? "active" : "inactive",
        pending_payload: matchedId ? {} : {
          nurse_registration_number: row.nurse_registration_number,
          email: row.email,
          full_name: row.full_name,
          role_title: row.role_title,
          mobile_number: row.mobile_number,
        },
        created_by: user.id,
      });

      if (error) results.push({ full_name: row.full_name, status: "error", reason: error.message });
      else results.push({ full_name: row.full_name, status: matchedId ? "matched" : "pending" });
    }

    const summary = {
      matched: results.filter((r) => r.status === "matched").length,
      pending: results.filter((r) => r.status === "pending").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
    };

    return new Response(JSON.stringify({ summary, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
