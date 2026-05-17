import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_ENV = (Deno.env.get("PAYPAL_ENV") || "sandbox").toLowerCase();
const PAYPAL_BASE = PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

const PLAN_TYPES = ["doctor", "patient", "emergency"] as const;
const BILLING_CYCLES = ["monthly", "annual"] as const;

const BodySchema = z.object({
  action: z.enum(["create-trial", "cancel", "reactivate"]).optional(),
  planType: z.enum(PLAN_TYPES).optional(),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
  userId: z.string().uuid().optional(),
});

interface Plan { price: number; name: string; }

async function getPlan(
  supabase: any,
  planType: string,
  billingCycle: string,
): Promise<Plan | null> {
  const { data, error } = await supabase
    .from("pricing_config")
    .select("price, name")
    .eq("role", planType)
    .eq("billing_cycle", billingCycle)
    .maybeSingle();
  if (error || !data) {
    console.error("Pricing lookup failed", { planType, billingCycle, error });
    return null;
  }
  return { price: Number(data.price), name: data.name };
}


async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("PayPal auth error:", error);
    throw new Error("Failed to authenticate with PayPal");
  }

  const data = await response.json();
  return data.access_token;
}

async function createPayPalOrder(
  supabase: any,
  accessToken: string,
  planType: string,
  billingCycle: string,
): Promise<any> {
  const plan = await getPlan(supabase, planType, billingCycle);

  if (!plan) {
    throw new Error("Invalid plan configuration");
  }

  const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: plan.price.toFixed(2),
          },
          description: plan.name,
        },
      ],
      application_context: {
        brand_name: "Holarc Health",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/paypal-subscription?action=capture`,
        cancel_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/paypal-subscription?action=cancel`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("PayPal create order error:", error);
    throw new Error("Failed to create PayPal order");
  }

  return await response.json();
}

async function capturePayPalOrder(accessToken: string, orderId: string): Promise<any> {
  const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("PayPal capture error:", error);
    throw new Error("Failed to capture PayPal order");
  }

  return await response.json();
}

async function sendSubscriptionEmail(email: string, subject: string, htmlContent: string): Promise<void> {
  const { sendEmail } = await import("../_shared/email.ts");
  const result = await sendEmail({ to: email, subject, html: htmlContent });
  if (!result.ok) {
    console.error("Error sending email:", result.error);
  } else {
    console.log("Email sent successfully to:", email);
  }
}

async function getUserEmail(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) {
    console.error("Error getting user email:", error);
    return null;
  }
  return data.user.email;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("PayPal subscription action:", action);

    if (req.method === "POST") {
      // Authenticate the caller
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "No authorization header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: callerUser }, error: authError } = await supabaseUser.auth.getUser();
      if (authError || !callerUser) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawBody = await req.json();
      const parsed = BodySchema.safeParse(rawBody);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body: any = { ...parsed.data };

      // Enforce that userId matches the authenticated caller
      if (body.userId && body.userId !== callerUser.id) {
        return new Response(JSON.stringify({ error: "Forbidden: userId mismatch" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Override userId with authenticated user's ID
      body.userId = callerUser.id;

      // Handle trial subscription creation
      if (body.action === "create-trial") {
        const { planType, billingCycle, userId } = body;

        console.log("Creating trial subscription for:", { planType, billingCycle, userId });

        if (!planType || !billingCycle || !userId) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const accessToken = await getPayPalAccessToken();
        const order = await createPayPalOrder(supabase, accessToken, planType, billingCycle);

        console.log("PayPal trial order created:", order.id);

        // Calculate trial end date (7 days from now)
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        // Update subscription with trial info
        await supabase
          .from("subscriptions")
          .update({
            paypal_subscription_id: order.id,
            is_trial: true,
            trial_ends_at: trialEndsAt.toISOString(),
            status: "trial_pending",
          })
          .eq("user_id", userId);

        const approvalUrl = order.links?.find((link: any) => link.rel === "approve")?.href;

        return new Response(
          JSON.stringify({
            orderId: order.id,
            approvalUrl,
            status: order.status,
            isTrial: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Handle cancel subscription
      if (body.action === "cancel") {
        const { userId } = body;

        if (!userId) {
          return new Response(JSON.stringify({ error: "Missing userId" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Cancelling subscription for user:", userId);

        // Get subscription details before cancelling
        const { data: subscription } = await supabase.from("subscriptions").select("*").eq("user_id", userId).single();

        // Update subscription to cancelled
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("Error cancelling subscription:", updateError);
          throw new Error("Failed to cancel subscription");
        }

        // Send cancellation email
        const userEmail = await getUserEmail(supabase, userId);
        if (userEmail && subscription) {
          const endDate = subscription.current_period_end
            ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "the end of your billing period";

          await sendSubscriptionEmail(
            userEmail,
            "Your Holarc Subscription Has Been Cancelled",
            `
              <h1>Subscription Cancelled</h1>
              <p>We're sorry to see you go!</p>
              <p>Your Holarc subscription has been cancelled. You will continue to have access to all features until <strong>${endDate}</strong>.</p>
              <p>If you change your mind, you can reactivate your subscription at any time from your Settings page.</p>
              <p>Thank you for being a Holarc user.</p>
              <p>Best regards,<br>The Holarc Team</p>
            `,
          );
        }

        return new Response(JSON.stringify({ success: true, message: "Subscription cancelled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle reactivate subscription (same as new subscription)
      if (body.action === "reactivate") {
        const { planType, billingCycle, userId } = body;

        console.log("Reactivating subscription for:", { planType, billingCycle, userId });

        if (!planType || !billingCycle || !userId) {
          return new Response(JSON.stringify({ error: "Missing required fields: planType, billingCycle, userId" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const accessToken = await getPayPalAccessToken();
        const order = await createPayPalOrder(supabase, accessToken, planType, billingCycle);

        console.log("PayPal reactivation order created:", order.id);

        // Update subscription with new PayPal order ID
        await supabase
          .from("subscriptions")
          .update({
            plan_type: planType,
            billing_cycle: billingCycle,
            paypal_subscription_id: order.id,
            status: "inactive",
          })
          .eq("user_id", userId);

        const approvalUrl = order.links?.find((link: any) => link.rel === "approve")?.href;

        return new Response(
          JSON.stringify({
            orderId: order.id,
            approvalUrl,
            status: order.status,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Handle new subscription
      const { planType, billingCycle, userId } = body;

      console.log("Creating PayPal order for:", { planType, billingCycle, userId });

      if (!planType || !billingCycle || !userId) {
        return new Response(JSON.stringify({ error: "Missing required fields: planType, billingCycle, userId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getPayPalAccessToken();
      const order = await createPayPalOrder(supabase, accessToken, planType, billingCycle);

      console.log("PayPal order created:", order.id);

      // Store pending subscription info
      const { error: upsertError } = await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          plan_type: planType,
          billing_cycle: billingCycle,
          status: "inactive",
          paypal_subscription_id: order.id,
        },
        { onConflict: "user_id" },
      );

      if (upsertError) {
        console.error("Error storing subscription:", upsertError);
      }

      // Find the approval URL
      const approvalUrl = order.links?.find((link: any) => link.rel === "approve")?.href;

      return new Response(
        JSON.stringify({
          orderId: order.id,
          approvalUrl,
          status: order.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "capture") {
      const orderId = url.searchParams.get("token");

      if (!orderId) {
        return new Response("Missing order ID", { status: 400, headers: corsHeaders });
      }

      console.log("Capturing PayPal order:", orderId);

      const accessToken = await getPayPalAccessToken();
      const captureResult = await capturePayPalOrder(accessToken, orderId);

      console.log("PayPal capture result:", captureResult.status);

      if (captureResult.status === "COMPLETED") {
        // Get subscription details
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("paypal_subscription_id", orderId)
          .single();

        if (subscription) {
          const now = new Date();
          
          // Check if this is a trial subscription
          const isTrial = subscription.is_trial;
          const trialEndsAt = isTrial ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
          const periodEnd = isTrial 
            ? trialEndsAt 
            : subscription.billing_cycle === "annual"
              ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
              : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          // Update subscription to active (or trial_active)
          await supabase
            .from("subscriptions")
            .update({
              status: isTrial ? "trial_active" : "active",
              current_period_start: now.toISOString(),
              current_period_end: periodEnd?.toISOString(),
              trial_ends_at: trialEndsAt?.toISOString(),
            })
            .eq("paypal_subscription_id", orderId);

          // Get plan details for payment history (only record if not trial)
          const plan = await getPlan(supabase, subscription.plan_type, subscription.billing_cycle);

          // Get transaction ID from capture result
          const transactionId = captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id;

          // Record payment in history (even for trial setup - amount will be captured later)
          if (!isTrial) {
            await supabase.from("payment_history").insert({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              paypal_transaction_id: transactionId || orderId,
              amount: plan?.price || 0,
              currency: "USD",
              description: plan?.name || "Subscription Payment",
              status: "completed",
            });
          }

          console.log("Subscription updated:", isTrial ? "trial_active" : "active");

          // Award referral Vulas if this user was referred
          if (!isTrial) {
            try {
              const userEmail = await getUserEmail(supabase, subscription.user_id);
              if (userEmail) {
                // Check if this user was referred via user_invitations
                const { data: invitation } = await supabase
                  .from("user_invitations")
                  .select("sender_id, status")
                  .eq("recipient_email", userEmail)
                  .in("status", ["accepted", "pending"])
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (invitation?.sender_id) {
                  const referrerId = invitation.sender_id;
                  const REFERRAL_VULAS = 50;

                  // Check referrer's role
                  const { data: referrerRole } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", referrerId)
                    .maybeSingle();

                  // Award to referrer
                  if (referrerRole?.role === "patient") {
                    // Get referrer's patient record
                    const { data: referrerPatient } = await supabase
                      .from("patients")
                      .select("id")
                      .eq("patient_user_id", referrerId)
                      .limit(1)
                      .maybeSingle();
                    if (referrerPatient) {
                      await supabase.from("patient_rewards").insert({
                        patient_id: referrerPatient.id,
                        awarded_by: referrerId,
                        lollipops_count: REFERRAL_VULAS,
                        reward_type: "referral",
                        visit_category: "app_referral",
                      });
                    }
                  } else {
                    await supabase.from("doctor_rewards").insert({
                      doctor_id: referrerId,
                      vulas_count: REFERRAL_VULAS,
                      reward_type: "referral",
                      description: `Referral reward: ${userEmail} subscribed`,
                    });
                  }

                  // Update invitation status
                  await supabase
                    .from("user_invitations")
                    .update({ status: "accepted" })
                    .eq("sender_id", referrerId)
                    .eq("recipient_email", userEmail);

                  console.log("Referral Vulas awarded to:", referrerId);
                }
              }
            } catch (refErr) {
              console.error("Error awarding referral Vulas:", refErr);
            }
          }

          // Send activation email
          const userEmailForNotif = await getUserEmail(supabase, subscription.user_id);
          if (userEmailForNotif) {
            const emailSubject = isTrial 
              ? "Welcome to Holarc - Your 7-Day Free Trial Has Started!"
              : "Welcome to Holarc - Subscription Activated!";
            
            const trialEndDate = trialEndsAt?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
            const billingDate = periodEnd?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

            const emailContent = isTrial ? `
              <h1>Your Free Trial Has Started!</h1>
              <p>Welcome to Holarc! Your 7-day free trial is now active.</p>
              <p><strong>Trial ends:</strong> ${trialEndDate}</p>
              <p><strong>Plan:</strong> ${plan?.name || "Subscription"}</p>
              <p><strong>After trial:</strong> $${plan?.price.toFixed(2) || "0.00"} USD/month</p>
              <p>You have full access to all Holarc features during your trial. If you wish to cancel, please do so before ${trialEndDate} to avoid being charged.</p>
              <p>Best regards,<br>The Holarc Team</p>
            ` : `
              <h1>Your Subscription is Active!</h1>
              <p>Thank you for subscribing to Holarc!</p>
              <p><strong>Plan:</strong> ${plan?.name || "Subscription"}</p>
              <p><strong>Amount:</strong> $${plan?.price.toFixed(2) || "0.00"} USD</p>
              <p><strong>Next billing date:</strong> ${billingDate}</p>
              <p>Best regards,<br>The Holarc Team</p>
            `;

            await sendSubscriptionEmail(userEmailForNotif, emailSubject, emailContent);
          }
        }

        // Redirect to settings with success
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            Location: "/settings?payment=success",
          },
        });
      }

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: "/settings?payment=failed",
        },
      });
    }

    if (action === "cancel") {
      console.log("Payment cancelled by user");
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: "/settings?payment=cancelled",
        },
      });
    }

    // Get subscription status
    if (req.method === "GET" && !action) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "No authorization header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: subscription } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).single();

      return new Response(JSON.stringify({ subscription }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("PayPal subscription error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
