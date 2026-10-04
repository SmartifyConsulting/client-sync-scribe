import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { DOMParser, type Element } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

// Reads (never creates) Astute policy summaries for a client and saves them as portfolio holdings.
// Testing rule: only Georgia Adams' ID number is allowed until this restriction is lifted.
const ALLOWED_ID_NUMBERS = new Set(["7603080082088"]);
const BASE = "https://aol.astutefse.com";
const Body = z.object({ patientId: z.string().uuid() });
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

class Jar {
  c = new Map<string, string>();
  take(res: Response) {
    const all = (res.headers as any).getSetCookie?.() ?? [];
    for (const sc of all) { const [kv] = sc.split(";"); const i = kv.indexOf("="); this.c.set(kv.slice(0, i).trim(), kv.slice(i + 1)); }
  }
  get header() { return [...this.c].map(([k, v]) => `${k}=${v}`).join("; "); }
}
async function go(jar: Jar, path: string, init: RequestInit = {}): Promise<Response> {
  let url = path.startsWith("http") ? path : BASE + path;
  let opts: RequestInit = init;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { ...opts, redirect: "manual", headers: { ...(opts.headers ?? {}), Cookie: jar.header, "User-Agent": "Mozilla/5.0" } });
    jar.take(res);
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) { await res.body?.cancel(); url = new URL(loc, url).toString(); opts = {}; continue; }
    return res;
  }
  throw new Error("Too many redirects");
}
const num = (s?: string) => { if (!s) return null; const m = s.replace(/,(\d{2})\b/, ".$1").match(/-?\d[\d\s]*\.?\d*/); return m ? Number(m[0].replace(/\s/g, "")) : null; };
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const cells = (tr: Element) => [...tr.children].filter((c) => ["TD", "TH"].includes(c.tagName)).map((c) => clean(c.textContent));

function parsePolicies(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html")!;
  const trs = [...doc.querySelectorAll("tr")] as Element[];
  const out: any[] = [];
  trs.forEach((tr, i) => {
    const c = cells(tr);
    if (!(c.length >= 3 && c[0].endsWith(" Policy") && c[1] === "Person")) return;
    const d = trs[i + 1] ? cells(trs[i + 1]) : [];
    if (!d[0]) return;
    const values: Record<string, string> = {}; let parties = "";
    for (const t2 of trs.slice(i + 2, i + 60)) {
      const cc = cells(t2);
      if (cc.length >= 2 && cc[0].endsWith(" Policy") && cc[1] === "Person") break;
      if (cc.length === 2 && cc[0] && /^-?[\d.]+$/.test(cc[1])) values[cc[0]] = cc[1];
      if (cc.length === 1 && !parties && /Beneficiary|Insured|Assured/.test(cc[0]) && !cc[0].includes(" Policy Person ")) parties = cc[0];
    }
    const desc = d[0];
    const words = desc.split(" ");
    const statusWord = /^(Active|Inactive|Lapsed|Paid-up|Paid Up|Cancelled|Matured|Claimed)$/i.test(words.at(-1) ?? "") ? words.pop()! : null;
    const policyNumber = words.shift() ?? desc;
    const product = words.join(" ") || null;
    const prem = d[2] ?? "";
    const freq = prem.match(/Monthly|Annual|Yearly|Quarterly|Single/i)?.[0] ?? null;
    const asset = num(values["Asset Value"] ?? values["Fund Balance"]);
    const life = num(d[4]); const dis = num(d[5]); const dread = num(d[6]);
    const isInv = !!asset || /invest|retire|annuity|endow|unit trust|rrsp/i.test(product ?? "");
    out.push({
      provider: c[0].replace(/ Policy$/, ""), policy_number: policyNumber, product,
      category: isInv ? "investment" : dis ? "disability" : "life",
      status: statusWord, premium: num(prem.replace(/^R/, "")), premium_frequency: freq,
      start_date: (d[3] ?? "").match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null,
      life_cover: life, disability_cover: dis, dread_cover: dread, asset_value: asset,
      parties: parties || null, raw: { row: d, values },
    });
  });
  const seen = new Set<string>();
  return out.filter((p) => { const k = p.provider + p.policy_number; if (seen.has(k)) return false; seen.add(k); return true; });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Please sign in again." }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "No client was selected." }, 400);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Please sign in again." }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: pat } = await admin.from("patients").select("id,user_id,id_passport_number").eq("id", parsed.data.patientId).maybeSingle();
    if (!pat) return json({ error: "Client not found." }, 404);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (pat.user_id !== u.user.id && !isAdmin) return json({ error: "Only this client's Wealth Manager can pull from Astute." }, 403);
    const idNo = (pat.id_passport_number ?? "").replace(/\s/g, "");
    if (!idNo) return json({ error: "This client has no ID number saved. Add it to their profile, then try again." }, 400);
    if (!ALLOWED_ID_NUMBERS.has(idNo)) return json({ error: "Astute pulls are only switched on for the test client (Georgia Adams) for now." }, 403);

    // Sign in
    const jar = new Jar();
    const page = await (await go(jar, "/Online/account/login")).text();
    const tok = page.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)?.[1];
    if (!tok) return json({ error: "Astute's sign-in page has changed. Nothing was pulled." }, 502);
    const form = new URLSearchParams({ __RequestVerificationToken: tok, Username: Deno.env.get("ASTUTE_USERNAME")!, Password: Deno.env.get("ASTUTE_PASSWORD")!, Pin: Deno.env.get("ASTUTE_PIN")!, RememberMe: "false" });
    const lr = await go(jar, "/Online/account/login", { method: "POST", body: form, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    const lrText = await lr.text();
    if (/name="Password"/.test(lrText) && /account\/login/i.test(lr.url || "")) return json({ error: "Astute rejected the saved sign-in details. Check the username, password and PIN." }, 502);

    // Latest response for this ID number
    const rr = await go(jar, "/Online/Ccp/Response/Responses_Read", { method: "POST", body: new URLSearchParams({ sort: "", page: "1", pageSize: "100", group: "", filter: "" }), headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest" } });
    const list = (await rr.json().catch(() => ({ Data: [] }))).Data ?? [];
    const mine = list.filter((x: any) => x.IdNumber === idNo).sort((a: any, b: any) => String(b.DateTimeTransactionStarted).localeCompare(String(a.DateTimeTransactionStarted)));
    if (!mine.length) return json({ error: "Astute has no results for this client yet. Submit a request in Astute first." }, 404);
    const latest = mine[0];
    const det = await (await go(jar, `/Online/Ccp/Response/TransactionDetails?MessageId=${latest.MessageId}`)).text();
    const policies = parsePolicies(det);
    if (!policies.length) return json({ error: "Astute returned the summary, but no policies could be read from it.", reference: latest.ReferenceNumber }, 422);

    const now = new Date().toISOString();
    const rows = policies.map((p) => ({ ...p, patient_id: pat.id, source: "astute", reference: latest.ReferenceNumber, synced_at: now }));
    const { error } = await admin.from("wealth_portfolio_holdings").upsert(rows, { onConflict: "patient_id,source,provider,policy_number" });
    if (error) return json({ error: "The policies could not be saved. Please try again." }, 500);
    return json({ ok: true, reference: latest.ReferenceNumber, count: rows.length, syncedAt: now });
  } catch (e) {
    console.error("astute-sync", e);
    return json({ error: "Something went wrong talking to Astute. Please try again." }, 500);
  }
});
