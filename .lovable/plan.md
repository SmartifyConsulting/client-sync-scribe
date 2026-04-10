

# ICE/NOK Sharing, Vula Logo Fix, Dashboard Links

## 1. ICE Contacts title consistency in edit mode

**File:** `src/components/patients/PatientDetailsEditor.tsx` (line 1115)

Change `ICE Contacts` to `ICE Contacts (In Case of Emergency)` to match the view mode title at line 772.

## 2. "As Next of Kin" checkbox on ICE Contacts

**File:** `src/components/patients/PatientDetailsEditor.tsx`

Add a checkbox below each ICE contact (both edit and view mode) labeled "Same as Next of Kin". When checked, duplicate the ICE contact's data (name, phone, email, relationship) into `nokMembers`. Add an `is_also_nok` field to the `ICEContact` interface in `usePatients.ts`.

**File:** `src/hooks/usePatients.ts` — Add `is_also_nok?: boolean` to `ICEContact` interface.

## 3. Per-record Share icon on NOK and ICE records

**File:** `src/components/patients/PatientDetailsEditor.tsx`

Add a `Share2` icon button on each individual NOK record and ICE record (both view and edit mode lists). Add a `shared` boolean field to both `ICEContact` and `NextOfKinMember` interfaces.

- **Teal** icon (text-primary) if not yet shared
- **Grey** icon (text-muted-foreground) if already shared

When clicked:
- Set `shared: true` on that record and save
- Use `navigator.share()` or clipboard to share a link to the patient's personal information page
- The "On ICE" tab feature (recipient seeing the page) is a future feature requiring its own user account linking — for now, mark the record as shared and generate a shareable link

**File:** `src/hooks/usePatients.ts` — Add `shared?: boolean` to `ICEContact` and `NextOfKinMember`.

## 4. Vula logo on Dashboard — remove background, increase size

**File:** `src/components/dashboard/StatsCard.tsx`

When `imageUrl` is provided, remove the `bg-primary/10` background from the icon container and increase the image size. Change the container for `imageUrl` cards to have no background and double the image dimensions:
- Container: remove `bg-primary/10`, keep sizing
- Image: `h-8 w-8 md:h-12 md:w-12` (was `h-5 w-5 md:h-7 md:w-7`)

## 5. Dashboard cards link to correct pages

**File:** `src/components/dashboard/StatsCard.tsx`

Add an optional `href` prop. When provided, wrap the card in a `Link` from react-router-dom.

**File:** `src/pages/Dashboard.tsx`

Add `href` to each StatsCard:
- "Total Patients" → `/patients`
- "Appointments Today" → `/calendar`
- "This Week" → `/calendar`
- "Doctor Rating" → `/profile` (no separate ratings page)
- "Total Vulas" → `/doctor/rewards`

Also verify `TodaysBriefing` links to `/patients/:id` (already does), `RecentActivity` links to `/patients/:id` (already does), `CompactTodoList` links to `/todos` (already does via navigate).

## Technical Summary

| File | Change |
|------|--------|
| `src/hooks/usePatients.ts` | Add `is_also_nok`, `shared` to ICEContact; `shared` to NextOfKinMember |
| `src/components/patients/PatientDetailsEditor.tsx` | Fix ICE title in edit mode; add "As NOK" checkbox; add per-record share icons |
| `src/components/dashboard/StatsCard.tsx` | Remove bg for image cards, increase logo size, add `href` prop |
| `src/pages/Dashboard.tsx` | Add `href` to each StatsCard |

No database migration needed — `is_also_nok` and `shared` are stored within the existing JSONB columns.

