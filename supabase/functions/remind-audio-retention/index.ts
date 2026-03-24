import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Delete audio for sessions older than 7 days
    const { data: expiredSessions } = await supabase
      .from("sessions")
      .select("id, user_id, patient_id, audio_url")
      .not("audio_url", "is", null)
      .lt("created_at", sevenDaysAgo);

    if (expiredSessions && expiredSessions.length > 0) {
      for (const session of expiredSessions) {
        // Extract storage path from URL
        if (session.audio_url) {
          const urlParts = session.audio_url.split("/session-audio/");
          if (urlParts[1]) {
            await supabase.storage.from("session-audio").remove([urlParts[1]]);
          }
        }
        // Clear audio_url
        await supabase.from("sessions").update({ audio_url: null }).eq("id", session.id);
      }
      console.log(`Deleted audio for ${expiredSessions.length} expired sessions`);

      // Also clear transcripts and notes for expired sessions (keep summary and action_points)
      for (const session of expiredSessions) {
        await supabase.from("sessions").update({ transcript: null, notes: null }).eq("id", session.id);
      }
      console.log(`Cleared transcripts/notes for ${expiredSessions.length} expired sessions`);
    }

    // 2. Send reminder notifications for sessions expiring soon (6+ days old)
    const { data: expiringSessions } = await supabase
      .from("sessions")
      .select("id, user_id, patient_id")
      .not("audio_url", "is", null)
      .lt("created_at", sixDaysAgo)
      .gte("created_at", sevenDaysAgo);

    if (expiringSessions && expiringSessions.length > 0) {
      const doctorIds = [...new Set(expiringSessions.map(s => s.user_id))];
      
      for (const doctorId of doctorIds) {
        const count = expiringSessions.filter(s => s.user_id === doctorId).length;
        await supabase.from("notifications").insert({
          user_id: doctorId,
          type: "audio_retention",
          title: "Session recordings expiring soon",
          description: `You have ${count} session recording(s) that will be deleted tomorrow. Download them from Sessions to keep.`,
        });
      }

      // Notify patients too
      const patientIds = [...new Set(expiringSessions.map(s => s.patient_id))];
      for (const patientId of patientIds) {
        const { data: patient } = await supabase
          .from("patients")
          .select("patient_user_id")
          .eq("id", patientId)
          .maybeSingle();
        
        if (patient?.patient_user_id) {
          await supabase.from("notifications").insert({
            user_id: patient.patient_user_id,
            type: "audio_retention",
            title: "Session recordings expiring soon",
            description: "Some of your session recordings will be deleted tomorrow. Contact your doctor if you need copies.",
          });
        }
      }
      console.log(`Sent retention reminders for ${expiringSessions.length} sessions`);
    }

    return new Response(
      JSON.stringify({ 
        deleted: expiredSessions?.length || 0, 
        reminded: expiringSessions?.length || 0 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Audio retention error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
