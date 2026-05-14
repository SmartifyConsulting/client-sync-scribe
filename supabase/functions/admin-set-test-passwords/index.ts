import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGETS: Array<{ email: string; full_name: string }> = [
  { email: "paraskevoulasoldatos@gmail.com", full_name: "Paraskevi Soldatos" },
  { email: "zano@smartify.co.za", full_name: "Zano" },
  { email: "xtina@smartify.co.za", full_name: "Xtina" },
  { email: "renken@smartify.co.za", full_name: "Renken" },
  { email: "nonastasia@gmail.com", full_name: "Nonastasia" },
];
const PASSWORD = "Password123";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("Missing auth");

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, service);

    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) throw new Error("Invalid auth");
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin role required");

    const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const byEmail = new Map<string, string>();
    list?.users.forEach((u) => { if (u.email) byEmail.set(u.email.toLowerCase(), u.id); });

    const results: Array<{ email: string; status: string; error?: string }> = [];
    for (const t of TARGETS) {
      const lower = t.email.toLowerCase();
      let userId = byEmail.get(lower);
      try {
        if (!userId) {
          const { data: created, error: ce } = await sb.auth.admin.createUser({
            email: t.email,
            password: PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: t.full_name, role: "patient" },
          });
          if (ce) throw ce;
          userId = created.user!.id;
          results.push({ email: t.email, status: "created" });
        } else {
          const { error: ue } = await sb.auth.admin.updateUserById(userId, { password: PASSWORD });
          if (ue) throw ue;
          results.push({ email: t.email, status: "password_updated" });
        }
      } catch (e: any) {
        results.push({ email: t.email, status: "failed", error: e.message });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
