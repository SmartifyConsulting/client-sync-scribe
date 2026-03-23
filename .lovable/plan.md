

# Task Notification, Moola Apps Admin Enhancements

## Summary
Three changes: (1) Send notification to patients when a doctor assigns them a task, (2) enhance the Moola Partner Apps admin with creator and signup link fields, (3) display apps with logo, name, creator, and signup link.

---

## Changes

### 1. Notify patients when assigned a task
**File:** `src/pages/TodoList.tsx` — `addTask` function (line ~215)
- After inserting a todo with a `patient_id`, look up the patient's `patient_user_id`
- Insert a notification for the patient: `"📋 You've been assigned a new task: {title}"`
- Also applies to AI-generated tasks in `useSessions.ts` that have a `patient_id`

**File:** `src/hooks/useSessions.ts` — wherever todos with `patient_id` are created
- After inserting a patient-linked todo, insert a notification for `patient_user_id`

### 2. Extend `moola_partner_apps` table with `creator` and `signup_url` columns
**Migration:**
```sql
ALTER TABLE public.moola_partner_apps 
  ADD COLUMN IF NOT EXISTS creator text,
  ADD COLUMN IF NOT EXISTS signup_url text;
```

### 3. Enhance Moola Apps Admin UI
**File:** `src/pages/admin/GamificationAdmin.tsx`
- Add "Creator" and "Signup URL" fields to the Add App dialog
- Display Logo (as image), App Name, Creator, and Signup Link in the table
- Add edit capability for existing apps (update name, logo, creator, signup_url)

### 4. Update patient/doctor Moola Apps views
**Files:** `src/pages/patient/MyRewards.tsx`, `src/pages/doctor/DoctorRewards.tsx`
- Display partner apps with logo image, app name, creator, and clickable signup link

---

## Files Modified

| File | Change |
|------|--------|
| Migration | Add `creator`, `signup_url` columns to `moola_partner_apps` |
| `src/pages/admin/GamificationAdmin.tsx` | Enhanced Partner Apps admin with logo, creator, signup URL fields |
| `src/pages/TodoList.tsx` | Notify patient when task is assigned |
| `src/hooks/useSessions.ts` | Notify patient for AI-generated tasks |
| `src/pages/patient/MyRewards.tsx` | Show app logo, creator, signup link |
| `src/pages/doctor/DoctorRewards.tsx` | Show app logo, creator, signup link |

