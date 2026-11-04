import fs from 'node:fs';
// Talks to the Holarc Wealth repair queue using a GitHub Actions OIDC token (no stored backend keys).
const mode=process.argv[2]||'fetch';
const endpoint=process.env.REPAIR_QUEUE_URL||'https://oroobhkkttqgyhaulnqc.supabase.co/functions/v1/companion-repair-queue';
const queue=new URL(endpoint);
if(queue.protocol!=='https:'||!queue.hostname.endsWith('.supabase.co'))throw new Error('Invalid queue host');
const reqUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,reqToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if(!reqUrl||!reqToken)throw new Error('GitHub OIDC is unavailable; grant id-token: write');
const oidc=new URL(reqUrl);oidc.searchParams.set('audience','holarc-companion-repair');
const tokenRes=await fetch(oidc,{headers:{Authorization:`Bearer ${reqToken}`}});
if(!tokenRes.ok)throw new Error(`OIDC token request failed (${tokenRes.status})`);
const {value:idToken}=await tokenRes.json();
const call=async payload=>{const r=await fetch(queue,{method:'POST',headers:{Authorization:`Bearer ${idToken}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error(`Queue request failed (${r.status})`);return r.json();};
const out=line=>fs.appendFileSync(process.env.GITHUB_OUTPUT,line+'\n');
if(mode==='fetch'){
  const id=process.env.INCIDENT_ID||undefined;
  if(id&&!/^[a-f0-9-]{36}$/.test(id))throw new Error('Invalid incident ID');
  const {incident}=await call(id?{mode:'fetch',incidentId:id}:{mode:'fetch'});
  if(!incident){out('has_incident=false');process.exit(0);}
  fs.writeFileSync('companion-incident.json',JSON.stringify(incident,null,2));
  out('has_incident=true');out(`id=${incident.id}`);
}else{
  const id=process.env.INCIDENT_ID;if(!/^[a-f0-9-]{36}$/.test(id||''))throw new Error('Invalid incident ID');
  const pr=process.env.REPAIR_PR_URL||undefined;
  if(pr&&!/^https:\/\/github.com\/SmartifyConsulting\/client-sync-scribe\/pull\/\d+$/.test(pr))throw new Error('Invalid repair PR URL');
  await call(pr?{mode:'finish',incidentId:id,prUrl:pr}:{mode:'finish',incidentId:id});
}
