import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Row = {
  practice_number?: string | null;
  email?: string | null;
  full_name?: string | null;
  role_at_hospital?: string | null;
  specialty?: string | null;
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

    // Verify caller is hospital staff
    const { data: isStaff } = await admin.rpc("is_hospital_staff", { _hospital_id: hospitalId, _user_id: user.id });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Not authorised for this hospital" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Result[] = [];

    for (const raw of rows) {
      const row: Row = {
        practice_number: (raw.practice_number || "").toString().trim() || null,
        email: (raw.email || "").toString().trim().toLowerCase() || null,
        full_name: (raw.full_name || "").toString().trim() || null,
        role_at_hospital: (raw.role_at_hospital || "").toString().trim() || null,
        specialty: (raw.specialty || "").toString().trim() || null,
        mobile_number: (raw.mobile_number || "").toString().trim() || null,
      };

      if (!row.practice_number && !row.email && !row.full_name) {
        results.push({ full_name: null, status: "skipped", reason: "empty row" });
        continue;
      }

      // Try to match an existing doctor profile by practice_number OR email
      let matchedId: string | null = null;
      if (row.practice_number) {
        const { data: byPN } = await admin
          .from("profiles")
          .select("id")
          .eq("role", "doctor")
          .eq("practice_number", row.practice_number)
          .maybeSingle();
        if (byPN?.id) matchedId = byPN.id;
      }
      if (!matchedId && row.email) {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = list?.users?.find((u) => (u.email || "").toLowerCase() === row.email);
        if (found) matchedId = found.id;
      }

      if (matchedId) {
        // Skip duplicate
        const { data: existing } = await admin
          .from("doctor_hospital_affiliations")
          .select("id")
          .eq("doctor_id", matchedId)
          .eq("hospital_id", hospitalId)
          .maybeSingle();
        if (existing?.id) {
          results.push({ full_name: row.full_name, status: "skipped", reason: "already affiliated" });
          continue;
        }
        const { error } = await admin.from("doctor_hospital_affiliations").insert({
          doctor_id: matchedId,
          hospital_id: hospitalId,
          hospital_name_snapshot: row.full_name,
          role_at_hospital: row.role_at_hospital,
          status: "active",
        });
        if (error) results.push({ full_name: row.full_name, status: "error", reason: error.message });
        else results.push({ full_name: row.full_name, status: "matched" });
      } else {
        // Pending row
        const { data: existing } = await admin
          .from("doctor_hospital_affiliations")
          .select("id")
          .is("doctor_id", null)
          .eq("hospital_id", hospitalId)
          .or(
            [
              row.practice_number ? `pending_doctor_payload->>practice_number.eq.${row.practice_number}` : null,
              row.email ? `pending_doctor_payload->>email.eq.${row.email}` : null,
            ].filter(Boolean).join(",") || "id.eq.00000000-0000-0000-0000-000000000000",
          )
          .maybeSingle();
        if (existing?.id) {
          results.push({ full_name: row.full_name, status: "skipped", reason: "pending row exists" });
          continue;
        }
        const { error } = await admin.from("doctor_hospital_affiliations").insert({
          doctor_id: null,
          hospital_id: hospitalId,
          hospital_name_snapshot: row.full_name,
          role_at_hospital: row.role_at_hospital,
          status: "pending",
          pending_doctor_payload: {
            practice_number: row.practice_number,
            email: row.email,
            full_name: row.full_name,
            specialty: row.specialty,
            mobile_number: row.mobile_number,
          },
        });
        if (error) results.push({ full_name: row.full_name, status: "error", reason: error.message });
        else results.push({ full_name: row.full_name, status: "pending" });
      }
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
