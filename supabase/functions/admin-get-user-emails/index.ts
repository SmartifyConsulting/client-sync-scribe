import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return json({ error: 'unauthenticated' }, 401);

    const supaUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes } = await supaUser.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) return json({ error: 'unauthenticated' }, 401);

    const { data: isAdmin } = await supaUser.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) return json({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.user_ids) ? body.user_ids.filter((s: unknown) => typeof s === 'string') : [];
    if (!ids.length) return json({ emails: {} });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const emails: Record<string, string> = {};
    for (const id of ids) {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user?.email) emails[id] = data.user.email;
    }
    return json({ emails });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
