# Plan: SOS dispatch fix, tracking link explainer, Active Emergency nav, footer reorder

## 1. Fix the "Finding nearest ambulance…" infinite spinner

**Root cause** in `supabase/functions/dispatch-sos/index.ts`:

```ts
const isPublicOnly = (incident as any).coverage === "public";
const candidates = (providers ?? [])
  .filter((p: any) => !isPublicOnly || String(p.ownership) === "public")
```

The user's incident has `coverage = "private"` (auto-set when the patient has medical aid). The filter only restricts to `ownership='public'` when coverage is *public*, but in the DB **all 3 geo-located ambulances are `ownership='private'**` (Netcare ER24, Emergency ER, Abuja). So:

- `private` patient → all `private` ambulances pass → 3 candidates within 50 km of Joburg → 2 offers (works in theory)
- BUT for incident `a6181217…`, **0 offers were created**. Re-examining: when coverage is `public`, the filter excludes private providers — so **public-coverage incidents currently get nothing** because no public-ownership ambulances exist yet.
- And for private-coverage incidents the filter is loose, but the 50 km cap + the requirement `accepting_patients=true` + the requirement of `latitude IS NOT NULL` knocks it down.

Two real bugs:

a) **Coverage logic should be inclusive, not exclusive.** A private patient should see private *and* public providers (medical aid covers both). A public-coverage patient should still see private ambulances but not private hospitals if no public ones are near — the current code blocks them entirely. Change to: `public` patients get all providers but public are preferred (sorted first); `private` patients get all providers.

b) **No fallback when 0 candidates.** Today the function silently returns `{offered:0}` and the UI loops forever. Add an automatic radius widen (50 → 150 → 500 km) before giving up, and if still 0, write an event row so the UI can show "No responders available — please call 10177" instead of an infinite spinner.

c) **No automatic re-dispatch.** When a patient sits on the active screen, the dispatcher only runs once at SOS-press time. If a new ambulance comes online or a previously full one frees up, nothing re-runs. Add a client-side re-dispatch on a 30 s interval while the incident is `open` and unassigned (calls the same edge function, which is idempotent thanks to `onConflict: ignoreDuplicates`).

### UI change in `HolarcHelpIncidentDetail.tsx`

After 90 s of `open`-with-no-offers, replace the spinner with:

> "No ambulance has accepted yet. We're still searching, but please consider calling 10177 / 911 / 112 directly."
> [ Call emergency line ] [ Cancel SOS ] buttons.

## 2. Explain the `/track/:token` link

This is the **public live-tracking page** (`PublicTrack.tsx`) — anyone who receives the SOS WhatsApp/SMS can open it without logging in to see the patient's live coordinates and status.

The link works (the route is wired in `App.tsx:146`), but the user reported it "doesn't work" earlier — that was when the SOS chooser previously redirected to the legacy HolarcHelp app domain. Now it points to the same origin, so it should resolve.

To make this obvious, in the **Active Emergency screen** rename the section header from

> "Live tracking link"

to

> "Public tracking link — share with anyone"

…and add a small helper line: *"Recipients can view your live location without signing in."* No code change required to the route itself.

## 3. Add navigational elements to the SOS Active Emergency screen

Currently the only nav is "Close incident" at the very bottom. Add a sticky action bar above the live map with these quick actions:

```
[← Back to SOS Home]  [📞 Call 10177]  [🔔 Notify NOK]  [📋 Incident History]
```

- **Back to SOS Home** → `/patient/holarchelp` (or `/doctor/holarchelp`)
- **Call emergency line** → `tel:10177` (country-aware: 10177 ZA / 911 US / 112 EU based on profile country, fall back to a picker)
- **Notify NOK** → opens existing WhatsApp share with NOK pre-selected (re-uses `buildSosMessage` + `waLink`)
- **Incident History** → `/patient/holarchelp/incidents`

Also surface the existing **Copy tracking link** and **Close incident** actions in this same sticky bar so users don't have to scroll.

## 4. Footer reorder

In `src/components/layout/Footer.tsx`, change the `links` array order to:

```ts
const links = [
  { to: "/terms-and-conditions", label: "Terms and Conditions" },
  { to: "/patient-consent", label: "Privacy & Consent" },
  { to: "/business-associate-agreement", label: "Compliance" },
  { to: "/legal", label: "Legal Center" },
];
```

Labels updated to match the requested wording verbatim. Bullet separator (`·`) and layout unchanged.

---

## Files

**Edits**

- `supabase/functions/dispatch-sos/index.ts` — coverage logic + radius widen + return reason
- `src/modules/holarchelp/pages/HolarcHelpIncidentDetail.tsx` — sticky nav bar, helper text, periodic re-dispatch, "no responders yet" fallback, tracking-link relabel
- `src/components/layout/Footer.tsx` — reorder + relabel

**No new files, no migration.**

## Out of scope

- Onboarding more public ambulance providers (data, not code)
- Country-aware emergency number table (ship with hardcoded `10177` default + free-text fallback)
- Doctor-side variant of this page (uses same component, will benefit automatically)