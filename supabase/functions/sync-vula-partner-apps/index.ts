import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Require admin role
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("VULA_PARTNER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "VULA_PARTNER_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("VULA_PARTNER_API_URL") ?? "https://api.6dot50.com/v1/partners";
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: "6dot50 API error", status: resp.status, detail: txt.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    // Accept either { partners: [...] } or a bare array
    const partners: any[] = Array.isArray(json) ? json : (json.partners ?? json.data ?? []);

    const rows = partners.map((p) => ({
      partner_code: String(p.code ?? p.id ?? p.partner_code ?? p.slug ?? p.name).slice(0, 64),
      name: p.name ?? p.title ?? "Unknown",
      logo_url: p.logo_url ?? p.logo ?? p.image_url ?? null,
      category: p.category ?? p.type ?? null,
      creator: p.creator ?? p.brand ?? null,
      is_active: p.is_active ?? p.active ?? true,
      last_synced_at: new Date().toISOString(),
    })).filter((r) => r.partner_code);

    let synced = 0;
    if (rows.length) {
      const { error } = await admin
        .from("vula_partner_apps")
        .upsert(rows, { onConflict: "partner_code" });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      synced = rows.length;
    }

    return new Response(JSON.stringify({ ok: true, synced }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
