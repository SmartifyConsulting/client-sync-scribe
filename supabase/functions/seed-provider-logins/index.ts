import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rand = () => Math.random().toString(36).slice(-10) + "A1!";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "admin required" }), { status: 403, headers: corsHeaders });

    // Build full email→userId map (paginated)
    const emailMap = new Map<string, string>();
    for (let page = 1; page <= 20; page++) {
      const { data } = await (admin as any).auth.admin.listUsers({ page, perPage: 1000 });
      const users = (data?.users ?? []) as any[];
      for (const u of users) if (u?.email) emailMap.set(String(u.email).toLowerCase(), u.id);
      if (users.length < 1000) break;
    }

    const summary: any[] = [];

    const processBatch = async (table: string, nameCol: string, role: "ambulance_staff" | "hospital_staff") => {
      const { data: rows } = await admin.from(table).select(`id, ${nameCol}, contact_email, owner_id`);
      for (const row of (rows ?? []) as any[]) {
        const email = String(row.contact_email ?? "").trim().toLowerCase();
        if (!email) { summary.push({ table, id: row.id, name: row[nameCol], status: "skipped_no_email" }); continue; }

        let authId = emailMap.get(email);
        let tempPassword: string | null = null;
        if (!authId) {
          tempPassword = rand();
          const { data: created, error } = await (admin as any).auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: row[nameCol], role: "doctor" },
          });
          if (error) { summary.push({ table, id: row.id, name: row[nameCol], status: "create_failed", error: error.message }); continue; }
          authId = created?.user?.id;
          if (authId) emailMap.set(email, authId);
        }

        if (!authId) { summary.push({ table, id: row.id, name: row[nameCol], status: "no_auth_id" }); continue; }

        if (row.owner_id !== authId) {
          await admin.from(table).update({ owner_id: authId } as any).eq("id", row.id);
        }

        await admin.from("user_roles").insert({ user_id: authId, role } as any).then(() => {}, () => {});

        summary.push({
          table,
          id: row.id,
          name: row[nameCol],
          email,
          auth_user_id: authId,
          status: tempPassword ? "created" : "linked",
          temp_password: tempPassword,
        });
      }
    };

    await processBatch("holarchelp_ambulance_providers", "company_name", "ambulance_staff");
    await processBatch("holarchelp_hospitals", "name", "hospital_staff");

    return new Response(JSON.stringify({
      ok: true,
      total: summary.length,
      created: summary.filter((s) => s.status === "created").length,
      linked: summary.filter((s) => s.status === "linked").length,
      errors: summary.filter((s) => !["created", "linked", "skipped_no_email"].includes(s.status)),
      summary,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), { status: 500, headers: corsHeaders });
  }
});
