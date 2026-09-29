import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InvitationRequest {
  recipientId?: string | null;
  recipientEmail?: string | null;
  message?: string | null;
  senderName?: string | null;
  isPracticePartner?: boolean;
  partnerName?: string | null;
  isReferral?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-user-invitation function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: senderProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, specialty, role")
      .eq("id", user.id)
      .single();

    const { recipientId, recipientEmail, message, isPracticePartner, partnerName, isReferral }: InvitationRequest = await req.json();
    console.log("Invitation request:", { recipientId, recipientEmail, hasMessage: !!message, isPracticePartner, isReferral });

    if (!recipientId && !recipientEmail) {
      return new Response(JSON.stringify({ error: "Recipient ID or email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let finalRecipientId = recipientId || null;
    let finalRecipientEmail = recipientEmail || null;

    // If we have recipientId, get their email
    if (recipientId) {
      const { data: recipientProfile } = await supabaseAdmin
        .from("profiles").select("id").eq("id", recipientId).single();
      if (!recipientProfile) {
        return new Response(JSON.stringify({ error: "Recipient not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(recipientId);
      finalRecipientEmail = authUser?.user?.email || null;
    } else if (recipientEmail) {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === recipientEmail);
      if (existingUser) {
        finalRecipientId = existingUser.id;
      }
    }

    // Handle practice partner: create pending user if they don't exist
    if (isPracticePartner && !finalRecipientId && finalRecipientEmail) {
      try {
        const tempPassword = crypto.randomUUID();
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: finalRecipientEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: partnerName || "" },
        });

        if (!createError && newUser?.user) {
          finalRecipientId = newUser.user.id;
          // Create profile as pending
          await supabaseAdmin.from("profiles").upsert({
            id: newUser.user.id,
            full_name: partnerName || "",
            status: "pending",
          });
          // Assign doctor role
          await supabaseAdmin.from("user_roles").insert({
            user_id: newUser.user.id,
            role: "doctor",
          });
          console.log("Created pending partner user:", newUser.user.id);
        } else {
          console.error("Failed to create partner user:", createError);
        }
      } catch (partnerError) {
        console.error("Error creating partner user:", partnerError);
      }
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabaseAdmin
      .from("user_invitations")
      .select("id")
      .eq("sender_id", user.id)
      .eq("recipient_email", finalRecipientEmail || recipientEmail || "")
      .eq("status", "pending")
      .single();

    if (existingInvitation) {
      return new Response(JSON.stringify({ error: "You already have a pending invitation to this user" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      .select().single();

    if (inviteError) {
      console.error("Failed to create invitation:", inviteError);
      return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If recipient exists on platform, create notification
    if (finalRecipientId) {
      await supabaseAdmin.from("notifications").insert({
        user_id: finalRecipientId,
        type: isReferral ? "app_referral" : "invitation_received",
        title: isReferral ? "App Invitation" : "New Connection Invitation",
        description: isReferral
          ? `${senderProfile?.full_name || "A user"} has invited you to join Holarc`
          : `${senderProfile?.full_name || "A user"} has invited you to connect${senderProfile?.specialty ? ` (${senderProfile.specialty})` : ""}`,
        reference_id: invitation.id,
        is_read: false,
      });
    }

    // Send email
    const appUrl = Deno.env.get("APP_URL") || "https://holarc.health";
    const senderName = senderProfile?.full_name || "A Holarc user";
    const senderRole = senderProfile?.role === "doctor" ? "Wealth Manager" : "user";

    const emailHtml = finalRecipientId && !isPracticePartner ? `
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">New Connection Request</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 18px; margin-top: 0;">Hello,</p>
          <p><strong>${senderName}</strong>${senderProfile?.specialty ? ` (${senderProfile.specialty})` : ""} would like to connect with you on Indigro.</p>
          ${message ? `<div style="background: white; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;"><p style="margin: 0; color: #64748b; font-size: 14px;">Personal message:</p><p style="margin: 10px 0 0 0;">"${message}"</p></div>` : ""}
          <div style="text-align: center; margin: 30px 0;"><a href="${appUrl}/notifications" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">View Invitation</a></div>
          <p style="color: #64748b; font-size: 14px;">Log in to Indigro to accept or decline this invitation.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Indigro - Secure Wealth management Management</p>
        </div>
      </body></html>
    ` : `
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${isPracticePartner ? "You've Been Added as a Practice Partner" : "You're Invited to Holarc"}</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 18px; margin-top: 0;">Hello${partnerName ? ` ${partnerName}` : ""},</p>
          <p><strong>${senderName}</strong>, a ${senderRole} on Indigro, has ${isPracticePartner ? "added you as a practice partner" : "invited you to join the platform"}.</p>
          ${isPracticePartner ? `<p>Your account has been created. Please log in and update your password to activate your account.</p>` : ""}
          ${message ? `<div style="background: white; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;"><p style="margin: 0; color: #64748b; font-size: 14px;">Personal message:</p><p style="margin: 10px 0 0 0;">"${message}"</p></div>` : ""}
          <div style="text-align: center; margin: 30px 0;"><a href="${appUrl}" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">${isPracticePartner ? "Log In & Set Password" : "Join Holarc Now"}</a></div>
          <p style="color: #64748b; font-size: 14px;">This invitation expires in 7 days.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Indigro - Secure Wealth management Management</p>
        </div>
      </body></html>
    `;

    if (finalRecipientEmail || recipientEmail) {
      const emailResponse = await sendEmail({
        to: (finalRecipientEmail || recipientEmail) as string,
        subject: isPracticePartner
          ? `${senderName} added you as a practice partner on Holarc`
          : finalRecipientId
            ? `${senderName} wants to connect with you on Holarc`
            : `${senderName} has invited you to join Holarc`,
        html: emailHtml,
      });
      if (!emailResponse.ok) console.error("Email send error:", emailResponse.error);
      else console.log("Email sent successfully");
    }

    return new Response(JSON.stringify({ success: true, invitation, sentToExistingUser: !!finalRecipientId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-user-invitation function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
