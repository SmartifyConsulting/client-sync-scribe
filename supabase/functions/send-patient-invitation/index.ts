import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User authentication failed:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { patientEmail, patientName, patientId, doctorName, practiceName }: InvitationRequest = await req.json();
    console.log("Sending invitation to:", patientEmail);

    // Create the invitation record
    const { data: invitation, error: inviteError } = await supabase
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

    // Get the app URL from environment or use a default
    const appUrl = Deno.env.get("APP_URL") || "https://lovable.dev";
    const registrationLink = `${appUrl}/auth?invite=${invitation.token}`;

    // Send the invitation email using Resend REST API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Holarc Health <noreply@smartify.co.za>",
        to: [patientEmail],
        subject: `${doctorName} has invited you to join Holarc`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Holarc</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; margin-top: 0;">Hello ${patientName},</p>
              
              <p><strong>${doctorName}</strong> from <strong>${practiceName}</strong> has invited you to join Holarc - a secure platform for managing your healthcare journey.</p>
              
              <p>With Holarc, you can:</p>
              <ul style="padding-left: 20px;">
                <li>View your appointment calendar</li>
                <li>Access your prescription history</li>
                <li>Review session summaries</li>
                <li>Manage your health information securely</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${registrationLink}" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
                  Create Your Account
                </a>
              </div>
              
              <p style="color: #64748b; font-size: 14px;">This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              
              <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
                Holarc Health - Secure Healthcare Management<br>
                This is an automated message, please do not reply directly to this email.
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error("Failed to send email");
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, invitation: invitation }), {
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
