import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  recipientId: string | null;
  recipientEmail: string | null;
  message: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-user-invitation function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Use anon key for user operations
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Use service key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("User authentication failed:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender's profile
    const { data: senderProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, specialty, role")
      .eq("id", user.id)
      .single();

    const { recipientId, recipientEmail, message }: InvitationRequest = await req.json();
    console.log("Invitation request:", { recipientId, recipientEmail, hasMessage: !!message });

    if (!recipientId && !recipientEmail) {
      return new Response(JSON.stringify({ error: "Recipient ID or email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let finalRecipientId = recipientId;
    let finalRecipientEmail = recipientEmail;

    // If we have recipientId, get their email
    if (recipientId) {
      const { data: recipientProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", recipientId)
        .single();

      if (!recipientProfile) {
        return new Response(JSON.stringify({ error: "Recipient not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get email from auth.users
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(recipientId);
      finalRecipientEmail = authUser?.user?.email || null;
    } else if (recipientEmail) {
      // Check if user exists with this email
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === recipientEmail);
      
      if (existingUser) {
        finalRecipientId = existingUser.id;
      }
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabaseAdmin
      .from("user_invitations")
      .select("id")
      .eq("sender_id", user.id)
      .eq("recipient_email", finalRecipientEmail || recipientEmail)
      .eq("status", "pending")
      .single();

    if (existingInvitation) {
      return new Response(JSON.stringify({ error: "You already have a pending invitation to this user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("user_invitations")
      .insert({
        sender_id: user.id,
        recipient_id: finalRecipientId,
        recipient_email: finalRecipientEmail || recipientEmail,
        message: message,
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

    console.log("Invitation created:", invitation.id);

    // If recipient exists on platform, create notification
    if (finalRecipientId) {
      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: finalRecipientId,
          type: "invitation_received",
          title: "New Connection Invitation",
          description: `${senderProfile?.full_name || "A user"} has invited you to connect${senderProfile?.specialty ? ` (${senderProfile.specialty})` : ""}`,
          reference_id: invitation.id,
          is_read: false,
        });

      if (notifError) {
        console.error("Failed to create notification:", notifError);
      } else {
        console.log("Notification created for recipient:", finalRecipientId);
      }
    }

    // Send email invitation (for both existing and new users)
    const appUrl = Deno.env.get("APP_URL") || "https://miri360.health";
    const senderName = senderProfile?.full_name || "A mIRI360 user";
    const senderRole = senderProfile?.role === "doctor" ? "healthcare provider" : "user";

    const emailHtml = finalRecipientId ? `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">New Connection Request</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 18px; margin-top: 0;">Hello,</p>
          
          <p><strong>${senderName}</strong>${senderProfile?.specialty ? ` (${senderProfile.specialty})` : ""} would like to connect with you on mIRI360.</p>
          
          ${message ? `<div style="background: white; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">Personal message:</p>
            <p style="margin: 10px 0 0 0;">"${message}"</p>
          </div>` : ""}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/notifications" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
              View Invitation
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">Log in to mIRI360 to accept or decline this invitation.</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
            mIRI360 - Secure Healthcare Management<br>
            This is an automated message, please do not reply directly to this email.
          </p>
        </div>
      </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited to mIRI360</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 18px; margin-top: 0;">Hello,</p>
          
          <p><strong>${senderName}</strong>, a ${senderRole} on mIRI360, has invited you to join the platform and connect with them.</p>
          
          ${message ? `<div style="background: white; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">Personal message:</p>
            <p style="margin: 10px 0 0 0;">"${message}"</p>
          </div>` : ""}
          
          <p><strong>What is mIRI360?</strong></p>
          <p>mIRI360 is a secure healthcare management platform that gives you a 360-degree view of your complete healthcare profile. With mIRI360, you can:</p>
          <ul style="padding-left: 20px;">
            <li>Access your complete medical history in one place</li>
            <li>Coordinate care across multiple healthcare providers</li>
            <li>View appointments, prescriptions, and session summaries</li>
            <li>Securely communicate with your healthcare team</li>
            <li>Manage who has access to your health information</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
              Join mIRI360 Now
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
            mIRI360 - Secure Healthcare Management<br>
            This is an automated message, please do not reply directly to this email.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    if (RESEND_API_KEY && (finalRecipientEmail || recipientEmail)) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "mIRI360 <onboarding@resend.dev>",
            to: [finalRecipientEmail || recipientEmail],
            subject: finalRecipientId 
              ? `${senderName} wants to connect with you on mIRI360`
              : `${senderName} has invited you to join mIRI360`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error("Resend API error:", errorData);
        } else {
          console.log("Email sent successfully");
        }
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      invitation: invitation,
      sentToExistingUser: !!finalRecipientId,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-user-invitation function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
