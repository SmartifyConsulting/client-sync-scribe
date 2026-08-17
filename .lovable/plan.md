# Round Table chat bubbles, tidier recent visits, and the missing test emails

## 1. Round Table topic heading — no frame

The topic header currently sits inside its own bordered accordion box, which draws a second frame around the heading.

- Remove the border/box from the topic header row; keep only the topic title (teal, semibold), the author line and the expand chevron.
- Keep a single light divider between the topic body and the discussion, and one outer card around the whole topic — no nested frames.

## 2. Conversation as speech bubbles

Replace the flat message rows with a proper chat thread:

- Each message becomes a rounded speech bubble with a small tail, avatar initials, and time on the right.
- Your own messages align right; other participants align left.
- Each doctor gets a distinct bubble colour, assigned deterministically from their user ID out of a small palette of soft, on-brand tints (teal, blue, amber, violet, rose, green) so the same doctor always keeps the same colour in every thread. Text colour is chosen for readability on each tint.
- The doctor's name inside a bubble drops to the same size as the topic author line (extra-small), so it no longer looks larger than the topic header's byline.

## 3. Recent visits — summarised, not cut off

The Patient Overview "Recent visits" list currently slices the AI summary at 90 characters, which cuts sentences mid-word and repeats the patient's name in every line.

- Strip the patient's name and leading "The patient / He / She" phrasing from each visit line.
- Condense each visit to one short clause describing what was presented (for example "acute foot pain, swelling after a fall") rather than a truncated sentence.
- Cut on a word/clause boundary with a trailing ellipsis only when genuinely long, so nothing ends mid-word.

## 4. Test emails not received

The branded document test emails were dispatched but have not arrived, so before re-sending we check the delivery trail: the email send log status for those messages (`sent`, `dlq`, `suppressed`, `failed`), the send function logs for errors, and whether georgia.adams@smartify.co.za is on the suppression list.

- Fix whatever the log shows (suppression, bad sender domain, or a function error).
- Re-send one test of each document type (Consultation Note, Medical Certificate, Referral Letter, Prescription, Invoice) to georgia.adams@smartify.co.za, then confirm each shows `sent` in the log and report the result back with what to look for (logo, document link, personalised greeting, signature above the sender line).

## Technical notes

- `src/features/patients/components/RoundTable.tsx`: remove the accordion item border, add a `bubbleTone(doctorId)` helper mapping to semantic tint classes, restructure message rows into aligned bubbles, and set the in-bubble name to `text-xs`.
- `src/features/sessions/components/SessionPatientOverview.tsx`: replace the raw `.slice(0, 90)` with a `summariseVisit()` helper (name/pronoun stripping + clause-boundary trim).
- Email checks use the email send log, suppression table and the `send-document-email` function logs; no schema changes expected.
