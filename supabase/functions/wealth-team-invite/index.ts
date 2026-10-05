import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

// Wealth team invites: Admin (Wealth Manager) invites a Referral Agent or FSP user.
// Mirrors wealth-client-invite's token pattern, scoped to admin-only callers.
const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    fullName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    role: z.enum(["referral_agent", "fsp"]),
    origin: z.string().url().max(200),
  }),
  z.object({ action: z.literal("cancel"), inviteId: z.string().uuid() }),
  z.object({ action: z.literal("preview"), token: z.string().min(20).max(100) }),
  z.object({ action: z.literal("accept"), token: z.string().min(20).max(100) }),
]);
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const sha = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
const newToken = () => {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const ALLOWED_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*(holarc\.co\.za|lovable\.app|lovableproject\.com)$|^http:\/\/localhost(:\d+)?$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Some details are missing or invalid. Check the form and try again." }, 400);
    const p = parsed.data;
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const getUser = async () => {
      const auth = req.headers.get("Authorization");
      if (!auth) return null;
      const { data } = await admin.auth.getUser(auth.replace("Bearer ", ""));
      return data?.user ?? null;
    };

    if (p.action === "preview") {
      const { data: inv } = await admin.from("wealth_team_invites").select("*").eq("token_hash", await sha(p.token)).maybeSingle();
      if (!inv) return json({ error: "This invitation link isn't valid. Ask your administrator for a new one." }, 404);
      if (inv.status === "cancelled") return json({ error: "This invitation was cancelled." }, 410);
      if (inv.status !== "accepted" && new Date(inv.expires_at) < new Date())
        return json({ error: "This invitation has expired. Ask your administrator to resend it." }, 410);
      return json({ status: inv.status, fullName: inv.full_name, email: inv.email, role: inv.role });
    }

    const user = await getUser();
    if (!user) return json({ error: "Please sign in again." }, 401);

    if (p.action === "accept") {
      const { data: inv } = await admin.from("wealth_team_invites").select("*").eq("token_hash", await sha(p.token)).maybeSingle();
      if (!inv || inv.status === "cancelled") return json({ error: "This invitation link isn't valid." }, 404);
      if (inv.status === "accepted") {
        if (inv.accepted_by === user.id) return json({ ok: true });
        return json({ error: "This invitation has already been used by another account." }, 409);
      }
      if (new Date(inv.expires_at) < new Date()) return json({ error: "This invitation has expired. Ask your administrator to resend it." }, 410);
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
      if (!roles?.some((r) => r.role === inv.role)) await admin.from("user_roles").insert({ user_id: user.id, role: inv.role });
      await admin.from("wealth_team_invites").update({ status: "accepted", accepted_by: user.id, accepted_at: new Date().toISOString() }).eq("id", inv.id);
      return json({ ok: true });
    }

    // Everything below requires the caller to be an admin Wealth Manager.
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin"))
      return json({ error: "Only an administrator can manage team members." }, 403);

    if (p.action === "cancel") {
      const { data: inv } = await admin.from("wealth_team_invites").select("id, owner_user_id").eq("id", p.inviteId).maybeSingle();
      if (!inv || inv.owner_user_id !== user.id) return json({ error: "Invitation not found." }, 404);
      await admin.from("wealth_team_invites").update({ status: "cancelled" }).eq("id", inv.id);
      return json({ ok: true });
    }

    if (!ALLOWED_ORIGIN.test(p.origin)) return json({ error: "Invalid app address." }, 400);
    const token = newToken();
    const { data: inv, error: iErr } = await admin.from("wealth_team_invites").insert({
      token_hash: await sha(token), owner_user_id: user.id, email: p.email, full_name: p.fullName, role: p.role,
    }).select("id").single();
    if (iErr || !inv) return json({ error: "We couldn't create the invitation. Please try again." }, 500);
    return json({ inviteId: inv.id, url: `${p.origin}/join-team/${token}` });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
