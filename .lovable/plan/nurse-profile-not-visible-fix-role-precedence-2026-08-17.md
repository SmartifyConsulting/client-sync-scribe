# Nurse Profile not visible — fix role precedence

## What's happening

The Nurse Profile page and nurse menu were built and routed (`/nurse-profile`), but the demo nurse account never reaches them.

Nomvula Dlamini's account (nomvula.sample@email.test) carries **both** the `doctor` and `nurse` roles. The sidebar decides the menu with:

```text
isNurse = role === "nurse" OR (has nursing roster record AND role !== "doctor")
```

Because role resolution returns `doctor` for her, the nurse branch is skipped and she lands on the doctor menu / `/practice` — which is exactly what is on screen now.

Her roster row also has no `ward_id`, so the Current Assignment section would show an empty ward even after the menu is fixed.

## The fix

1. **Nurse takes precedence over doctor when a nursing roster record exists.** Change the sidebar rule so any user with a `hospital_nurses` row linked to their account gets the nurse menu, regardless of an additional doctor role. The nurse can still flip to her patient menu with the existing Nurse | Patient toggle.
2. Apply the same precedence in the nurse profile route guard so `/nurse-profile` renders for her.
3. **Assign a ward to the demo nurse** — link Nomvula Dlamini to Ward 4 at her hospital so Current Assignment, ward-scoped patients and the Ward Board have real data.
4. Verify after the change: signing in as the nurse shows Dashboard → My Shifts → Ward Board → Admissions → My Profile, and the Nurse filter badge instead of Doctor.

## Technical notes

- `src/components/layout/Sidebar.tsx` — nurse detection line (~225): drop the `role !== "doctor"` condition and let the roster record win; keep `isDoctor` mutually exclusive.
- `src/pages/NurseProfile.tsx` — same precedence for whatever role check gates the page.
- Data: update `hospital_nurses.ward_id` for the Nomvula row to the Ward 4 id at her hospital (data-only, no schema change).
- No changes to permissions, certifications or the profile layout itself.
