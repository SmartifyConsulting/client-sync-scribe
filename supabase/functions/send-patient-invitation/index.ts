import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  patientEmail: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  practiceName: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-patient-invitation function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth client (user context)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client (service role for user lookups)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { patientEmail, patientName, patientId, doctorName, practiceName }: InvitationRequest = await req.json();
    console.log("Processing invitation for:", patientEmail);

    // Check if user already exists on the platform
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // Search by email using a more targeted approach
    const { data: profileMatch } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(100);

    // Look up user by email via admin API
    let existingUser: { id: string; email?: string } | null = null;
    try {
      // Use listUsers with filter - the API doesn't support email filter directly,
      // so we'll look up via auth.admin
      const { data: allUsersPage } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (allUsersPage?.users) {
        const found = allUsersPage.users.find(u => u.email?.toLowerCase() === patientEmail.toLowerCase());
        if (found) {
          existingUser = { id: found.id, email: found.email };
        }
      }
    } catch (e) {
      console.warn("Could not search users:", e);
    }

    if (existingUser) {
      // ── USER ALREADY EXISTS ──
      console.log("User already exists:", existingUser.id);

      // Link patient record if not already linked
      if (patientId) {
        await supabaseAdmin
          .from('patients')
          .update({ patient_user_id: existingUser.id })
          .eq('id', patientId)
          .is('patient_user_id', null);
      }

      // Create doctor_patient_access record if not exists
      const { data: existingAccess } = await supabaseAdmin
        .from('doctor_patient_access')
        .select('id')
        .eq('doctor_id', user.id)
        .eq('patient_user_id', existingUser.id)
        .maybeSingle();

      if (!existingAccess) {
        await supabaseAdmin.from('doctor_patient_access').insert({
          doctor_id: user.id,
          patient_user_id: existingUser.id,
          permissions: ['view_records', 'create_sessions'],
          is_active: true,
        });
      }

      // Send in-app notification
      await supabaseAdmin.from('notifications').insert({
        user_id: existingUser.id,
        type: 'connection',
        title: `${doctorName} has connected with you`,
        description: `${doctorName} from ${practiceName} has added you as a patient. You can now view your sessions and documents.`,
      });

      // Send a "connected" email (not "Create Account")
      {
        const appUrl = Deno.env.get("APP_URL") || "https://lovable.dev";
        await sendEmail({
          to: patientEmail,
          subject: `${doctorName} has connected with you on Indigro`,
          html: `
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Indigro</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                  <p style="font-size: 18px; margin-top: 0;">Hello ${patientName},</p>
                  <p><strong>${doctorName}</strong> from <strong>${practiceName}</strong> has connected with you on Indigro.</p>
                  <p>You can now:</p>
                  <ul style="padding-left: 20px;">
                    <li>View your appointment calendar</li>
                    <li>Access your consultation summaries</li>
                    <li>Review prescriptions and documents</li>
                  </ul>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${appUrl}/patient/dashboard" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                      View Dashboard
                    </a>
                  </div>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                  <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
                    Indigro - Secure Healthcare Management
                  </p>
                </div>
              </body>
              </html>
          `,
        });
      }

      return new Response(JSON.stringify({ success: true, alreadyExists: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── USER DOES NOT EXIST — Send "Create Your Account" invitation ──
    console.log("User does not exist, sending invitation email");

    const { data: invitation, error: inviteError } = await supabaseAuth
      .from("patient_invitations")
      .insert({
        doctor_id: user.id,
        patient_email: patientEmail,
        patient_id: patientId,
        status: "pending",
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Failed to create invitation:", inviteError);
      return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = Deno.env.get("APP_URL") || "https://lovable.dev";
    const registrationLink = `${appUrl}/auth?invite=${invitation.token}`;

    const emailResponse = await sendEmail({
      to: patientEmail,
      subject: `${doctorName} has invited you to join Indigro`,
      html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Indigro</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; margin-top: 0;">Hello ${patientName},</p>
              <p><strong>${doctorName}</strong> from <strong>${practiceName}</strong> has invited you to join Indigro - a secure platform for managing your wealth management journey.</p>
              <p>With Indigro, you can:</p>
              <ul style="padding-left: 20px;">
                <li>View your appointment calendar</li>
                <li>Access your prescription history</li>
                <li>Review consultation summaries</li>
                <li>Manage your financial information securely</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${registrationLink}" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                  Create Your Account
                </a>
              </div>
              <p style="color: #64748b; font-size: 14px;">This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
                Indigro - Secure Healthcare Management<br>
                This is an automated message, please do not reply directly to this email.
              </p>
            </div>
          </body>
          </html>
      `,
    });

    if (!emailResponse.ok) {
      console.error("Email send error:", emailResponse.error);
      throw new Error("Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, invitation }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-patient-invitation function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
