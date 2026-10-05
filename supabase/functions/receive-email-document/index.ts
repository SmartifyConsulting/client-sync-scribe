import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-intake-secret, svix-id, svix-timestamp, svix-signature",
};

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB per file
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB per email
const BUCKET = "email-attachments";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface ResendAttachmentMeta {
  id?: string;
  filename?: string;
  size?: number;
  content_type?: string;
  content_disposition?: string;
  download_url?: string;
}

interface ReceivedEmail {
  id?: string;
  email_id?: string;
  from?: string;
  to?: string[] | string;
  received_for?: string[] | string;
  subject?: string;
  text?: string;
  html?: string;
  attachments?: ResendAttachmentMeta[];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Lowercase, strip display name and `+tag`, keep `local@domain`. */
function normaliseAddress(raw: string): string {
  let addr = String(raw || "").trim().toLowerCase();
  const angle = addr.match(/<([^>]+)>/);
  if (angle) addr = angle[1].trim();
  const at = addr.lastIndexOf("@");
  if (at === -1) return addr;
  const local = addr.slice(0, at).split("+")[0];
  return `${local}@${addr.slice(at + 1)}`;
}

function toAddressList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => normaliseAddress(String(v)));
  if (typeof value === "string") {
    return value.split(",").map((v) => normaliseAddress(v)).filter(Boolean);
  }
  return [];
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

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a Svix-style webhook signature (used by Resend).
 * Signed content is `${svix-id}.${svix-timestamp}.${rawBody}`.
 */
async function verifySvixSignature(
  secret: string,
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  const id = headers.get("svix-id") || headers.get("webhook-id");
  const timestamp = headers.get("svix-timestamp") || headers.get("webhook-timestamp");
  const signatureHeader = headers.get("svix-signature") || headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  // Reject replays older than 5 minutes.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const keyBytes = base64ToBytes(secret.replace(/^whsec_/, ""));
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, signed));
  const expected = bytesToBase64(mac);

  return signatureHeader
    .split(" ")
    .map((part) => part.split(",").pop() || "")
    .some((candidate) => timingSafeEqual(candidate, expected));
}

const SCHEDULES_CLAIMS_KINDS = ["Policy History", "Claims History"];
const QUOTE_COVER_KINDS = ["Quote — Car", "Quote — Home", "Quote — Life", "Quote — Disability", "Quote — Other"];

/** Best-effort filing: classifies an insurer attachment from its filename and
 *  the surrounding email context (no document content parsing/OCR). */
async function classifyInsurerDocument(kind: "schedules_claims" | "quotes", filename: string, subject: string, bodyText: string): Promise<string> {
  const options = kind === "quotes" ? QUOTE_COVER_KINDS : SCHEDULES_CLAIMS_KINDS;
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return options[options.length - 1];
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [
          { role: "system", content: `Classify an insurer document into exactly one of: ${options.join(", ")}. Reply with only that label, nothing else.` },
          { role: "user", content: `Filename: ${filename}\nEmail subject: ${subject}\nEmail body: ${bodyText.slice(0, 2000)}` },
        ],
      }),
    });
    if (!r.ok) return options[options.length - 1];
    const out = await r.json();
    const text: string = (out.output_text ?? (out.output ?? []).flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("")).trim();
    return options.find((o) => text.toLowerCase().includes(o.toLowerCase())) ?? options[options.length - 1];
  } catch (e) {
    console.error("Classification failed", e);
    return options[options.length - 1];
  }
}

async function resendGet(path: string): Promise<Response> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!lovableKey || !resendKey) {
    throw new Error("Resend connection is not configured");
  }
  return await fetch(`${GATEWAY_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    // --- Authentication: Resend (Svix) signature, or manual-test shared secret ---
    const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    const intakeSecret = Deno.env.get("EMAIL_INTAKE_SECRET");
    const providedIntakeSecret = req.headers.get("x-intake-secret") || "";

    let authorised = false;
    if (webhookSecret && (await verifySvixSignature(webhookSecret, req.headers, rawBody))) {
      authorised = true;
    } else if (intakeSecret && providedIntakeSecret && providedIntakeSecret === intakeSecret) {
      authorised = true; // manual testing path
    }
    if (!authorised) {
      console.warn("Rejected intake request: signature/secret verification failed");
      return json({ error: "Unauthorized" }, 401);
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const eventType = typeof payload.type === "string" ? payload.type : "";
    if (eventType && eventType !== "email.received") {
      return json({ ignored: true, reason: `unhandled event ${eventType}` });
    }

    // Webhook data carries metadata only; the body/attachments are fetched below.
    const eventData = (payload.data ?? payload) as ReceivedEmail;
    const emailId = eventData.email_id || eventData.id || (payload.email_id as string | undefined);

    let email: ReceivedEmail = eventData;
    if (emailId && webhookSecret) {
      const res = await resendGet(`/emails/receiving/${emailId}`);
      if (!res.ok) {
        const details = await res.text();
        console.error(`Resend receive fetch failed [${res.status}]: ${details}`);
        return json({ error: "Failed to fetch received email", status: res.status, details }, 502);
      }
      email = { ...eventData, ...(await res.json()) };
    }

    const recipients = [
      ...toAddressList(email.received_for),
      ...toAddressList(email.to),
    ].filter(Boolean);
    if (recipients.length === 0) {
      return json({ error: "Missing recipient address" }, 400);
    }

    const sender = normaliseAddress(String(email.from || "")) || "unknown sender";
    const subject = typeof email.subject === "string" ? email.subject.slice(0, 300) : "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log("Inbound email", { emailId, recipients, from: sender, subject });
    const bodyText = email.text || email.html || "No content";

    // --- Resolve the mailbox owner from any recipient alias ---
    let profile: { id: string; full_name: string | null } | null = null;
    let matchedRecipient = recipients[0];

    for (const recipient of recipients) {
      const at = recipient.lastIndexOf("@");
      if (at === -1) continue;
      const local = recipient.slice(0, at);

      const legacy = local.match(/^docs-([a-f0-9-]+)$/);
      const { data } = legacy
        ? await supabase
          .from("profiles")
          .select("id, full_name")
          .ilike("mailbox_id", `${legacy[1]}%`)
          .maybeSingle()
        : await supabase
          .from("profiles")
          .select("id, full_name")
          .ilike("mailbox_alias", local)
          .maybeSingle();

      if (data) {
        profile = data;
        matchedRecipient = recipient;
        break;
      }
    }

    if (!profile) {
      // 200 so Resend does not retry an address we will never accept.
      console.warn("No profile matches inbound recipients:", recipients.join(", "));
      return json({ ignored: true, reason: "unknown_mailbox", recipients });
    }

    console.log("Matched mailbox to user", profile.id);

    // --- Step 3 / Step 4 document requests: match [REF:token] in the subject
    // back to the request that was sent, so attachments get filed into the
    // right client's folders instead of the generic documents list. ---
    const refMatch = subject.match(/\[REF:([0-9a-f]{10,20})\]/i);
    if (refMatch) {
      const { data: reqRow } = await supabase
        .from("wealth_document_requests")
        .select("*")
        .eq("reply_token", refMatch[1].toLowerCase())
        .eq("broker_user_id", profile.id)
        .maybeSingle();

      if (reqRow) {
        let meta: ResendAttachmentMeta[] = Array.isArray(email.attachments) ? email.attachments : [];
        if (emailId && webhookSecret && !meta.some((a) => a.download_url)) {
          const res = await resendGet(`/emails/receiving/${emailId}/attachments`);
          if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list?.data)) meta = list.data;
          }
        }

        const filedIds: string[] = [];
        for (const [index, att] of meta.entries()) {
          const name = safeFileName(att.filename || "", index);
          const contentType = att.content_type || "application/octet-stream";
          let bytes: Uint8Array;
          try {
            if (att.download_url) {
              const r = await fetch(att.download_url);
              if (!r.ok) continue;
              bytes = new Uint8Array(await r.arrayBuffer());
            } else if (typeof (att as { content?: string }).content === "string") {
              bytes = base64ToBytes((att as { content: string }).content);
            } else continue;
          } catch { continue; }
          if (bytes.byteLength > MAX_ATTACHMENT_BYTES) continue;

          const kind = await classifyInsurerDocument(reqRow.kind, name, subject, bodyText);

          const path = `${profile.id}/${reqRow.id}/${name}`;
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
          if (upErr) { console.error("Insurer attachment upload failed", name, upErr.message); continue; }

          const { data: doc } = await supabase.from("documents").insert({
            user_id: profile.id, patient_id: reqRow.patient_id, name,
            content: `Received from ${sender} — ${subject}`,
            document_kind: kind, request_id: reqRow.id,
            attachments: [{ name, path, size: bytes.byteLength, contentType }],
          }).select("id").single();
          if (doc) filedIds.push(doc.id);
        }

        await supabase.from("wealth_document_requests").update({ status: "documents_received" }).eq("id", reqRow.id);
        await supabase.from("notifications").insert({
          user_id: profile.id, type: "document_received",
          title: reqRow.kind === "quotes" ? "Quote received" : "Policy documents received",
          description: `${sender} sent ${filedIds.length} document${filedIds.length === 1 ? "" : "s"} — filed automatically.`,
        });

        return json({ success: true, matchedRequest: reqRow.id, filed: filedIds.length });
      }
    }

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
    const skipped: string[] = [];

    const documentContent = [
      "# Document Received via Email",
      "",
      `**From:** ${sender}`,
      `**To:** ${matchedRecipient}`,
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

    // --- Collect attachment metadata (download URLs come from Resend) ---
    let attachmentMeta: ResendAttachmentMeta[] = Array.isArray(email.attachments)
      ? email.attachments
      : [];
    if (emailId && webhookSecret && !attachmentMeta.some((a) => a.download_url)) {
      const res = await resendGet(`/emails/receiving/${emailId}/attachments`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list?.data)) attachmentMeta = list.data;
      } else {
        console.error(`Attachment list failed [${res.status}]: ${await res.text()}`);
      }
    }

    // --- Store attachments ---
    const stored: { name: string; path: string; size: number; contentType: string }[] = [];
    let totalBytes = 0;

    for (const [index, att] of attachmentMeta.entries()) {
      const name = safeFileName(att.filename || "", index);
      const contentType = att.content_type || "application/octet-stream";

      if (typeof att.size === "number" && att.size > MAX_ATTACHMENT_BYTES) {
        skipped.push(`${name} (too large)`);
        continue;
      }

      let bytes: Uint8Array;
      try {
        if (att.download_url) {
          const fileRes = await fetch(att.download_url);
          if (!fileRes.ok) throw new Error(`download ${fileRes.status}`);
          bytes = new Uint8Array(await fileRes.arrayBuffer());
        } else if (typeof (att as { content?: string }).content === "string") {
          bytes = base64ToBytes((att as { content: string }).content);
        } else {
          skipped.push(`${name} (no content)`);
          continue;
        }
      } catch (e) {
        console.error("Could not fetch attachment", name, e);
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
        .upload(path, bytes, { contentType, upsert: true });

      if (uploadError) {
        console.error("Attachment upload failed", name, uploadError.message);
        skipped.push(`${name} (upload failed)`);
        continue;
      }

      totalBytes += bytes.byteLength;
      stored.push({ name, path, size: bytes.byteLength, contentType });
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
        .update({ attachments: stored, content: `${documentContent}\n${notes}` })
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
