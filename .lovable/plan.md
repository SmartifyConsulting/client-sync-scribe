

# Fixes: Sample Voice, Language Split, Nav Highlighting, Round Tables Tab, Nav Size

## 1. Fix Sample Voice Not Playing
**File:** `src/pages/MyPractice.tsx` (lines 829-854)

**Root cause:** `supabase.functions.invoke` parses the response as JSON, but `narrate-briefing` returns raw MP3 bytes. The returned `data` is corrupted.

**Fix:** Replace `supabase.functions.invoke` with a direct `fetch()` call using `.blob()`, matching the pattern used elsewhere for audio streaming:
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrate-briefing`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ text: sampleText, voice }),
  }
);
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const audio = new Audio(url);
audio.play();
audio.onended = () => URL.revokeObjectURL(url);
```

## 2. Add "Primary Language" Field + Rename "Language" to "Additional Languages"
**File:** `src/pages/MyPractice.tsx` (lines 602-633)

- Add a new **Primary Language** dropdown above the existing language chips
- Default the primary language based on the phone number country code (using existing `COUNTRY_CODE_TO_LANGUAGE` mapping)
- Store as `preferred_language` on the profile
- Rename the existing "Language" label to **"Additional Languages"**
- The existing multi-select chips become additional languages only
- Update `handleCountryCodeChange` to auto-set the primary language dropdown value
- The voice narration sample will use the primary language

## 3. Fix Nav Highlighting — "My Round Tables" Highlights With "My Holarprac"
**File:** `src/components/layout/Sidebar.tsx` (lines 119-140)

**Root cause:** `NavLink` uses pathname matching. Both "My Holarprac" (`/practice`) and "My Round Tables" (`/practice?tab=roundtables`) share the same pathname `/practice`, so React Router marks both as active.

**Fix:** Use `end` prop on the Holarprac NavLink and add custom `isActive` logic for the Round Tables link that checks for the `tab=roundtables` query parameter:
```tsx
// For each NavLink, use a custom className function that checks search params
const location = useLocation();
// In className callback, check if item.to includes '?' and match accordingly
```

## 4. Remove "My Round Tables" Tab From MyPractice
**File:** `src/pages/MyPractice.tsx`
- Remove the `TabsTrigger` for "roundtables" (line 560)
- Remove the `TabsContent` for "roundtables" (lines 1037-1047)
- Keep the sidebar nav link to `/practice?tab=roundtables` — but since the tab is removed, change the sidebar link to a dedicated route or keep it opening the DoctorRoundTables page directly

Actually, since Round Tables is already in the sidebar as a nav item, we should just route it to a standalone page. Update the sidebar `to` from `/practice?tab=roundtables` to a route that renders `DoctorRoundTables` directly. But simplest: keep the existing `/practice?tab=roundtables` URL but auto-select that tab. Since we're removing the tab, we need to handle this differently — use URL param to auto-render round tables content inline, OR just remove the tab UI trigger but keep the content rendering when `?tab=roundtables` is in the URL.

**Approach:** Remove the tab trigger from the tab bar. Add logic to read `searchParams` and if `tab=roundtables`, render the round tables content instead of the tabs. This way the sidebar link still works.

## 5. Reduce Nav Item Size
**File:** `src/components/layout/Sidebar.tsx` (line 125)
- Reduce `py-2.5` to `py-1.5` and `text-sm` to `text-xs` on nav items
- Reduce icon size from `h-5 w-5` to `h-4 w-4`
- This ensures "My Round Tables" fits on one line

## Files Modified

| File | Change |
|------|--------|
| `src/pages/MyPractice.tsx` | Fix sample voice fetch, add Primary Language dropdown, rename Language to Additional Languages, remove Round Tables tab trigger, handle ?tab=roundtables via URL params |
| `src/components/layout/Sidebar.tsx` | Fix nav highlighting for query-param links, reduce nav item sizing |

