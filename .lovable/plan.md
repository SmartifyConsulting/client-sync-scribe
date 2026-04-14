

# Plan: Multi-Item UI Fixes — Dashboard, Calendar, Profile Switching, Navigation

This is a large batch of fixes spanning 10+ files. Organized by area.

---

## 1. Vula Vouchers logo sizing on Doctor Home (StatsCard)

**File:** `src/components/dashboard/StatsCard.tsx`

The Vula logo in the StatsCard should be 50% of the card height. Currently the card has `min-h-[80px] md:min-h-[100px]`. The logo image is `h-10 w-10 md:h-14 md:w-14`. Change to `h-[40px] w-auto md:h-[50px]` (50% of min-h). Also center-align the logo vertically within the card (it already is via `flex items-start` — change to `items-center`).

## 2. Patients page: 2x2 button grid on tablet too

**File:** `src/pages/Patients.tsx` (line 397)

Currently `grid grid-cols-2 md:flex`. Change to `grid grid-cols-2` for all views (remove `md:flex`), keeping `gap-2`. The `+ Patient` button is already there for all views — no change needed.

## 3. Dashboard greeting comma fix

**File:** `src/pages/Dashboard.tsx` (lines 276-278)

Currently: `Here's what's happening with your practice today` + `<span class="block md:inline">, {formattedDate}</span>`

The comma should end "today" line, not start the date line. Change to:
```
Here's what's happening with your practice today,
<span class="block md:inline"> {formattedDate}</span>
```

## 4. Vula Vouchers logo in patient profile banner — middle align & size increase

**File:** `src/components/patients/PatientDetailsEditor.tsx`

- **Web/tablet (line 1091):** Change `h-9` → `h-12` (30% increase). Add vertical centering with the "Here's what's happening..." text by using `items-center` on the parent flex.
- **Mobile (line 1149):** Change `h-10` → `h-17` (70% increase → use `h-[68px]`).
- **My Holarchive banner (line 1091):** Ensure middle-align with the greeting text by adjusting flex alignment.
- **Line 1149 (mobile Vula):** increase to 80% → `h-[72px]`.

## 5. Dashboard stats cards — distribute evenly

**File:** `src/pages/Dashboard.tsx` (line 287)

Currently `grid-cols-2 lg:grid-cols-5`. The cards should distribute evenly. The 5-column grid on desktop is correct but the 2-col on mobile can leave uneven last row. Keep as-is since 5 cards in 2-col is inherently uneven — no better alternative without removing a card.

## 6. Red calendar icon in TopBarIcons

**File:** `src/components/layout/TopBarIcons.tsx`

Add a red Calendar icon button (linking to `/calendar`) to the LEFT of the Mic icon:
```tsx
<Link to="/calendar">
  <div className="h-9 w-9 rounded-full bg-destructive flex items-center justify-center hover:bg-destructive/80 transition-colors">
    <CalendarIcon className="h-4 w-4 text-white" />
  </div>
</Link>
```
Also add this same icon in `PatientAppLayout.tsx` mobile header (before the Bell icon).

## 7. Calendar view pill selector — fix on tablet/mobile

**File:** `src/pages/CalendarView.tsx` (lines 423-438)

- Make the week/month/year pills not truncated on tablet: add `shrink-0` and reduce padding on mobile: `px-2 py-1 text-xs md:px-3 md:py-1.5 md:text-sm`.
- Align all header buttons cleanly using `flex flex-wrap gap-2 items-center`.
- On mobile, make the pills smaller with `text-[11px] px-2 py-1`.

## 8. Replace "Connect Google Calendar" button with Google Calendar logo

**File:** `src/pages/CalendarView.tsx` (lines 282-302)

Copy the uploaded `GoogleCal.png` to `src/assets/google-calendar-logo.png`. Replace the text button with an image button showing the logo. On all views:
```tsx
<Button variant="outline" onClick={connect} disabled={isConnecting} className="gap-2 h-10">
  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <img src={googleCalLogo} alt="Google Calendar" className="h-6 w-auto" />}
</Button>
```

## 9. Privacy badge — make "Private — Not Shared" items text black

**Files:** `src/components/permissions/PrivacyBadge.tsx` (line 46), `src/components/permissions/PermissionTransparencyModal.tsx` (line 98)

Change `text-muted-foreground/60` → `text-foreground` on the private items list, matching the "Shared with Care Team" items styling.

## 10. Prevent doctors from adding themselves as patients

**File:** `src/pages/Patients.tsx` (lines 94-130)

In the patient search suggestions, filter out the current user's profile from results:
```tsx
const filtered = (profiles || []).filter(p => p.id !== user?.id);
```
This prevents doctors from selecting themselves as patients.

## 11. Profile switching — Doctor button does nothing (TopBarIcons)

**File:** `src/components/layout/TopBarIcons.tsx` (line 169)

The Doctor button currently has: `onClick={() => { if (isOnPatientRoute) return; }}` — this does nothing useful. Fix:
```tsx
onClick={() => { if (isOnPatientRoute) navigate("/dashboard"); }}
```

## 12. Navigation menus don't switch when doctor switches profiles

**File:** `src/components/layout/BottomNav.tsx`

The BottomNav uses `isPatient` from `useUserRole()` which is database-role based. A doctor switching to patient view still has role='doctor'. Fix by checking the current route:
```tsx
const isOnPatientRoute = location.pathname.startsWith("/patient/");
const showPatientNav = isPatient || isOnPatientRoute;
```
Use `showPatientNav` instead of `isPatient` to decide which nav to render.

**File:** `src/components/layout/Sidebar.tsx`

Same fix — detect if on patient route and show patient nav items:
```tsx
const isOnPatientRoute = location.pathname.startsWith("/patient/");
const navItems = isAdmin ? adminNavItems : (isPatient || isOnPatientRoute) ? patientNavItems : doctorNavItems;
```

## 13. My Holarchive — remove parent "My Profile" tab bar on tablet/web

**File:** `src/components/patients/PatientDetailsEditor.tsx` (lines 1275-1387)

The tablet/web view shows the parent tab bar (My Profile / My Healthcare / My Desk). The user wants this removed for patients on tablet/web to match mobile. The desktop `renderTabsList` function renders this two-tier tab system. Instead, for self-service patients, use the mobile-style flat tab rendering (section-based) on all views. Only show the two-tier parent tabs for doctor-viewed patient records.

Change: When `isSelfService` is true, always use the mobile-style section-based rendering (the sidebar handles navigation on desktop). Remove the parent tab bar for self-service views entirely — the sidebar already provides navigation between Home, My Holarchive, My Calendar, etc.

## 14. Calendar appointment detail modal — fix overlapping

**File:** `src/pages/CalendarView.tsx` (lines 708-878)

The modal has overlapping buttons. Fix the button layout in the non-edit view (lines 846-871):
- Change `flex gap-2` to `grid grid-cols-2 gap-2` for the action buttons
- Make the delete button span appropriately
- Ensure buttons don't overflow on mobile with `text-xs` and proper sizing

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/dashboard/StatsCard.tsx` | Logo 50% card height, center-align |
| `src/pages/Patients.tsx` | 2x2 grid all views, prevent self-add |
| `src/pages/Dashboard.tsx` | Comma placement fix |
| `src/components/patients/PatientDetailsEditor.tsx` | Vula logo sizing, remove parent tab bar for self-service |
| `src/components/layout/TopBarIcons.tsx` | Red calendar icon, fix doctor switch button |
| `src/components/layout/PatientAppLayout.tsx` | Red calendar icon in mobile header |
| `src/pages/CalendarView.tsx` | Pill selector fix, Google Calendar logo, modal button fix |
| `src/components/permissions/PrivacyBadge.tsx` | Black text for private items |
| `src/components/permissions/PermissionTransparencyModal.tsx` | Black text for private items |
| `src/components/layout/BottomNav.tsx` | Route-aware nav switching |
| `src/components/layout/Sidebar.tsx` | Route-aware nav switching |

