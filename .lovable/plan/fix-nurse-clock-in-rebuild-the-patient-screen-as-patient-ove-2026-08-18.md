# Fix nurse clock-in + rebuild the patient screen as "Patient Overview"

## 1. "Clock failed — already clocked in on another shift"

Today the clock-in database function refuses to start a shift whenever the same
staff member still has an open (never clocked-out) shift. Nomvula's demo data
contains an in-progress shift, so every "Clock in" button on the week fails.

Change the behaviour so starting a new shift automatically closes any other
still-open shift for that same person (marked completed at the moment the new
one starts), then clocks the new shift in. This matches real hospital practice:
you cannot be on two shifts at once, and the earlier one is simply ended.

The shift calendar / My Shifts screen will also show **Clock out** instead of
**Clock in** on whichever shift is currently open, so the state is obvious.

## 2. Rename the nurse's patient drill-down to "Patient Overview"

When a nurse taps a patient name from the ward/admissions list, the screen is
currently titled and back-linked as "Admissions". It becomes **Patient Overview**:

- Page heading and back-link label updated to "Patient Overview" / "Back".
- The top identity card gains an **Emergency contact** line: name and phone
  number, shown alongside the existing demographics.
- The four small frames below the vitals panel — Conditions & diagnoses,
  Allergies, Current medications, Emergency contacts — are removed.
- In their place, the same **Patient Overview** frame used on the Session
  Recording screen is rendered: headline recap of the last 6 months, with
  Conditions / Current meds / Allergies columns and Recent visits.

## 3. Re-layout the frames below

- **Diet & Meals** moves up to sit on the same row as, and to the left of, the
  **Patient Overview** frame (two columns on desktop, stacked on mobile).
- **Lab Results** and **Imaging** share the next row, side by side.
- Vitals, admissions history and clinical notes keep their current positions.

```text
[ Vitals panel                                   ]
[ Diet & Meals        ][ Patient Overview        ]
[ Lab Results         ][ Imaging                 ]
[ Admissions at this hospital                    ]
```


Note: the Allergies frame is included in the removals because the shared
Patient Overview frame already shows allergies (in red) — keeping both would
duplicate it. Say the word if you'd rather keep the standalone Allergies card.

## Technical notes

- Migration replacing `public.hospital_shift_clock`: on `'in'`, `UPDATE` any
  other shift for the same `doctor_id`/`nurse_id` with `clocked_in_at IS NOT NULL
  AND clocked_out_at IS NULL` to `clocked_out_at = now(), status = 'completed'`,
  then proceed. Keep the "Already clocked in" guard for the same shift.
- `HospitalPatientRecordScreen.tsx`: drop the local `Section` cards for
  conditions/allergies/medications/contacts and the `contacts` memo; render
  `SessionPatientOverview` from `@/features/sessions/components/SessionPatientOverview`
  with the fetched `patient` row. It degrades gracefully to record data if the
  AI summary call is unavailable to nurse accounts.
- Add emergency contact name/phone to the demographics grid (falls back to next
  of kin when the emergency contact fields are empty).
