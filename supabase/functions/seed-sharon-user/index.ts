import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const email = 'sharon.kennedy@testmail.com'
    // If exists, return it
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    const existing = list?.users?.find((u: any) => (u.email ?? '').toLowerCase() === email)
    if (existing) {
      return new Response(JSON.stringify({ user_id: existing.id, existed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: 'Sharon!Test2026',
      email_confirm: true,
      user_metadata: { full_name: 'Sharon Elise Kennedy', role: 'patient' },
    })
    if (error) throw error
    return new Response(JSON.stringify({ user_id: data.user?.id, existed: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
