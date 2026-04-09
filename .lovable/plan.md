

# Six Changes: Expiring Recordings Page, Documents Cleanup, Dashboard Cards, Vula Rebrand

## 1. Expiring Recordings Page

Create a new page `src/pages/ExpiringRecordings.tsx` accessible at `/expiring-recordings`:
- Lists sessions with audio recordings where `created_at` is 5-7 days ago (soon to expire under the 7-day retention policy)
- Each row shows: patient name, session date, days remaining, and two action buttons: **Download** and **Delete**
- Download uses the signed URL utility (`getSignedAudioUrl`)
- Delete nullifies `audio_url` and `transcript` on the session record

Update notification click handling: when a doctor clicks an "expiring recording" notification, navigate to `/expiring-recordings` instead of generic notifications page. Add route in `App.tsx`.

**Files:** `src/pages/ExpiringRecordings.tsx` (new), `src/App.tsx` (add route), `src/pages/Notifications.tsx` (link notification to new page)

## 2. Remove Print Icons & Rename Export PDF → Download PDF

**File:** `src/pages/Documents.tsx`
- **Document list row** (lines 692-700): Remove the Print button entirely
- **Document list row** (line 688): Change title from `"Export PDF"` to `"Download PDF"`
- **Preview dialog** (lines 1062-1069): Remove the Print button
- **Preview dialog** (line 1079): Change `"Export PDF"` to `"Download PDF"`
- **Toast messages**: Change `"PDF Exported"` to `"PDF Downloaded"`
- Remove `Printer` from lucide imports and `printDocument` from utils import if no longer used

## 3. Reduce Dashboard Cards by 35%

**File:** `src/components/dashboard/StatsCard.tsx`
- Reduce padding from `p-6` to `p-4`
- Reduce value text from `text-4xl` to `text-2xl`
- Reduce icon container from `h-14 w-14` / `h-16 w-16` to `h-10 w-10` / `h-12 w-12`
- Reduce icon sizes proportionally

## 4. Rename "My Rewards" → "My Vulas" in Nav

**File:** `src/components/layout/Sidebar.tsx`
- Line 49: Change `"My Rewards"` to `"My Vulas"` (doctor nav)
- Line 57: Change `"My Rewards"` to `"My Vulas"` (patient nav)

## 5. Rebrand Moola/Moolas → Vula/Vulas Everywhere

Replace the logo asset: copy `VulaVaultLogo.png` to `src/assets/vula-symbol.png` and update all imports.

**Files requiring text + import changes:**
| File | Changes |
|------|---------|
| `src/components/gamification/LollipopDisplay.tsx` | `MoolaLogoBadge` → `VulaLogoBadge`, all "Moola" text → "Vula" |
| `src/pages/Dashboard.tsx` | Import `vula-symbol.png`, "Total Moolas" → "Total Vulas" |
| `src/pages/doctor/DoctorRewards.tsx` | Import swap, "Moola Apps" → "Vula Apps", all "Moolas" → "Vulas" |
| `src/pages/patient/MyRewards.tsx` | Import swap, "Moola Apps" → "Vula Apps", tab values, all text |
| `src/pages/patient/PatientDashboard.tsx` | Import swap, any "Moola" text |
| `src/pages/PatientProfile.tsx` | Import swap |
| `src/pages/patient/PatientTasks.tsx` | "Moolas" → "Vulas" in badges and toasts |
| `src/components/rewards/MedicationAdherenceTab.tsx` | "Moolas" → "Vulas" in toasts and descriptions |
| `src/components/ShareAppDialog.tsx` | "Moolas" → "Vulas" |
| `src/components/sessions/PrescriptionEditor.tsx` | "Moolas" → "Vulas" in notification text |
| `src/components/patients/EmoticonSender.tsx` | "Moolas" → "Vulas" in toast messages |
| `src/pages/admin/GamificationAdmin.tsx` | "Moola" → "Vula" in admin labels |

## 6. Update Branding Memory

Update stored branding reference: currency is now "Vula/Vulas" with the Vula Vault logo, replacing all Moola references.

