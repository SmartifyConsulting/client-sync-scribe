import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { incident_id, tracking_token, escalation_level } = await req.json();
    if (!incident_id) {
      return new Response(JSON.stringify({ error: "incident_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // escalation_level selects which priority tier of contacts to notify.
    // Undefined/null means "notify everyone" (used only by internal callers
    // that predate tiered escalation); the normal SOS trigger always passes 0.
    const targetLevel: number | null = typeof escalation_level === "number" ? escalation_level : null;

    const auth = req.headers.get("Authorization") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);

    // Two trusted callers: the patient themselves (normal SOS trigger, JWT
    // must match incident.user_id), or an internal system process presenting
    // the service-role key directly — used by escalate-sos-notifications,
    // which runs on a schedule with no patient session to attach.
    const isServiceCall = auth.replace(/^Bearer\s+/i, "") === SERVICE_KEY;

    const { data: incident } = await admin
      .from("holarchelp_incidents")
      .select("id, user_id, tracking_token, severity")
      .eq("id", incident_id)
      .maybeSingle();
    if (!incident) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders });
    }

    let ownerUserId: string;
    if (isServiceCall) {
      ownerUserId = incident.user_id;
    } else {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
      if (incident.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders });
      }
      ownerUserId = user.id;
    }

    const sevRank = (s?: string | null) => {
      switch ((s ?? "low").toLowerCase()) {
        case "critical": return 4;
        case "high": return 3;
        case "medium": return 2;
        default: return 1;
      }
    };
    const incidentRank = sevRank(incident.severity);
    const passes = (minSev?: string | null) => incidentRank >= sevRank(minSev ?? "low");

    const token = tracking_token ?? incident.tracking_token;

    // Gather recipients: emergency contacts (default) + NOK with explicit flag
    const { data: patient } = await admin
      .from("patients")
      .select("emergency_contact_name, emergency_contact_phone, emergency_contact_email, emergency_can_view_live_tracking, emergency_contacts, next_of_kin_name, next_of_kin_phone, next_of_kin_email, nok_can_view_live_tracking, next_of_kin_members, name")
      .eq("patient_user_id", ownerUserId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    type Recip = { name: string; phone?: string; email?: string; via: string; min_severity?: string; priority: number };
    const recipients: Recip[] = [];

    if (patient) {
      // Patient-record-level contacts (jsonb fields) predate the priority
      // concept — they all sit at tier 0, same as any HolarcHelp contact
      // that hasn't been explicitly reordered.
      if (patient.emergency_can_view_live_tracking !== false && patient.emergency_contact_name) {
        recipients.push({
          name: patient.emergency_contact_name,
          phone: patient.emergency_contact_phone || undefined,
          email: patient.emergency_contact_email || undefined,
          via: "emergency_contact",
          min_severity: "low",
          priority: 0,
        });
      }
      const ecList = Array.isArray(patient.emergency_contacts) ? patient.emergency_contacts : [];
      for (const c of ecList as any[]) {
        if (c.can_view_live_tracking !== false && c.name) {
          recipients.push({ name: c.name, phone: c.phone, email: c.email, via: "emergency_contact", min_severity: c.notify_min_severity ?? "low", priority: 0 });
        }
      }
      if (patient.nok_can_view_live_tracking === true && patient.next_of_kin_name) {
        recipients.push({
          name: patient.next_of_kin_name,
          phone: patient.next_of_kin_phone || undefined,
          email: patient.next_of_kin_email || undefined,
          via: "next_of_kin",
          min_severity: "low",
          priority: 0,
        });
      }
      const nokList = Array.isArray(patient.next_of_kin_members) ? patient.next_of_kin_members : [];
      for (const c of nokList as any[]) {
        if (c.can_view_live_tracking === true && c.name) {
          recipients.push({ name: c.name, phone: c.phone, email: c.email, via: "next_of_kin", min_severity: c.notify_min_severity ?? "low", priority: 0 });
        }
      }
    }

    // Standalone HolarcHelp emergency contacts table — this one supports
    // explicit escalation priority (lower number = notified first).
    const { data: ecRows } = await admin
      .from("holarchelp_emergency_contacts")
      .select("name, phone, email, notify_min_severity, priority")
      .eq("user_id", ownerUserId);
    for (const c of ecRows ?? []) {
      if ((c as any).name) {
        recipients.push({
          name: (c as any).name,
          phone: (c as any).phone ?? undefined,
          email: (c as any).email ?? undefined,
          via: "emergency_contact",
          min_severity: (c as any).notify_min_severity ?? "low",
          priority: (c as any).priority ?? 0,
        });
      }
    }

    // Filter by severity threshold + dedupe
    const filteredRaw = recipients.filter((r) => passes(r.min_severity));
    const seen = new Set<string>();
    let filtered = filteredRaw.filter((r) => {
      const key = (r.email || "").trim().toLowerCase() + "|" + (r.phone || "").trim();
      if (key === "|") return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Narrow to the requested escalation tier. If no contact exists at that
    // exact tier (e.g. priorities are 0 and 2, tier 1 requested), fall
    // through to the next tier that has anyone in it, so escalation never
    // silently notifies nobody.
    let escalationHasMoreTiers = false;
    if (targetLevel !== null) {
      const tiers = Array.from(new Set(filtered.map((r) => r.priority))).sort((a, b) => a - b);
      const nextTier = tiers.find((t) => t >= targetLevel) ?? null;
      escalationHasMoreTiers = tiers.some((t) => t > (nextTier ?? -Infinity));
      filtered = nextTier === null ? [] : filtered.filter((r) => r.priority === nextTier);
    }

    const patientName = patient?.name ?? "Your contact";

    // Resolve each contact to an auth user via email match in profiles.
    const emails = Array.from(new Set(filtered.map((r) => r.email).filter(Boolean) as string[]));
    let profilesByEmail = new Map<string, string>(); // lower(email) -> profile_id (auth user id)
    if (emails.length > 0) {
      // profiles table is keyed by auth.users.id; we need email — fetch via admin auth API
      // For each email, listUsers with filter is heavy; safer to query auth.users via SQL helper.
      // Lovable Cloud exposes profiles.id == auth.users.id, so look up by lowercased email
      // using a service-role query against auth.users.
      const { data: authMatches } = await admin
        .rpc("noop_match_users_by_email" as any, { _emails: emails })
        .then((r: any) => r, () => ({ data: null }));
      if (Array.isArray(authMatches)) {
        for (const row of authMatches as any[]) {
          if (row?.email && row?.id) profilesByEmail.set(String(row.email).toLowerCase(), row.id);
        }
      } else {
        // Fallback: use admin auth API listUsers per page and match emails locally.
        // Cap at 1 page (default 50) — fine for typical contact counts.
        try {
          const { data } = await (admin as any).auth.admin.listUsers({ page: 1, perPage: 200 });
          for (const u of (data?.users ?? []) as any[]) {
            if (u?.email) profilesByEmail.set(String(u.email).toLowerCase(), u.id);
          }
        } catch (_e) { /* ignore */ }
      }
    }

    const sent: any[] = [];
    const notifTitle = `🚨 ${patientName} triggered an SOS`;
    const notifDescription = `Tap to view live location and current status.`;

    for (const r of filtered) {
      const emailKey = (r.email || "").toLowerCase();
      const contactUserId = emailKey ? profilesByEmail.get(emailKey) : undefined;

      // Always log the attempt
      const logChannel = contactUserId ? "in_app" : "pending";
      const logStatus = contactUserId ? "sent" : "queued";

      if (contactUserId) {
        // 1. Insert high-priority in-app notification
        await admin.from("notifications").insert({
          user_id: contactUserId,
          type: "sos_alert",
          title: notifTitle,
          description: notifDescription,
          reference_id: incident_id,
        } as any).then(() => {}, () => {});

        // 2. Auto-share the SOS record (profile + live tracking) so they can open it
        const { data: existing } = await admin
          .from("patient_profile_shares")
          .select("id")
          .eq("owner_user_id", ownerUserId)
          .eq("shared_with_user_id", contactUserId)
          .maybeSingle();
        if (existing?.id) {
          await admin.from("patient_profile_shares")
            .update({ can_view_profile: true, can_view_live_tracking: true } as any)
            .eq("id", existing.id).then(() => {}, () => {});
        } else {
          await admin.from("patient_profile_shares").insert({
            owner_user_id: ownerUserId,
            shared_with_user_id: contactUserId,
            shared_with_email: r.email,
            shared_with_username: r.name,
            relationship: r.via,
            can_view_profile: true,
            can_view_live_tracking: true,
            source: "sos_auto",
          } as any).then(() => {}, () => {});
        }
      }

      await admin.from("holarchelp_messaging_log").insert({
        incident_id,
        user_id: ownerUserId,
        recipient_name: r.name,
        recipient_phone: r.phone ?? null,
        recipient_email: r.email ?? null,
        channel: logChannel,
        status: logStatus,
        escalation_level: targetLevel ?? 0,
        metadata: { tracking_token: token, via: r.via, severity: incident.severity, min_severity: r.min_severity, in_app_user_id: contactUserId ?? null },
      } as any).then(() => {}, () => {});

      sent.push({ name: r.name, email: r.email ?? null, in_app: !!contactUserId });
    }

    if (targetLevel !== null) {
      await admin.from("holarchelp_incidents")
        .update({ escalation_level: targetLevel } as any)
        .eq("id", incident_id).then(() => {}, () => {});
    }

    return new Response(JSON.stringify({
      ok: true,
      sent,
      recipient_count: filtered.length,
      in_app_count: sent.filter((s) => s.in_app).length,
      escalation_has_more_tiers: escalationHasMoreTiers,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
