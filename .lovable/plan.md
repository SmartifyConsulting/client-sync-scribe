

# Session UI, Narration Speed, Doctor-Patient Engagement Rewards, Emoticon Communication & Star Ratings

## 1. Reduce Session Mode Idle State Size

**File: `src/pages/Sessions.tsx`** (lines 588-710)

- Heading `text-3xl` → `text-2xl`, subheading `text-xl` → `text-lg`
- Container padding `p-12` → `p-6`, icon circle `h-16 w-16` → `h-12 w-12`
- Tighten spacing (`mb-6` → `mb-4`)

## 2. Faster Narration

**File: `supabase/functions/narrate-briefing/index.ts`**
- Switch response_format to `opus`, add `speed: 1.1`

**File: `src/components/dashboard/TodaysBriefing.tsx`**
- Show "Preparing audio..." text while loading before playback starts

## 3. Doctor Moola Rewards & Task Completion Notifications

**Database**: Create `doctor_rewards` table.

```sql
CREATE TABLE doctor_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  reward_type text NOT NULL,
  description text,
  moolas_count integer NOT NULL DEFAULT 1,
  reference_id uuid,
  awarded_at timestamptz DEFAULT now()
);
-- RLS: doctors see their own
```

When a patient completes a task (in `ActivityProofCapture.tsx` and `validate-medication-video`), insert a notification for the owning doctor.

## 4. Emoticon Communication + Profile Visit Verification + Rating-Based Moolas + Multi-Category Rewards

### 4a. Emoticon Messages with Profile Visit Requirement

**Database**: Create `emoticon_messages` table.

```sql
CREATE TABLE emoticon_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  emoticon text NOT NULL,
  moolas_awarded integer DEFAULT 0,
  is_ai_flagged boolean DEFAULT false,
  profile_viewed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
-- RLS: sender and recipient can view; sender can insert
```

For doctors to earn Moolas from emoticon check-ins, the system requires **both**:
1. The doctor must have viewed the patient's profile (tracked via a `profile_view_log` table entry within the last 24 hours)
2. The doctor sends an emoticon to the patient

**Database**: Create `profile_view_log` table to track when doctors view patient profiles.

```sql
CREATE TABLE profile_view_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  viewed_at timestamptz DEFAULT now()
);
-- RLS: users can insert/view their own
```

**File: `src/pages/PatientProfile.tsx`** — On mount, log a `profile_view_log` entry for the current doctor viewing a patient.

**Anti-gaming**: Before awarding Moolas for an emoticon, check:
- A `profile_view_log` entry exists for this doctor+patient in the last 24h
- Fewer than 5 emoticons exchanged between the same pair in 24h
- If either fails: `moolas_awarded = 0`, `is_ai_flagged = true`

**Files:**
- `src/pages/Notifications.tsx` — Show received emoticons; add quick-reply picker (limited set: 👍 💪 ❤️ 🌟 👏 🎉 🙏 😊)
- `src/components/patients/PatientOverview.tsx` — Add "Send Emoticon" button for doctors (only enabled after profile is viewed)

### 4b. Star Ratings After Visits → Moola Rewards

**Database**: Create `visit_ratings` table.

```sql
CREATE TABLE visit_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  rater_id uuid NOT NULL,
  rated_user_id uuid NOT NULL,
  rating integer NOT NULL,
  rater_role text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, rater_id)
);
-- RLS: rater can insert; both parties can view
```

- Use a validation trigger (not CHECK) to ensure rating is 1-5
- No comments field — ratings only
- After rating is submitted, award Moolas based on star count (e.g., 5 stars = 5 Moolas to the rated party; 1 star = 1 Moola)
- Both doctors (via `doctor_rewards`) and patients (via `patient_rewards`) receive Moolas from their rating scores

**Files:**
- `src/pages/SessionDetail.tsx` — Show 1-5 star rating widget for completed sessions (only if not yet rated)
- `src/pages/Sessions.tsx` — Prompt for rating after session completion

### 4c. Multi-Category Moola Selection After Appointments

When a doctor completes a session, instead of auto-awarding a single visit category's Moolas, show a **multi-select dialog** of available gamification categories (from `gamification_config`). The doctor can check multiple categories that apply to the visit (e.g., "Consultation" + "Blood Test" + "X-Ray").

**File: `src/pages/Sessions.tsx`** (session completion flow)
- After clicking "Complete Session", show a dialog with checkboxes listing all active `gamification_config` entries
- Doctor selects all applicable categories
- For each selected category, insert a `patient_rewards` record with the configured Moola amount
- Then proceed to the star rating prompt

**File: `src/pages/SessionDetail.tsx`**
- Also allow retroactive Moola category selection if not yet awarded

## Files Modified Summary

| File | Change |
|------|--------|
| `src/pages/Sessions.tsx` | Compact idle state; multi-category Moola dialog on completion; rating prompt |
| `src/pages/SessionDetail.tsx` | Star rating widget; retroactive Moola selection |
| `supabase/functions/narrate-briefing/index.ts` | Opus format, speed 1.1 |
| `src/components/dashboard/TodaysBriefing.tsx` | Loading state during narration |
| `src/pages/Notifications.tsx` | Emoticon display and quick-reply picker |
| `src/components/patients/PatientOverview.tsx` | Send Emoticon button; profile view logging |
| `src/pages/PatientProfile.tsx` | Log profile view on mount |
| `src/components/rewards/ActivityProofCapture.tsx` | Notify doctor on task completion |
| Database migrations | Create `doctor_rewards`, `emoticon_messages`, `profile_view_log`, `visit_ratings` tables |

