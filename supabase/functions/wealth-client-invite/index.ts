import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

// New Client invites: create (Wealth Manager), preview (public, by token), accept (signed-in client), renew (owner).
const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    phone: z.string().trim().max(30).optional().nullable(),
    email: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
    origin: z.string().url().max(200),
  }),
  z.object({ action: z.literal("renew"), inviteId: z.string().uuid(), origin: z.string().url().max(200) }),
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
      const { data: inv } = await admin.from("wealth_client_invites").select("*").eq("token_hash", await sha(p.token)).maybeSingle();
      if (!inv) return json({ error: "This invitation link isn't valid. Ask your Wealth Manager for a new one." }, 404);
      if (inv.status === "cancelled") return json({ error: "This invitation was cancelled. Ask your Wealth Manager for a new one." }, 410);
      if (inv.status !== "accepted" && new Date(inv.expires_at) < new Date())
        return json({ error: "This invitation has expired. Ask your Wealth Manager to resend it." }, 410);
      const [{ data: prof }, { data: info }] = await Promise.all([
        admin.from("profiles").select("full_name").eq("id", inv.owner_user_id).maybeSingle(),
        admin.from("wealth_practice_info").select("planner_name, fsp_name, business_logo_path, fsp_logo_path").eq("user_id", inv.owner_user_id).maybeSingle(),
      ]);
      const sign = async (path?: string | null) =>
        path ? (await admin.storage.from("practice-logos").createSignedUrl(path, 3600)).data?.signedUrl ?? null : null;
      return json({
        status: inv.status,
        firstName: inv.first_name, lastName: inv.last_name, phone: inv.phone, email: inv.email,
        managerName: info?.planner_name || prof?.full_name || "Your Wealth Manager",
        fspName: info?.fsp_name ?? null,
        businessLogo: await sign(info?.business_logo_path), fspLogo: await sign(info?.fsp_logo_path),
      });
    }

    const user = await getUser();
    if (!user) return json({ error: "Please sign in again." }, 401);

    if (p.action === "accept") {
      const { data: inv } = await admin.from("wealth_client_invites").select("*").eq("token_hash", await sha(p.token)).maybeSingle();
      if (!inv || inv.status === "cancelled") return json({ error: "This invitation link isn't valid." }, 404);
      if (inv.status === "accepted") {
        if (inv.accepted_by === user.id) return json({ ok: true, workflowId: inv.workflow_id });
        return json({ error: "This invitation has already been used by another account." }, 409);
      }
      if (new Date(inv.expires_at) < new Date()) return json({ error: "This invitation has expired. Ask your Wealth Manager to resend it." }, 410);
      if (user.id === inv.owner_user_id) return json({ error: "You can't accept your own client invitation. Open the link signed in as the client." }, 400);
      const { error: pe } = await admin.from("patients").update({ patient_user_id: user.id, email: user.email }).eq("id", inv.patient_id);
      if (pe) return json({ error: "We couldn't link your account. Please try again." }, 500);
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
      if (!roles?.some((r) => r.role === "patient")) await admin.from("user_roles").insert({ user_id: user.id, role: "patient" });
      await admin.from("wealth_client_invites").update({ status: "accepted", accepted_by: user.id, accepted_at: new Date().toISOString() }).eq("id", inv.id);
      if (inv.workflow_id) {
        await admin.from("wealth_workflow_transitions").insert({
          workflow_id: inv.workflow_id, from_stage: "consultation", to_stage: "consultation", actor_type: "client",
          actor_user_id: user.id, reason: "Client opened secure link and signed in", related_record_type: "invite", related_record_id: inv.id,
        });
      }
      return json({ ok: true, workflowId: inv.workflow_id });
    }

    if (!ALLOWED_ORIGIN.test(p.origin)) return json({ error: "Invalid app address." }, 400);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "doctor" || r.role === "admin"))
      return json({ error: "Only Wealth Managers can invite new clients." }, 403);

    if (p.action === "renew") {
      const { data: inv } = await admin.from("wealth_client_invites").select("id, owner_user_id, status").eq("id", p.inviteId).maybeSingle();
      if (!inv || inv.owner_user_id !== user.id) return json({ error: "Invitation not found." }, 404);
      if (inv.status === "accepted") return json({ error: "This client has already signed up." }, 409);
      const token = newToken();
      await admin.from("wealth_client_invites").update({
        token_hash: await sha(token), status: "invited", expires_at: new Date(Date.now() + 14 * 864e5).toISOString(),
      }).eq("id", inv.id);
      return json({ url: `${p.origin}/join/${token}` });
    }

    // create
    const name = `${p.firstName} ${p.lastName}`;
    const { data: pat, error: pErr } = await admin.from("patients").insert({
      user_id: user.id, name, first_name: p.firstName, last_name: p.lastName, phone: p.phone || null, email: p.email || null,
    }).select("id").single();
    if (pErr || !pat) return json({ error: "We couldn't create the client record. Please try again." }, 500);
    const { data: wf, error: wErr } = await admin.from("wealth_workflows").insert({ patient_id: pat.id, owner_user_id: user.id }).select("id").single();
    if (wErr || !wf) return json({ error: "Client created, but the workflow couldn't start. Please try again." }, 500);
    await admin.from("wealth_workflow_transitions").insert({
      workflow_id: wf.id, from_stage: null, to_stage: "consultation", actor_type: "user", actor_user_id: user.id, reason: "New client invited",
    });
    const token = newToken();
    const { data: inv, error: iErr } = await admin.from("wealth_client_invites").insert({
      token_hash: await sha(token), patient_id: pat.id, workflow_id: wf.id, owner_user_id: user.id,
      first_name: p.firstName, last_name: p.lastName, phone: p.phone || null, email: p.email || null,
    }).select("id").single();
    if (iErr || !inv) return json({ error: "We couldn't create the invitation link. Please try again." }, 500);
    return json({ clientId: pat.id, workflowId: wf.id, inviteId: inv.id, url: `${p.origin}/join/${token}` });
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
