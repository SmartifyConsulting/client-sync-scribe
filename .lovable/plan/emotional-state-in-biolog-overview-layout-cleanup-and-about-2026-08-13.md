# Emotional State in Biolog, Overview layout cleanup, and About Me relationship profile

Three pieces of work on the existing patient profile. Nothing existing is replaced.

## 1. Emotional State shared with Biolog

Today the private emotional journal lives only in the patient profile Overview (Emotional State subtab) and writes to the emotional journal table.

- Reuse the same journal component inside My Biolog as an "Emotional State" entry point, so a patient can capture how they are feeling from either place and see one single list.
- One source of truth: no copies, no sync job. An entry written in Biolog appears in the profile's Emotional State subtab and vice versa.
- Privacy stays exactly as it is: raw entries are visible to the patient only; the care team continues to see only the sanitised AI summation.

## 2. Rearranged Allergies / Conditions / Medications / Symptoms area

The current Overview puts Allergies and Conditions in a narrow left column beside a wide DISC card, with Medications and Symptoms in a separate row below — the boxes are different widths and heights and it reads as unbalanced.

New arrangement:

```text
[ Allergies ] [ Conditions ] [ Medications ] [ Symptoms ]   <- one even 4-up row, equal cards
[ DISC profile              ][ How to work with this patient ]
```

- Four equal clinical cards in a responsive row (4 across on desktop, 2 on tablet, 1 on mobile), same collapsible behaviour and colour accents as now, aligned headers and consistent padding.
- The two relationship cards sit side by side beneath them.
- No changes to the data, actions (active/resolved toggles) or permissions inside those cards.

## 3. About Me — relationship insight exercise

### Patient side

- New "About Me" accordion added above Personal Information, using the existing green section header pattern. It hosts the existing personal-information content already associated with it plus a new "Help us understand you" subsection.
- Warm framing copy, the "no right or wrong answers" note, and the privacy line stating the responses help the care team communicate well and are not a diagnosis.
- Two short question sets, presented as one conversational exercise (no stage/part/test labels): "Which sounds most like you?" then "And which feels most like you?", three generously spaced selectable cards each, plus a quiet "None of these really feels like me" option.
- On finish: a simple thank-you — "That's all we need. This helps your care team understand how best to work with you." No result, no score, no badge shown to the patient.
- Once completed, the section shows "Your responses" with Review and Retake. Retaking archives the previous result and makes the new one active.

### Clinician side

- A compact "How to work with this patient" card in Overview, next to the existing DISC card, in the existing Overview visual language.
- Shows short human-readable lines only: what may motivate them, communication, builds trust, be mindful of, useful approach.
- Confidence shown as words only (Emerging / Moderate / Strong). Low confidence adds "Early insight — consider exploring communication preferences directly."
- Small info icon with the tooltip: relationship insight, supports rapport and communication, not a medical, psychological or diagnostic assessment, not for clinical decisions.
- If nothing has been captured yet, the card states that quietly rather than rendering empty.

### Never shown anywhere

No type names, pattern numbers, percentages, radar charts, progress bars or personality-test styling — in either the patient or the clinician view.

## Technical notes

- Data: new patient relationship-profile columns/table storing status (not_started / incomplete / completed / insufficient_information), raw responses (`{"question_set_1":"A","question_set_2":"B"}`), derived pattern, confidence, version and completion date, plus a history table so retakes are preserved as an audit trail. Access rules follow existing patient/clinician patterns: patients write their own responses and can never read the derived insight; clinicians with record access read the insight and status.
- Engine: mapping of the two selections to nine internal patterns and the full insight library live in one versioned config module (not inline in components), so wording and mapping can be revised without a database migration. Version is stamped on each saved profile.
- Reuse: existing collapsible/section header components, field typography, DISC card layout, and the emotional journal component. DISC data and behaviour are untouched.
- Verify: first-time patient, partially completed exercise, completed, "none of these", retake, clinician view for completed and incomplete profiles, patient cannot see the derived insight, and mobile plus desktop layouts.
