import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-intake-secret",
};

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB per file
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB per email
const BUCKET = "email-attachments";

interface IncomingAttachment {
  filename?: string;
  content?: string; // base64
  contentType?: string;
}

interface EmailPayload {
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  attachments?: IncomingAttachment[];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Lowercase, strip display name and `+tag`, keep `local@domain`. */
function normaliseAddress(raw: string): string {
  let addr = raw.trim().toLowerCase();
  const angle = addr.match(/<([^>]+)>/);
  if (angle) addr = angle[1].trim();
  const at = addr.lastIndexOf("@");
  if (at === -1) return addr;
  const local = addr.slice(0, at).split("+")[0];
  return `${local}@${addr.slice(at + 1)}`;
}

function safeFileName(name: string, index: number): string {
  const cleaned = (name || `attachment-${index + 1}`)
    .replace(/[\\/]/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(-120);
  return cleaned || `attachment-${index + 1}`;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s/g, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Shared-secret auth (called from the Cloudflare Email Worker) ---
    const expectedSecret = Deno.env.get("EMAIL_INTAKE_SECRET");
    if (!expectedSecret) {
      console.error("EMAIL_INTAKE_SECRET is not configured");
      return json({ error: "Intake not configured" }, 500);
    }
    const providedSecret = req.headers.get("x-intake-secret") || "";
    if (providedSecret !== expectedSecret) {
      console.warn("Rejected intake request with invalid secret");
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- Payload validation ---
    let payload: EmailPayload;
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (!payload || typeof payload !== "object" || typeof payload.to !== "string") {
      return json({ error: "Missing recipient address" }, 400);
    }
    if (payload.attachments && !Array.isArray(payload.attachments)) {
      return json({ error: "attachments must be an array" }, 400);
    }

    const recipient = normaliseAddress(payload.to);
    const sender = typeof payload.from === "string" ? payload.from.slice(0, 320) : "unknown sender";
    const subject = typeof payload.subject === "string" ? payload.subject.slice(0, 300) : "";

    console.log("Inbound email", {
      to: recipient,
      from: sender,
      subject,
      attachments: payload.attachments?.length || 0,
    });

    // --- Resolve the mailbox owner ---
    let profile: { id: string; full_name: string | null } | null = null;

    const aliasMatch = recipient.match(/^([a-z0-9._-]+)@holarc\.com$/);
    if (aliasMatch) {
      const alias = aliasMatch[1];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("mailbox_alias", alias)
        .maybeSingle();
      profile = data;
    } else {
      const mailboxMatch = recipient.match(/^docs-([a-f0-9-]+)@/);
      if (!mailboxMatch) {
        console.warn("Unrecognised recipient format:", recipient);
        return json({ error: "unknown_mailbox", recipient }, 404);
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("mailbox_id", `${mailboxMatch[1]}%`)
        .maybeSingle();
      profile = data;
    }

    if (!profile) {
      console.warn("No profile matches mailbox:", recipient);
      return json({ error: "unknown_mailbox", recipient }, 404);
    }

    console.log("Matched mailbox to user", profile.id);

    // Link the document to the user's own patient record when they have one,
    // so it surfaces in patient-scoped document views too.
    const { data: patientRow } = await supabase
      .from("patients")
      .select("id, name")
      .eq("patient_user_id", profile.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    // --- Build document body ---
    const bodyText = payload.text || payload.html || "No content";
    const skipped: string[] = [];

    const documentContent = [
      "# Document Received via Email",
      "",
      `**From:** ${sender}`,
      `**Date:** ${new Date().toISOString()}`,
      `**Subject:** ${subject || "No Subject"}`,
      "",
      "---",
      "",
      bodyText,
    ].join("\n");

    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: profile.id,
        patient_id: patientRow?.id ?? null,
        patient_name: patientRow?.name ?? null,
        name: `Email: ${subject || "No Subject"} - ${new Date().toLocaleDateString()}`,
        content: documentContent,
        template_name: "Email Document",
      })
      .select()
      .single();

    if (docError || !document) {
      console.error("Error creating document:", docError);
      return json({ error: "Failed to create document" }, 500);
    }

    // --- Store attachments ---
    const stored: {
      name: string;
      path: string;
      size: number;
      contentType: string;
    }[] = [];
    let totalBytes = 0;

    for (const [index, att] of (payload.attachments || []).entries()) {
      if (!att?.content) continue;
      const name = safeFileName(att.filename || "", index);
      let bytes: Uint8Array;
      try {
        bytes = base64ToBytes(att.content);
      } catch (e) {
        console.error("Could not decode attachment", name, e);
        skipped.push(`${name} (unreadable)`);
        continue;
      }

      if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
        skipped.push(`${name} (too large)`);
        continue;
      }
      if (totalBytes + bytes.byteLength > MAX_TOTAL_ATTACHMENT_BYTES) {
        skipped.push(`${name} (email attachment limit reached)`);
        continue;
      }

      const path = `${profile.id}/${document.id}/${name}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: att.contentType || "application/octet-stream",
          upsert: true,
        });

      if (uploadError) {
        console.error("Attachment upload failed", name, uploadError.message);
        skipped.push(`${name} (upload failed)`);
        continue;
      }

      totalBytes += bytes.byteLength;
      stored.push({
        name,
        path,
        size: bytes.byteLength,
        contentType: att.contentType || "application/octet-stream",
      });
    }

    if (stored.length || skipped.length) {
      const notes = [
        "",
        "---",
        "",
        stored.length ? `**Attachments:** ${stored.map((a) => a.name).join(", ")}` : "",
        skipped.length ? `**Not stored:** ${skipped.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await supabase
        .from("documents")
        .update({
          attachments: stored,
          content: `${documentContent}\n${notes}`,
        })
        .eq("id", document.id);
    }

    const { error: notificationError } = await supabase.from("notifications").insert({
      user_id: profile.id,
      type: "document_received",
      title: "New Document Received",
      description: `Email from ${sender}: ${subject || "No Subject"}`,
      reference_id: document.id,
      is_read: false,
    });
    if (notificationError) console.error("Notification failed:", notificationError);

    return json({
      success: true,
      documentId: document.id,
      attachmentsStored: stored.length,
      attachmentsSkipped: skipped,
    });
  } catch (error: unknown) {
    console.error("Error processing email:", error);
    const message = error instanceof Error ? error.message : "Failed to process email";
    return json({ error: message }, 500);
  }
});
