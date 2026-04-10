

# Dashboard & Mobile UX Fixes

## 1. Greeting line wrap on mobile

**File:** `src/pages/Dashboard.tsx` (line 248)

The greeting `Good afternoon, Dr. Allie` runs long on a 390px screen. Split it so "Dr. Allie" wraps to the next line by rendering the name portion in a `<span className="block">` element.

```
{greeting},
<span className="block">{displayName}</span>
```

## 2. Fix narration — auth bug

The narration fails because the client sends the **anon key** as the Bearer token (line 338 in TodaysBriefing.tsx), but the edge function validates it as a user JWT via `getUser()`, which always returns "Unauthorized".

**Fix in `src/components/dashboard/TodaysBriefing.tsx`** (lines 325-341): Get the actual user session token before calling the function:

```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session?.access_token) throw new Error('Not authenticated');

const response = await fetch(url, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
  body: JSON.stringify({ text: briefingText, voice: selectedVoice }),
});
```

Add `apikey` header (required by Supabase gateway) alongside the real user token in `Authorization`.

## 3. Further reduce dashboard cards on mobile

**File:** `src/components/dashboard/StatsCard.tsx`

Cards currently use `p-3`. On mobile, further compact them:
- Change to `p-2 md:p-3`
- Value text: `text-base md:text-xl`
- Title text: `text-[10px] md:text-xs`
- Change text: `text-[9px] md:text-xs`
- Icon container: `h-7 w-7 md:h-9 md:w-9`

**File:** `src/pages/Dashboard.tsx` (line 260)

Reduce grid gap on mobile: `gap-2 md:gap-5` and overall spacing: `space-y-4 md:space-y-8`.

## 4. Compact mobile screens generally

**File:** `src/pages/Dashboard.tsx`
- Reduce `space-y-8` to `space-y-4 md:space-y-8` on the root container
- Reduce main content grid gap: `gap-3 md:gap-6`

**File:** `src/pages/MyPractice.tsx` (line 576)
- The TabsList already has `flex-wrap` so all 6 tabs (My Practice, Referrals, Certificates, Pricing, **Invoices**, **Templates**) are visible and scrollable on mobile. Add `overflow-x-auto` and `flex-nowrap` instead of `flex-wrap` for a horizontal scroll pattern that saves vertical space.

## 5. Digital Signature layout — controls on one row above preview

**File:** `src/pages/MyPractice.tsx` (lines 771-830)

Restructure the Digital Signature section to:
1. Move Font, Color, Size slider, Bold and Italic **onto one compact row** (using a flex/grid layout)
2. Place these controls **above** the signature preview box
3. Remove individual labels to save space; use placeholder text and compact selects

Layout will be:
```
[Font dropdown][Color dropdown][Size slider][B][I]
┌─────────────────────────────────┐
│  Dr. Allie (signature preview)  │
│  10 April 2026                  │
└─────────────────────────────────┘
```

Use `flex items-center gap-2 flex-wrap` to keep everything on one row on desktop and allow wrapping on very narrow screens.

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Wrap greeting name to new line; reduce mobile spacing |
| `src/components/dashboard/StatsCard.tsx` | Responsive mobile-smaller card sizing |
| `src/components/dashboard/TodaysBriefing.tsx` | Fix auth: use session access_token + apikey header |
| `src/pages/MyPractice.tsx` | Horizontal scroll tabs; signature controls on one row above preview |

