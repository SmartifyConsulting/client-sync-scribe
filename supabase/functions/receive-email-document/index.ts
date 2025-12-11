import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded
    contentType: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: EmailPayload = await req.json();
    console.log("Received email payload:", {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      attachmentsCount: payload.attachments?.length || 0,
    });

    // Extract the recipient email (the user's mailbox)
    const recipientEmail = payload.to?.toLowerCase();
    
    if (!recipientEmail) {
      console.error("No recipient email provided");
      return new Response(
        JSON.stringify({ error: "No recipient email provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the user by their email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error listing users:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to find user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === recipientEmail);
    
    if (!user) {
      console.error("User not found for email:", recipientEmail);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found user:", user.id);

    // Create document content from email
    const documentContent = `
# Document Received via Email

**From:** ${payload.from}
**Date:** ${new Date().toISOString()}
**Subject:** ${payload.subject}

---

${payload.text || payload.html || "No content"}

${payload.attachments && payload.attachments.length > 0 
  ? `\n---\n\n**Attachments:** ${payload.attachments.map(a => a.filename).join(", ")}`
  : ""
}
    `.trim();

    // Create the document in the database
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        name: `Email: ${payload.subject || "No Subject"} - ${new Date().toLocaleDateString()}`,
        content: documentContent,
        template_name: "Email Document",
      })
      .select()
      .single();

    if (docError) {
      console.error("Error creating document:", docError);
      return new Response(
        JSON.stringify({ error: "Failed to create document" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Document created successfully:", document.id);

    // If there are attachments, we could store them in Supabase Storage
    // For now, we just note them in the document content

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Document saved successfully",
        documentId: document.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: unknown) {
    console.error("Error processing email:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process email";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
