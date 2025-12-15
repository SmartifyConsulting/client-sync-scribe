import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan pricing in USD
const PLANS = {
  doctor: {
    monthly: { price: 49.99, name: 'Doctor Monthly Plan' },
    annual: { price: 499.99, name: 'Doctor Annual Plan' }
  },
  patient: {
    monthly: { price: 9.99, name: 'Patient Monthly Plan' },
    annual: { price: 99.99, name: 'Patient Annual Plan' }
  }
};

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal auth error:', error);
    throw new Error('Failed to authenticate with PayPal');
  }

  const data = await response.json();
  return data.access_token;
}

async function createPayPalOrder(accessToken: string, planType: string, billingCycle: string): Promise<any> {
  const plan = PLANS[planType as keyof typeof PLANS]?.[billingCycle as 'monthly' | 'annual'];
  
  if (!plan) {
    throw new Error('Invalid plan configuration');
  }

  const response = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: plan.price.toFixed(2),
        },
        description: plan.name,
      }],
      application_context: {
        brand_name: 'MedPad',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paypal-subscription?action=capture`,
        cancel_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paypal-subscription?action=cancel`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal create order error:', error);
    throw new Error('Failed to create PayPal order');
  }

  return await response.json();
}

async function capturePayPalOrder(accessToken: string, orderId: string): Promise<any> {
  const response = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal capture error:', error);
    throw new Error('Failed to capture PayPal order');
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('PayPal subscription action:', action);

    if (req.method === 'POST') {
      const body = await req.json();
      const { planType, billingCycle, userId } = body;

      console.log('Creating PayPal order for:', { planType, billingCycle, userId });

      if (!planType || !billingCycle || !userId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: planType, billingCycle, userId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const accessToken = await getPayPalAccessToken();
      const order = await createPayPalOrder(accessToken, planType, billingCycle);

      console.log('PayPal order created:', order.id);

      // Store pending subscription info
      const { error: upsertError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_type: planType,
          billing_cycle: billingCycle,
          status: 'inactive',
          paypal_subscription_id: order.id,
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('Error storing subscription:', upsertError);
      }

      // Find the approval URL
      const approvalUrl = order.links?.find((link: any) => link.rel === 'approve')?.href;

      return new Response(
        JSON.stringify({ 
          orderId: order.id, 
          approvalUrl,
          status: order.status 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'capture') {
      const orderId = url.searchParams.get('token');
      
      if (!orderId) {
        return new Response('Missing order ID', { status: 400, headers: corsHeaders });
      }

      console.log('Capturing PayPal order:', orderId);

      const accessToken = await getPayPalAccessToken();
      const captureResult = await capturePayPalOrder(accessToken, orderId);

      console.log('PayPal capture result:', captureResult.status);

      if (captureResult.status === 'COMPLETED') {
        // Update subscription to active
        const now = new Date();
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('paypal_subscription_id', orderId)
          .single();

        if (subscription) {
          const periodEnd = subscription.billing_cycle === 'annual'
            ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
            })
            .eq('paypal_subscription_id', orderId);
        }

        // Redirect to settings with success
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': '/settings?payment=success',
          },
        });
      }

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': '/settings?payment=failed',
        },
      });
    }

    if (action === 'cancel') {
      console.log('Payment cancelled by user');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': '/settings?payment=cancelled',
        },
      });
    }

    // Get subscription status
    if (req.method === 'GET' && !action) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'No authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return new Response(
        JSON.stringify({ subscription }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('PayPal subscription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});