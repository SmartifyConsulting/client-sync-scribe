import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClaimRequest {
  invoiceId: string;
  claimsEmail: string;
  patientName: string;
  patientEmail: string;
  invoiceNumber: string;
  amount: number;
  description: string;
  doctorName: string;
  dueDate: string;
  medicalInsurance: string;
  medicalInsuranceNumber: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Submit insurance claim function called");

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

    const {
      invoiceId,
      claimsEmail,
      patientName,
      patientEmail,
      invoiceNumber,
      amount,
      description,
      doctorName,
      dueDate,
      medicalInsurance,
      medicalInsuranceNumber,
    }: ClaimRequest = await req.json();

    console.log(`Submitting claim for invoice ${invoiceNumber} to ${claimsEmail}`);

    const formattedAmount = new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(amount);

    // Send the claim email using Resend REST API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "mIRI Claims <onboarding@resend.dev>",
        to: [claimsEmail],
        subject: `Medical Insurance Claim - ${invoiceNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
              .detail-label { font-weight: bold; color: #666; }
              .amount { font-size: 24px; color: #0066cc; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Medical Insurance Claim Submission</h1>
              </div>
              <div class="content">
                <p>Dear Claims Department,</p>
                <p>Please find below the details for a medical insurance claim submission:</p>
                
                <div class="details">
                  <h3>Patient Information</h3>
                  <div class="detail-row">
                    <span class="detail-label">Patient Name:</span>
                    <span>${patientName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Patient Email:</span>
                    <span>${patientEmail || "Not provided"}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Insurance Provider:</span>
                    <span>${medicalInsurance || "Not specified"}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Membership Number:</span>
                    <span>${medicalInsuranceNumber || "Not provided"}</span>
                  </div>
                </div>
                
                <div class="details">
                  <h3>Invoice Details</h3>
                  <div class="detail-row">
                    <span class="detail-label">Invoice Number:</span>
                    <span>${invoiceNumber}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Service Description:</span>
                    <span>${description}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Attending Doctor:</span>
                    <span>${doctorName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Due Date:</span>
                    <span>${dueDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Amount Claimed:</span>
                    <span class="amount">${formattedAmount}</span>
                  </div>
                </div>
                
                <p>Please process this claim at your earliest convenience.</p>
                <p>Thank you for your assistance.</p>
              </div>
              <div class="footer">
                <p>This claim was submitted via MediPad Healthcare Management System</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error("Failed to send claim email");
    }

    const emailResult = await emailResponse.json();
    console.log("Claim email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in submit-insurance-claim function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
