// Structural diagnostics only. Never reads input values, HTML, screenshots, or page URLs into evidence.
function readInterfaceStructure(expectedOrigin) {
  if (location.origin !== expectedOrigin || location.protocol !== 'https:') return null;
  const approved = new Set(['login','log in','sign in','continue','next','back','cancel','close','dismiss','ok','search','save','save client','new quote','create quote','get a quote','calculate','calculate premium','generate quote report','download','download pdf','quotes','clients','client','policy details','benefit details','benefits and proposals','create quote','my myriad business','proposal construction','set client objectives','build income scenarios','compare scenarios','username','password','email','email address','first name','surname','last name','identity number','id number','date of birth','gender','smoking status','occupation','benefit amount','monthly benefit','cover growth','premium pattern','increase option','title','tax status']);
  const norm = s => String(s || '').toLowerCase().replace(/\s+/g,' ').trim();
  const signature = [], actions = [];
  let authenticated=false;
  const counts = { fields:0, password:0, otp:0, dialogs:0, frames:0, inaccessibleFrames:0 };
  let budget = 5000;
  const visit = (root, depth=0) => {
    if(depth>8 || budget<=0)return;
    for(const el of root.querySelectorAll('*')) {
      if(--budget<0)break;
      if(el.shadowRoot)visit(el.shadowRoot,depth+1);
      if(!el.getClientRects().length || getComputedStyle(el).visibility==='hidden')continue;
      const tag=el.tagName.toLowerCase(),role=el.getAttribute('role')||'';
      if(['h1','h2'].includes(tag) && norm(el.textContent)==='welcome to adviserconnect')authenticated=true;
      if(['a','button'].includes(tag) && ['logout','log out','sign out'].includes(norm(el.textContent)))authenticated=true;
      if(tag==='iframe') {
        counts.frames++;
        try { const frame=el.contentDocument; if(frame && el.contentWindow.location.origin===expectedOrigin)visit(frame,depth+1); else counts.inaccessibleFrames++; }catch{counts.inaccessibleFrames++;}
      }
      if(tag==='dialog'||role==='dialog'||role==='alertdialog')counts.dialogs++;
      if(['input','select','textarea'].includes(tag) && el.type!=='hidden') {
        counts.fields++;if(el.type==='password')counts.password++;if(el.autocomplete==='one-time-code')counts.otp++;
        const label=norm(el.labels?.[0]?.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder'));
        signature.push(['field',tag,['password','email','tel','text','number','date','checkbox','radio'].includes(el.type)?el.type:'other',approved.has(label)?label:'unmapped',!!el.required,!!el.disabled,depth]);
      }
      if(['button','a'].includes(tag)||['button','tab'].includes(role)) {
        const label=norm(el.textContent||el.getAttribute('aria-label'));
        if(approved.has(label)){actions.push(label);signature.push(['action',['button','a','div','span','input','li'].includes(tag)?tag:'other',role, label,!!el.disabled,depth]);}
      }
    }
  };
  visit(document);
  return { schema:1, authenticated:authenticated&&!counts.password&&!counts.otp, counts, actions:[...new Set(actions)].sort(), signature:signature.slice(0,250).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))), truncated:budget<=0||signature.length>250 };
}

function installInterfaceMonitor(isTrustedApp) {
  const DAY=86400000, ALARM='holarc-interface-daily', REG='holarc-interface-registry', STATE='holarc-interface-state';
  let running=null;
  const originOf=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.origin:null;}catch{return null;}};
  const report=async(tabId)=>{const state=(await chrome.storage.local.get(STATE))[STATE]||{checkedAt:null,apps:[],incidents:[]};await chrome.tabs.sendMessage(tabId,{type:'companion-interface-report',...state}).catch(()=>{});};
  const scan=async(reason='daily',targetTab=null)=>{
    if(running)return reason==='daily'?running:running.catch(()=>{}).then(()=>scan(reason,targetTab));
    running=(async()=>{
      const registry=(await chrome.storage.local.get(REG))[REG]||[], previous=(await chrome.storage.local.get(STATE))[STATE]||{apps:[],incidents:[]};
      const tabs=await chrome.tabs.query({});const apps=[],incidents=[...(previous.incidents||[])];
      for(const app of registry.slice(0,50)) {
        const matching=tabs.filter(t=>originOf(t.url)===app.origin && (!targetTab||t.id===targetTab)).slice(0,5);
        if(targetTab&&!matching.length)continue;
        if(!matching.length){apps.push({...app,result:'unavailable',checkedAt:null});continue;}
        for(const tab of matching) {
          try {
            const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:readInterfaceStructure,args:[app.origin]});
            const structure=result?.result;if(!structure||structure.schema!==1)continue;
            if(!structure.signature.length&&!structure.counts.dialogs&&!structure.counts.fields){apps.push({...app,result:'unavailable',checkedAt:null});continue;}
            if(structure.authenticated)for(const appTab of tabs.filter(t=>isTrustedApp(t.url)))await chrome.tabs.sendMessage(appTab.id,{type:'companion-session-connected',integrationId:app.id,observedAt:new Date().toISOString()}).catch(()=>{});
            // Do not compare a login page with a quote page. Dialogs stay in the same page family to expose new overlays.
            const family=structure.counts.password?'login':structure.counts.otp?'verification':structure.actions.includes('calculate')||structure.actions.includes('calculate premium')?'calculation':structure.actions.includes('create quote')||structure.actions.includes('new quote')?'quotes':'screen';
            const key=app.id+'|'+app.origin+'|'+family;
            const prior=(previous.apps||[]).find(a=>a.key===key&&a.baseline);
            const baseline=prior?.baseline||structure;
            const changed=JSON.stringify(structure)!==JSON.stringify(baseline);
            const immediate=reason!=='daily'&&reason!=='manual';
            const status=changed||immediate?'changed':prior?'unchanged':'baseline';
            const checkedAt=new Date().toISOString();
            apps.push({...app,key,family,result:status,checkedAt,baseline,latest:structure});
            if(status==='changed') {
              const evidence={schema:1,reason,screen:family,before:baseline,after:structure};
              const version=chrome.runtime.getManifest().version;
              const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({id:app.id,version,screen:family,before:baseline,after:structure}))))).map(b=>b.toString(16).padStart(2,'0')).join('');
              if(!incidents.some(i=>i.fingerprint===digest))incidents.push({integrationId:app.id,version,fingerprint:digest,detectedAt:checkedAt,evidence});
            }
          }catch{apps.push({...app,result:'unavailable',checkedAt:null});}
        }
      }
      const retained=(previous.apps||[]).filter(a=>registry.some(b=>b.id===a.id)&&a.baseline&&!apps.some(b=>b.id===a.id&&b.key===a.key));
      const state={checkedAt:new Date().toISOString(),apps:[...retained,...apps].slice(-100),incidents:incidents.slice(-50)};
      await chrome.storage.local.set({[STATE]:state});
      for(const tab of tabs.filter(t=>isTrustedApp(t.url)))await report(tab.id);
      return state;
    })().finally(()=>{running=null;});
    return running;
  };
  const ensure=async()=>{
    if(!await chrome.alarms.get(ALARM))await chrome.alarms.create(ALARM,{delayInMinutes:1,periodInMinutes:1440});
    const state=(await chrome.storage.local.get(STATE))[STATE];
    if(!state?.checkedAt||Date.now()-Date.parse(state.checkedAt)>=DAY)await scan();
  };
  chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===ALARM)void scan().catch(()=>{});});
  chrome.runtime.onInstalled.addListener(()=>void ensure().catch(()=>{}));
  chrome.runtime.onStartup.addListener(()=>void ensure().catch(()=>{}));
  chrome.runtime.onMessage.addListener((data,sender)=>{
    if(!sender.tab?.id||!isTrustedApp(sender.tab.url))return;
    if(data.type==='companion-interface-register'&&Array.isArray(data.apps)) {
      const apps=data.apps.slice(0,50).flatMap(a=>{const origin=originOf(a.origin);return typeof a.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(a.id)&&typeof a.name==='string'&&a.name.length>0&&a.name.length<=80&&origin?[{id:a.id,name:a.name,origin,configuredOrigin:origin}]:[];});
      void chrome.storage.local.get(REG).then(async stored=>{
        const learned=(stored[REG]||[]).filter(old=>old.origin!==old.configuredOrigin&&apps.some(app=>app.id===old.id&&app.origin===old.configuredOrigin));
        await chrome.storage.local.set({[REG]:[...apps,...learned].slice(-100)});
        await scan();
      }).catch(()=>{});
    }
    if(data.type==='companion-interface-status')void report(sender.tab.id).catch(()=>{});
    if(data.type==='companion-interface-check')void scan('manual').catch(()=>{});
  });
  chrome.tabs.onUpdated.addListener((tabId,change)=>{if(change.status==='complete')void scan('daily',tabId).catch(()=>{});});
  void ensure().catch(()=>{});
  return {scan,remember:async(name,origin)=>{
    const registry=(await chrome.storage.local.get(REG))[REG]||[];
    const app=registry.find(a=>a.name===name);
    if(app&&!registry.some(a=>a.id===app.id&&a.origin===origin)&&originOf(origin))await chrome.storage.local.set({[REG]:[...registry,{...app,origin}].slice(-100)});
  }};
}
