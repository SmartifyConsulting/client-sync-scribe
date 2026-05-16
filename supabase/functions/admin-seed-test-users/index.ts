import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Seed = {
  email: string;
  full_name: string;
  role: "doctor" | "hospital_staff" | "ambulance_staff";
  hospital_name?: string;
  ambulance_company?: string;
  as_member?: boolean;
  member_role?: string;
};

const SEEDS: Seed[] = [
  { email: "xtina@smartify.co.za", full_name: "Xtina", role: "doctor" },
  { email: "zano@smartify.co.za", full_name: "Zano", role: "hospital_staff", hospital_name: "Zano Hospital" },
  { email: "renken@smartify.co.za", full_name: "Renken", role: "ambulance_staff", ambulance_company: "Renken Ambulance Service" },
  { email: "hospital.test@holarchealth.com", full_name: "Holarc General Hospital Admin", role: "hospital_staff", hospital_name: "Holarc General Hospital" },
  { email: "er.test@holarchealth.com", full_name: "Holarc General ER Staff", role: "hospital_staff", hospital_name: "Holarc General Hospital", as_member: true, member_role: "er_staff" },
];

const FIXED_PASSWORD = "Password123";
const PASSWORD_TARGETS: Array<{ email: string; full_name: string; password?: string }> = [
  { email: "paraskevoulasoldatos@gmail.com", full_name: "Paraskevi Soldatos" },
  { email: "zano@smartify.co.za", full_name: "Zano" },
  { email: "xtina@smartify.co.za", full_name: "Xtina" },
  { email: "renken@smartify.co.za", full_name: "Renken" },
  { email: "nonastasia@gmail.com", full_name: "Nonastasia" },
  { email: "hospital.test@holarchealth.com", full_name: "Holarc General Hospital Admin", password: "Hospital@2026" },
  { email: "er.test@holarchealth.com", full_name: "Holarc General ER Staff", password: "ER@2026" },
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
    const sb = createClient(url, service);

    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData?.user) throw new Error("Invalid auth");
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
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
          user_metadata: { full_name: seed.full_name, role: seed.role === "doctor" ? "doctor" : "patient" },
        });
        if (ce) {
          results.push({ email: seed.email, status: `create_failed: ${ce.message}` });
          continue;
        }
        userId = created.user!.id;
      }

      // Ensure profile
      await sb.from("profiles").upsert(
        { id: userId, full_name: seed.full_name, role: seed.role === "doctor" ? "doctor" : "patient" },
        { onConflict: "id" },
      );

      // Set role
      await sb.from("user_roles").delete().eq("user_id", userId);
      await sb.from("user_roles").insert({ user_id: userId, role: seed.role });

      // Provider rows
      if (seed.role === "hospital_staff" && seed.hospital_name) {
        if (seed.as_member) {
          const { data: hosp } = await sb.from("holarchelp_hospitals").select("id").eq("name", seed.hospital_name).maybeSingle();
          if (hosp) {
            const { data: mem } = await sb.from("holarchelp_hospital_members").select("id").eq("hospital_id", hosp.id).eq("user_id", userId).maybeSingle();
            if (!mem) {
              await sb.from("holarchelp_hospital_members").insert({ hospital_id: hosp.id, user_id: userId, role: seed.member_role ?? "staff" });
            }
          }
        } else {
          const { data: existsH } = await sb.from("holarchelp_hospitals").select("id").eq("owner_id", userId).maybeSingle();
          if (!existsH) {
            await sb.from("holarchelp_hospitals").insert({
              owner_id: userId,
              name: seed.hospital_name,
              contact_email: seed.email,
              status: "approved",
              approved_at: new Date().toISOString(),
            });
          } else {
            await sb.from("holarchelp_hospitals").update({ status: "approved" }).eq("id", existsH.id);
          }
        }
      }

      if (seed.role === "ambulance_staff" && seed.ambulance_company) {
        const { data: existsA } = await sb.from("holarchelp_ambulance_providers").select("id").eq("owner_id", userId).maybeSingle();
        if (!existsA) {
          await sb.from("holarchelp_ambulance_providers").insert({
            owner_id: userId,
            company_name: seed.ambulance_company,
            contact_email: seed.email,
            status: "approved",
            approved_at: new Date().toISOString(),
          });
        } else {
          await sb.from("holarchelp_ambulance_providers").update({ status: "approved" }).eq("id", existsA.id);
        }
      }

      results.push({ email: seed.email, status: existing ? "updated" : "created", user_id: userId });
    }

    // Set fixed password for test accounts (idempotent)
    const { data: list2 } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const byEmail = new Map<string, string>();
    list2?.users.forEach((u) => { if (u.email) byEmail.set(u.email.toLowerCase(), u.id); });
    const pwResults: any[] = [];
    for (const t of PASSWORD_TARGETS) {
      try {
        let id = byEmail.get(t.email.toLowerCase());
        if (!id) {
          const { data: created, error: ce } = await sb.auth.admin.createUser({
            email: t.email, password: FIXED_PASSWORD, email_confirm: true,
            user_metadata: { full_name: t.full_name, role: "patient" },
          });
          if (ce) throw ce;
          id = created.user!.id;
          pwResults.push({ email: t.email, status: "created" });
        } else {
          const { error: ue } = await sb.auth.admin.updateUserById(id, { password: FIXED_PASSWORD });
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
