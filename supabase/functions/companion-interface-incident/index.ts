import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

// Accept only the monitor's finite structural vocabulary; never arbitrary page text.
const labels = ["unmapped","login","log in","sign in","continue","next","back","cancel","close","dismiss","ok","search","save","save client","new quote","create quote","get a quote","calculate","calculate premium","generate quote report","download","download pdf","quotes","clients","client","policy details","benefit details","benefits and proposals","my myriad business","proposal construction","set client objectives","build income scenarios","compare scenarios","username","password","email","email address","first name","surname","last name","identity number","id number","date of birth","gender","smoking status","occupation","benefit amount","monthly benefit","cover growth","premium pattern","increase option","title","tax status"] as const;
const signature = z.union([
  z.tuple([z.literal("field"),z.enum(["input","select","textarea"]),z.enum(["password","email","tel","text","number","date","checkbox","radio","other"]),z.enum(labels),z.boolean(),z.boolean(),z.number().int().min(0).max(8)]),
  z.tuple([z.literal("action"),z.enum(["button","a","div","span","input","li","other"]),z.enum(["","button","tab"]),z.enum(labels),z.boolean(),z.number().int().min(0).max(8)]),
]);
const count=z.number().int().min(0).max(5000);
const structure=z.object({schema:z.literal(1),authenticated:z.boolean(),counts:z.object({fields:count,password:count,otp:count,dialogs:count,frames:count,inaccessibleFrames:count}).strict(),actions:z.array(z.enum(labels)).max(100),signature:z.array(signature).max(250),truncated:z.boolean()}).strict();
const body=z.object({integrationId:z.string().max(100),version:z.string().regex(/^\d+\.\d+\.\d+$/),fingerprint:z.string().regex(/^[a-f0-9]{64}$/),detectedAt:z.string().max(40),evidence:z.object({schema:z.literal(1),reason:z.enum(["daily","manual","unexpected-dialog","login-stalled","quote-blocked"]),screen:z.enum(["login","verification","calculation","quotes","screen"]),before:structure,after:structure}).strict()}).strict();
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const bearer=request.headers.get('Authorization');if(!bearer)return json({error:'Sign in required'},401);
  const auth=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:bearer}}});
  const {data:{user},error:authError}=await auth.auth.getUser();if(authError||!user)return json({error:'Sign in required'},401);
  let input;try{const text=await request.text();if(text.length>100000)return json({error:'Evidence too large'},413);input=body.parse(JSON.parse(text));}catch{return json({error:'Invalid structural evidence'},400);}
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data:credential}=await admin.from('broker_integration_credentials').select('integration_id').eq('broker_user_id',user.id).eq('integration_id',input.integrationId).eq('is_enabled',true).eq('status','configured').maybeSingle();
  if(!credential)return json({error:'Configured integration required'},403);
  // Bound incident creation per reporter; duplicates remain readable and reusable.
  const {count:reported}=await admin.from('companion_interface_reporters').select('incident_id',{count:'exact',head:true}).eq('broker_user_id',user.id).gte('reported_at',new Date(Date.now()-86400000).toISOString());
  if((reported||0)>=50)return json({error:'Daily diagnostic limit reached'},429);
  const expected=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({id:input.integrationId,version:input.version,screen:input.evidence.screen,before:input.evidence.before,after:input.evidence.after}))))).map(b=>b.toString(16).padStart(2,'0')).join('');
  if(expected!==input.fingerprint)return json({error:'Evidence fingerprint does not match'},400);
  const {error:insertError}=await admin.from('companion_interface_incidents').upsert({integration_id:input.integrationId,fingerprint:input.fingerprint,companion_version:input.version,evidence:input.evidence},{onConflict:'integration_id,fingerprint',ignoreDuplicates:true});
  if(insertError)return json({error:'Could not queue incident'},500);
  const {data:incident}=await admin.from('companion_interface_incidents').select('id,status,dispatched_at').eq('integration_id',input.integrationId).eq('fingerprint',input.fingerprint).single();
  if(!incident)return json({error:'Could not find incident'},500);
  await admin.from('companion_interface_incidents').update({last_seen_at:new Date().toISOString()}).eq('id',incident.id);
  const {error:reportError}=await admin.from('companion_interface_reporters').upsert({incident_id:incident.id,broker_user_id:user.id},{onConflict:'incident_id,broker_user_id',ignoreDuplicates:true});
  if(reportError)return json({error:'Could not record reporter'},500);
  const token=Deno.env.get('COMPANION_REPAIR_GITHUB_TOKEN');
  let dispatched=false;
  if(token&&incident.status==='queued'&&!incident.dispatched_at){
    const {data:claim}=await admin.from('companion_interface_incidents').update({dispatched_at:new Date().toISOString()}).eq('id',incident.id).is('dispatched_at',null).select('id').maybeSingle();
    if(claim){
      const response=await fetch('https://api.github.com/repos/SmartifyConsulting/client-sync-scribe/actions/workflows/companion-repair.yml/dispatches',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:JSON.stringify({ref:'main',inputs:{incident_id:incident.id}})}).catch(()=>null);
      dispatched=response?.status===204;
      if(!dispatched)await admin.from('companion_interface_incidents').update({dispatched_at:null}).eq('id',incident.id);
    }
  }
  return json({id:incident.id,status:incident.status,dispatched,workerConfigured:!!token});
});
