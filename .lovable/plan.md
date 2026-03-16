

# Plan: Dashboard Styling, Sign-up Wizard, Doctor Search, Navigation Updates

## 1. Dashboard Icon Styling

**Record Task Mic icon** (Dashboard.tsx, lines 184-189):
- Replace the ghost button with a terracotta round badge: `className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center"` and make the Mic icon white.

**Notification Bell** (Dashboard.tsx, lines 196-198):
- Add terracotta fill to the Bell icon: `className="h-5 w-5 fill-secondary text-secondary"`.

## 2. Country Code for Phone Numbers on Sign-up

**Auth.tsx** — Add a country selector dropdown before phone number fields (for both doctor mobile and patient phone). Include common countries (South Africa +27 default, UK, US, etc.). Store the selected country code with the phone number.

Map country to preferred language automatically:
- South Africa → English
- UK → English  
- Germany → German
- France → French
- etc.

Save `preferred_language` to the profile on registration.

## 3. Break Sign-up Into Multi-Step Wizard

Refactor `Auth.tsx` signup flow into a stepped wizard with progress indicator:

**Doctor Steps:**
1. Account (email, password, role selection)
2. Profile (name, photo, signature)
3. Practice Info (specialty, practice number, doctor number, address)
4. Partners (optional practice partners)
5. Terms & Payment

**Patient Steps:**
1. Account (email, password, role selection)
2. Personal Info (name, phone with country, DOB, addresses)
3. Employment & Referral
4. Medical Insurance
5. Next of Kin & Allergies
6. Terms & Payment

**Save & Resume**: After step 1 (account creation), save partial registration data to `localStorage` keyed by email. On return to signup, detect saved data and offer to resume. Clear saved data on successful completion.

Each step has Previous/Next buttons. A step indicator shows progress at the top.

## 4. Search Doctors on MediPad

Add a doctor search feature accessible to patients (e.g., on My Doctors page or a new search page). Query the `profiles` table where `role = 'doctor'`, searching by `full_name` (ILIKE) or `practice_number` (exact match). Display results with name, specialty, and practice number. Allow sending a connection request from search results.

This requires an RLS policy update — patients need to search doctor profiles:
```sql
CREATE POLICY "Anyone can search doctor profiles"
ON public.profiles FOR SELECT TO authenticated
USING (role = 'doctor');
```

## 5. Deactivate Health Album

- **Sidebar.tsx**: Remove the Health Album entry from `patientNavItems` (line 57).
- **BottomNav.tsx**: No Health Album entry exists there, so no change needed.
- **App.tsx**: Keep the route but redirect to dashboard, or simply remove it. Keeping the route with a "Feature unavailable" message is safer for bookmarked URLs.

## 6. Add "My Tasks" for Patients

**Navigation**: Add a "My Tasks" entry in `patientNavItems` after "My Calendar":
```typescript
{ icon: CheckSquare, label: "My Tasks", to: "/patient/tasks" }
```

**New Page**: `src/pages/patient/PatientTasks.tsx` — Shows tasks assigned to the patient by doctors. Query the `todos` table where `patient_id` matches a patient record linked to the current user (`patient_user_id = auth.uid()`).

**Database**: Add an RLS policy so patients can view todos assigned to them:
```sql
CREATE POLICY "Patients can view todos assigned to them"
ON public.todos FOR SELECT TO authenticated
USING (
  patient_id IN (
    SELECT id FROM patients WHERE patient_user_id = auth.uid()
  )
);
```

**Route**: Add `/patient/tasks` route in App.tsx pointing to the new PatientTasks component.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/Dashboard.tsx` | Style mic icon (terracotta badge) and bell icon |
| `src/pages/Auth.tsx` | Major refactor into wizard with country code selector |
| `src/components/layout/Sidebar.tsx` | Remove Health Album, add My Tasks |
| `src/components/layout/BottomNav.tsx` | Add My Tasks if space allows |
| `src/pages/patient/PatientTasks.tsx` | New page for patient-assigned tasks |
| `src/App.tsx` | Add PatientTasks route |
| `src/pages/patient/MyDoctors.tsx` | Add doctor search by name/practice number |
| SQL Migration | RLS for patient task viewing + doctor profile search |

