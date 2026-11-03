import fs from 'node:fs';
const mode=process.argv[2]||'fetch';
const base=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key)throw new Error('Repair queue secrets are not configured');
const root=new URL('/rest/v1/companion_interface_incidents',base);
if(root.protocol!=='https:'||!root.hostname.endsWith('.supabase.co'))throw new Error('Invalid queue host');
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=representation'};
const request=async(url,options={})=>{const r=await fetch(url,{headers,...options});if(!r.ok)throw new Error(`Queue request failed (${r.status})`);return r.status===204?null:r.json();};
if(mode==='fetch'){
  const url=new URL(root);url.searchParams.set('status','eq.queued');url.searchParams.set('select','id,integration_id,companion_version,evidence,app_integrations_catalog(name)');url.searchParams.set('order','first_seen_at.asc');url.searchParams.set('limit','1');
  const id=process.env.INCIDENT_ID;if(id){if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('Invalid incident ID');url.searchParams.set('id',`eq.${id}`);}
  const [incident]=await request(url);
  if(!incident){fs.appendFileSync(process.env.GITHUB_OUTPUT,'has_incident=false\n');process.exit(0);}
  const claim=new URL(root);claim.searchParams.set('id',`eq.${incident.id}`);claim.searchParams.set('status','eq.queued');
  const claimed=await request(claim,{method:'PATCH',body:JSON.stringify({status:'claimed'})});
  if(!claimed.length){fs.appendFileSync(process.env.GITHUB_OUTPUT,'has_incident=false\n');process.exit(0);}
  fs.writeFileSync('companion-incident.json',JSON.stringify(incident,null,2));
  fs.appendFileSync(process.env.GITHUB_OUTPUT,`has_incident=true\nid=${incident.id}\n`);
}else{
  const id=process.env.INCIDENT_ID;if(!/^[a-f0-9-]{36}$/.test(id||''))throw new Error('Invalid incident ID');
  const pr=process.env.REPAIR_PR_URL;
  if(pr&&!/^https:\/\/github.com\/SmartifyConsulting\/client-sync-scribe\/pull\/\d+$/.test(pr))throw new Error('Invalid repair PR URL');
  const url=new URL(root);url.searchParams.set('id',`eq.${id}`);
  await request(url,{method:'PATCH',body:JSON.stringify({status:pr?'patch_ready':'needs_review',repair_pr_url:pr||null})});
}
