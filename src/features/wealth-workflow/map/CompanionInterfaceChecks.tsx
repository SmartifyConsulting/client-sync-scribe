import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCompanionInstalled, useCompanionVersion } from "./companionDetection";
import { companionVersionCurrent } from "./companionRelease";

type Check = { id:string; name:string; family?:string; result:string; checkedAt:string|null };
type Report = { checkedAt:string|null; apps:Check[]; incidents:unknown[] };
export function CompanionInterfaceChecks() {
  const installed=useCompanionInstalled(),version=useCompanionVersion();
  const supported=installed&&companionVersionCurrent(version,"1.7.0");
  const [report,setReport]=useState<Report|null>(null);
  const [waiting,setWaiting]=useState(false);
  const [queue,setQueue]=useState<string|null>(null);
  useEffect(()=>{
    const receive=(event:Event)=>{const detail=(event as CustomEvent).detail;if(Array.isArray(detail?.apps)){setReport(detail);setWaiting(false);}};
    window.addEventListener("holarc-interface-report",receive);
    const queueUpdate=(event:Event)=>setQueue((event as CustomEvent).detail?.status||null);
    window.addEventListener("holarc-interface-queue",queueUpdate);
    if(supported)window.postMessage({source:"holarc",type:"companion-interface-status"},location.origin);
    return()=>{window.removeEventListener("holarc-interface-report",receive);window.removeEventListener("holarc-interface-queue",queueUpdate);};
  },[supported]);
  useEffect(()=>{if(!waiting)return;const timer=setTimeout(()=>setWaiting(false),15_000);return()=>clearTimeout(timer);},[waiting]);
  const changes=report?.apps.filter(a=>a.result==="changed").length||0;
  const labels:Record<string,string>={baseline:"First check saved",unchanged:"No change detected",changed:"Change needs review",unavailable:"Open portal to check"};
  return <details className="border-b border-border px-3 py-3 text-xs">
    <summary className="cursor-pointer font-semibold">Daily app checks{changes?` · ${changes} change${changes===1?" needs":"s need"} review`:""}</summary>
    <div className="mt-3 space-y-3">
      <p className="text-muted-foreground">Checks run daily while Chrome is open, and when an available portal loads. Unexpected screens pause affected automation and enter the repair queue. Entered values and passwords are excluded.</p>
      {queue&&<p role="status" className="text-muted-foreground">{queue==="queued"?"Change reported to the shared repair queue.":queue==="unconfigured"?"Change recorded. The repair worker still needs activation.":"Change saved locally. The shared repair queue is not connected yet."}</p>}
      {!supported?<p>Update to Companion v1.7.0 or later to enable app checks.</p>:<>
        <Button variant="outline" size="sm" disabled={waiting} onClick={()=>{setWaiting(true);window.postMessage({source:"holarc",type:"companion-interface-check"},location.origin);}}>{waiting?"Checking…":"Check now"}</Button>
        {!report?.apps.length?<p className="text-muted-foreground">Open a configured app to establish its first interface check. Checks do not sign in automatically.</p>:<table className="data-table w-full text-left"><thead><tr><th>App</th><th>Result</th><th>Last checked</th></tr></thead><tbody>{report.apps.slice(-50).map((app,i)=><tr key={`${app.id}-${app.family}-${i}`}><td>{app.name}{app.family?` · ${app.family}`:""}</td><td className={app.result==="changed"?"text-amber-700":""}>{labels[app.result]||"Awaiting check"}</td><td>{app.checkedAt?new Date(app.checkedAt).toLocaleString():"—"}</td></tr>)}</tbody></table>}
      </>}
    </div>
  </details>;
}
