import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Seed = {
  email: string;
  full_name: string;
  role: "broker";
};

const SEEDS: Seed[] = [
  { email: "xtina@smartify.co.za", full_name: "Xtina", role: "broker" },
];

const FIXED_PASSWORD = "Password123";
const PASSWORD_TARGETS: Array<{ email: string; full_name: string; password?: string }> = [
  { email: "paraskevoulasoldatos@gmail.com", full_name: "Paraskevi Soldatos" },
  { email: "zano@smartify.co.za", full_name: "Zano" },
  { email: "xtina@smartify.co.za", full_name: "Xtina" },
  { email: "renken@smartify.co.za", full_name: "Renken" },
  { email: "nonastasia@gmail.com", full_name: "Nonastasia" },
];

function randomPassword() {
  return crypto.randomUUID() + "Aa1!";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("Missing auth");

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate the caller's JWT using an anon client + getClaims (works with signing-keys)
    const authClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      console.error("getClaims failed", claimsErr);
      throw new Error("Invalid auth");
    }
    const callerId = claimsData.claims.sub as string;

    // Service-role client for admin operations
    const sb = createClient(url, service);

    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin role required");

    const results: Array<{ email: string; status: string; user_id?: string }> = [];

    for (const seed of SEEDS) {
      // Find existing user
      let userId: string | null = null;
      const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users.find((u) => (u.email || "").toLowerCase() === seed.email);
      if (existing) {
        userId = existing.id;
      } else {
        const { data: created, error: ce } = await sb.auth.admin.createUser({
          email: seed.email,
          password: randomPassword(),
          email_confirm: true,
          user_metadata: { full_name: seed.full_name, role: "broker" },
        });
        if (ce) {
          results.push({ email: seed.email, status: `create_failed: ${ce.message}` });
          continue;
        }
        userId = created.user!.id;
      }

      // Ensure profile
      await sb.from("profiles").upsert(
        { id: userId, full_name: seed.full_name, role: "broker" },
        { onConflict: "id" },
      );

      // Set role
      await sb.from("user_roles").delete().eq("user_id", userId);
      await sb.from("user_roles").insert({ user_id: userId, role: seed.role });

      results.push({ email: seed.email, status: existing ? "updated" : "created", user_id: userId });
    }

    // Set fixed password for test accounts (idempotent)
    const { data: list2 } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const byEmail = new Map<string, string>();
    list2?.users.forEach((u) => { if (u.email) byEmail.set(u.email.toLowerCase(), u.id); });
    const pwResults: any[] = [];
    for (const t of PASSWORD_TARGETS) {
      const pw = t.password ?? FIXED_PASSWORD;
      try {
        let id = byEmail.get(t.email.toLowerCase());
        if (!id) {
          const { data: created, error: ce } = await sb.auth.admin.createUser({
            email: t.email, password: pw, email_confirm: true,
            user_metadata: { full_name: t.full_name, role: "client" },
          });
          if (ce) throw ce;
          id = created.user!.id;
          pwResults.push({ email: t.email, status: "created" });
        } else {
          const { error: ue } = await sb.auth.admin.updateUserById(id, { password: pw });
          if (ue) throw ue;
          pwResults.push({ email: t.email, status: "password_set" });
        }
      } catch (e: any) {
        pwResults.push({ email: t.email, status: "failed", error: e.message });
      }
    }

    return new Response(JSON.stringify({ ok: true, results, passwords: pwResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
