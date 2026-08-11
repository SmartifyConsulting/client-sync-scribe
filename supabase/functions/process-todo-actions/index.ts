import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { classifyTask, sanitizeTaskTitle } from "../_shared/taskAssignee.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Auth check
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { text } = body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      throw new Error("Text input is required");
    }

    // Service role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch doctor's patients, profile, and templates in parallel
    const [patientsRes, profileRes, templatesRes] = await Promise.all([
      supabase.from("patients").select("id, name, email, phone, patient_user_id").eq("user_id", user.id),
      supabase.from("profiles").select("full_name, practice_number, doctor_number, practice_address, specialty").eq("id", user.id).single(),
      supabase.from("templates").select("id, name, content, header_footer_template_id").eq("user_id", user.id),
    ]);

    const doctorTemplates = templatesRes.data || [];

    // Helper: get template content with placeholders replaced
    const getTemplateContent = (templateName: string, replacements: Record<string, string>): string | null => {
      const template = doctorTemplates.find((t) =>
        t.name.toLowerCase().includes(templateName.toLowerCase())
      );
      if (!template) return null;
      let content = template.content;
      for (const [key, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(`\\[${key}\\]`, "gi"), value);
      }
      return content;
    };

    const patients = patientsRes.data || [];
    const profile = profileRes.data;
    const patientList = patients.map((p) => `${p.name} (ID: ${p.id})`).join(", ");

    // Prefer the client's local date/timezone so relative phrases like
    // "today", "tomorrow", "Monday", or "3 July" resolve to the user's
    // calendar — not UTC, which is off-by-one for late-night entries in +HH zones.
    const clientDate: string | undefined = (body as any).clientDate;
    const clientTimezone: string | undefined = (body as any).clientTimezone;
    const today = (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate))
      ? clientDate
      : new Date().toISOString().split("T")[0];
    const localDow = (() => {
      try {
        return new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          timeZone: clientTimezone || "UTC",
        }).format(new Date(`${today}T12:00:00Z`));
      } catch { return ""; }
    })();
    const tomorrow = (() => {
      const d = new Date(`${today}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().split("T")[0];
    })();

    // Call AI with tool-calling to parse the input
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a medical practice assistant. Parse voice commands into structured tasks.
Today is ${localDow ? localDow + ", " : ""}${today}${clientTimezone ? ` (${clientTimezone})` : ""}.
Doctor: ${profile?.full_name || "Unknown"}, Practice #: ${profile?.practice_number || "N/A"}, Registration #: ${profile?.doctor_number || "N/A"}
Doctor's patients: ${patientList || "None"}

Rules:
- Match patient names fuzzy (e.g. "Faith" matches "Faith Akeno")
- For scheduling: extract date, time, and duration (default 30min)
- For the "description" field: ALWAYS include the specific date, time, and patient name. Example: "Schedule appointment with Lisa Anderson on 2026-03-25 at 14:00 (30 min)". NEVER use a vague description like "Schedule appointment".
- For prescriptions: extract medication, dosage, frequency, instructions
- For invoices: extract service description, amount (default 0 if not specified)
- For medical certificates: extract reason and leave period (start/end dates)
- For referral letters: extract referring-to doctor name and reason
- For general letters: extract subject and content
- If a task cannot be auto-executed (too vague, no matching patient, unclear action), mark it as manual
- "today" means ${today}; "tomorrow" means ${tomorrow}
- Day-of-week names (Monday, Tuesday, …) refer to the NEXT occurrence of that weekday on or after today (${today}). Do NOT pick the previous week.
- Treat all dates the user speaks as their local calendar date — do not convert to UTC and do not move them by a day.
- Use 24h time format for times`,
          },
          { role: "user", content: text },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "process_actions",
              description: "Process parsed voice commands into structured actions",
              parameters: {
                type: "object",
                properties: {
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action_type: {
                          type: "string",
                          enum: [
                            "schedule_appointment",
                            "write_prescription",
                            "create_invoice",
                            "write_medical_certificate",
                            "write_referral_letter",
                            "write_general_letter",
                            "manual_task",
                          ],
                        },
                        patient_name: { type: "string", description: "Patient name as spoken" },
                        patient_id: { type: "string", description: "Matched patient ID from the list, or empty if no match" },
                        description: { type: "string", description: "Summary of the task" },
                        // Appointment fields
                        date: { type: "string", description: "ISO date YYYY-MM-DD" },
                        time: { type: "string", description: "Time HH:MM in 24h" },
                        duration_minutes: { type: "number", description: "Duration in minutes, default 30" },
                        // Prescription fields
                        medication: { type: "string" },
                        dosage: { type: "string" },
                        frequency: { type: "string" },
                        instructions: { type: "string" },
                        // Invoice fields
                        service_description: { type: "string" },
                        amount: { type: "number" },
                        // Medical certificate fields
                        certificate_reason: { type: "string" },
                        leave_start: { type: "string", description: "ISO date" },
                        leave_end: { type: "string", description: "ISO date" },
                        // Referral fields
                        referral_doctor: { type: "string" },
                        referral_reason: { type: "string" },
                        // General letter fields
                        letter_subject: { type: "string" },
                        letter_content: { type: "string" },
                      },
                      required: ["action_type", "description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["actions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "process_actions" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI processing failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured actions");

    const { actions } = JSON.parse(toolCall.function.arguments);
    const results: Array<{ action_type: string; description: string; auto_executed: boolean; error?: string }> = [];

    for (const action of actions) {
      try {
        // Resolve patient_id — validate AI-returned ID exists in doctor's patients
        let patientId = action.patient_id || null;
        if (patientId && !patients.find((p) => p.id === patientId)) {
          patientId = null; // Invalid ID from AI, force name-based matching
        }
        if (!patientId && action.patient_name) {
          const match = patients.find((p) =>
            p.name.toLowerCase().includes(action.patient_name.toLowerCase()) ||
            action.patient_name.toLowerCase().includes(p.name.toLowerCase().split(" ")[0])
          );
          if (match) patientId = match.id;
        }

        const patientRecord = patientId ? patients.find((p) => p.id === patientId) : null;

        if (action.action_type === "manual_task" || (!patientId && action.action_type !== "manual_task")) {
          // Create manual todo — skip medication instructions (covered by prescriptions)
          const manualOwner = classifyTask(action.description);
          if (manualOwner === "skip") {
            results.push({ action_type: action.action_type, description: action.description, auto_executed: false });
            continue;
          }
          await supabase.from("todos").insert({
            user_id: user.id,
            title: sanitizeTaskTitle(action.description),
            priority: "medium",
            status: "pending",
            is_auto_executed: false,
            patient_id: patientId,
            assignee: manualOwner,
          });

          // Notify the patient if the task is assigned to one
          if (manualOwner === "patient" && patientId && patientRecord?.patient_user_id) {
            await supabase.from("notifications").insert({
              user_id: patientRecord.patient_user_id,
              title: "📋 New task assigned by your doctor",
              description: action.description,
              type: "task_assigned",
            });
          }


          results.push({ action_type: action.action_type, description: action.description, auto_executed: false });
          continue;
        }

        // Auto-execute based on type
        switch (action.action_type) {
          case "schedule_appointment": {
            const startTime = `${action.date}T${action.time || "09:00"}:00`;
            const dur = action.duration_minutes || 30;
            const endDate = new Date(new Date(startTime).getTime() + dur * 60000);

            await supabase.from("appointments").insert({
              user_id: user.id,
              patient_id: patientId,
              title: `Appointment with ${patientRecord?.name || action.patient_name}`,
              start_time: startTime,
              end_time: endDate.toISOString(),
              type: "session",
            });
            break;
          }

          case "write_prescription": {
            await supabase.from("prescriptions").insert({
              doctor_id: user.id,
              patient_id: patientId,
              medication: action.medication || "As discussed",
              dosage: action.dosage || "As directed",
              frequency: action.frequency || "As directed",
              instructions: action.instructions || null,
              status: "active",
            });
            break;
          }

          case "create_invoice": {
            const invoiceNum = `INV-${Date.now().toString(36).toUpperCase()}`;
            const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
            await supabase.from("invoices").insert({
              doctor_id: user.id,
              patient_id: patientId,
              invoice_number: invoiceNum,
              description: action.service_description || action.description,
              amount: action.amount || 0,
              due_date: dueDate,
              status: "pending",
            });
            break;
          }

          case "write_medical_certificate": {
            const certReplacements: Record<string, string> = {
              "ClientName": patientRecord?.name || action.patient_name || "",
              "PatientName": patientRecord?.name || action.patient_name || "",
              "Patient Name": patientRecord?.name || action.patient_name || "",
              "Date": today,
              "SessionDate": today,
              "DoctorName": profile?.full_name || "",
              "PracticeNumber": profile?.practice_number || "",
              "RegistrationNumber": profile?.doctor_number || "",
              "PracticeAddress": profile?.practice_address || "",
              "Reason": action.certificate_reason || "Medical condition",
              "StartDate": action.leave_start || today,
              "EndDate": action.leave_end || today,
            };
            const templateContent = getTemplateContent("Medical Certificate", certReplacements);
            const certContent = templateContent || `<h2>Medical Certificate</h2>
<p><strong>Patient:</strong> ${patientRecord?.name || action.patient_name}</p>
<p><strong>Date:</strong> ${today}</p>
<p><strong>Doctor:</strong> ${profile?.full_name || ""}</p>
<p><strong>Practice Number:</strong> ${profile?.practice_number || ""}</p>
<p><strong>Registration Number:</strong> ${profile?.doctor_number || ""}</p>
<br/>
<p>This is to certify that the above-named patient was examined on ${today} and is unfit for duty from <strong>${action.leave_start || today}</strong> to <strong>${action.leave_end || today}</strong>.</p>
<p><strong>Reason:</strong> ${action.certificate_reason || "Medical condition"}</p>
<br/>
<p>Signature: ____________________</p>`;

            await supabase.from("documents").insert({
              user_id: user.id,
              patient_id: patientId,
              name: `Medical Certificate - ${patientRecord?.name || action.patient_name} - ${today}`,
              content: certContent,
              template_name: "Medical Certificate",
              patient_name: patientRecord?.name || action.patient_name,
            });
            break;
          }

          case "write_referral_letter": {
            const refReplacements: Record<string, string> = {
              "ClientName": patientRecord?.name || action.patient_name || "",
              "PatientName": patientRecord?.name || action.patient_name || "",
              "Patient Name": patientRecord?.name || action.patient_name || "",
              "Date": today,
              "SessionDate": today,
              "DoctorName": profile?.full_name || "",
              "PracticeNumber": profile?.practice_number || "",
              "RegistrationNumber": profile?.doctor_number || "",
              "PracticeAddress": profile?.practice_address || "",
              "Specialty": profile?.specialty || "",
              "ReferralDoctor": action.referral_doctor || "Colleague",
              "ReferralReason": action.referral_reason || "Further assessment and management",
            };
            const refTemplateContent = getTemplateContent("Referral Letter", refReplacements);
            const referralContent = refTemplateContent || `<h2>Referral Letter</h2>
<p><strong>Date:</strong> ${today}</p>
<p><strong>From:</strong> ${profile?.full_name || ""} (${profile?.specialty || ""})</p>
<p><strong>Practice Number:</strong> ${profile?.practice_number || ""}</p>
<p><strong>To:</strong> ${action.referral_doctor || "Colleague"}</p>
<br/>
<p>Dear ${action.referral_doctor || "Colleague"},</p>
<p>I am referring <strong>${patientRecord?.name || action.patient_name}</strong> to your care for the following reason:</p>
<p>${action.referral_reason || "Further assessment and management"}</p>
<br/>
<p>Thank you for seeing this patient.</p>
<p>Kind regards,</p>
<p>${profile?.full_name || ""}</p>`;

            await supabase.from("documents").insert({
              user_id: user.id,
              patient_id: patientId,
              name: `Referral Letter - ${patientRecord?.name || action.patient_name} - ${today}`,
              content: referralContent,
              template_name: "Referral Letter",
              patient_name: patientRecord?.name || action.patient_name,
            });
            break;
          }

          case "write_general_letter": {
            const letterReplacements: Record<string, string> = {
              "ClientName": patientRecord?.name || action.patient_name || "",
              "PatientName": patientRecord?.name || action.patient_name || "",
              "Patient Name": patientRecord?.name || action.patient_name || "",
              "Date": today,
              "SessionDate": today,
              "DoctorName": profile?.full_name || "",
              "PracticeNumber": profile?.practice_number || "",
              "RegistrationNumber": profile?.doctor_number || "",
              "PracticeAddress": profile?.practice_address || "",
              "Subject": action.letter_subject || "General Letter",
              "Content": action.letter_content || action.description,
            };
            const letterTemplateContent = getTemplateContent("General Letterhead", letterReplacements);
            const letterContent = letterTemplateContent || `<h2>${action.letter_subject || "General Letter"}</h2>
<p><strong>Date:</strong> ${today}</p>
<p><strong>From:</strong> ${profile?.full_name || ""}</p>
<p><strong>Practice Number:</strong> ${profile?.practice_number || ""}</p>
<p><strong>Re:</strong> ${patientRecord?.name || action.patient_name}</p>
<br/>
<p>${action.letter_content || action.description}</p>
<br/>
<p>Kind regards,</p>
<p>${profile?.full_name || ""}</p>`;

            await supabase.from("documents").insert({
              user_id: user.id,
              patient_id: patientId,
              name: `${action.letter_subject || "General Letter"} - ${patientRecord?.name || action.patient_name} - ${today}`,
              content: letterContent,
              template_name: "General Letterhead",
              patient_name: patientRecord?.name || action.patient_name,
            });
            break;
          }
        }

        // Create pending todo for the auto-executed action — requires manual approval
        const autoOwner = classifyTask(action.description);
        if (autoOwner !== "skip") {
          await supabase.from("todos").insert({
            user_id: user.id,
            title: sanitizeTaskTitle(action.description),
            priority: "medium",
            status: "pending",
            is_auto_executed: true,
            patient_id: patientId,
            assignee: autoOwner,
          });
        }

        results.push({ action_type: action.action_type, description: action.description, auto_executed: true });
      } catch (actionError) {
        console.error("Action error:", actionError);
        // Fallback to manual todo
        const fallbackOwner = classifyTask(action.description);
        if (fallbackOwner !== "skip") {
          await supabase.from("todos").insert({
            user_id: user.id,
            title: sanitizeTaskTitle(action.description),
            priority: "medium",
            status: "pending",
            is_auto_executed: false,
            assignee: fallbackOwner,
          });
        }

        results.push({
          action_type: action.action_type,
          description: action.description,
          auto_executed: false,
          error: actionError instanceof Error ? actionError.message : "Failed to auto-execute",
        });
      }
    }

    const autoCount = results.filter((r) => r.auto_executed).length;
    const manualCount = results.filter((r) => !r.auto_executed).length;

    return new Response(
      JSON.stringify({
        results,
        summary: `${autoCount} task(s) auto-executed. ${manualCount} task(s) need manual attention.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-todo-actions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
