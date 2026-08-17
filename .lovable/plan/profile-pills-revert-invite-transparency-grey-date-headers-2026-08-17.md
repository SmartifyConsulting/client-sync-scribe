# Profile pills revert, invite transparency, grey date headers

## 1. Undo the profile switcher pill colours
In the sidebar account menu, restore the pills to exactly how they looked before the orange/grey change:
- Doctor pill: soft light-teal background (`bg-primary/10`), rounded-md, teal stethoscope icon, dark name text, muted role label.
- Patient/other-role block: plain text block (no grey pill background).
- Keep the click-to-switch behaviour that already exists.
The dark-orange border on the sharing panel stays as-is (only the pills revert).

## 2. Show access transparency in the doctor invitation
The invitation card currently ends with a short paragraph about other practitioners. Replace that paragraph with an explicit second column titled "What other practitioners can access":
- One column, each row with a green tick or red cross (no bullets), matching the sharing modal wording:
  - Tick: Round Table notes and shared care-team discussions; sessions the patient explicitly shared; shared documents; medication and allergy list.
  - Cross: your private clinical notes not shared to the care team; the patient's Emotional Journal / Ask Holarc chats; records from other practitioners not shared with them; billing details.
- Layout stays two columns: left = what *you* get (ticks then crosses stacked), right = what other practitioners can access.

## 3. Lighter grey date headers (To-Do List and My Round Tables)
- Add a new shared accordion style: medium-light grey bar with dark text (instead of the green bar), used only for the date-level headers on the Dashboard To-Do List card and the My Round Tables card. All other green accordions across the app are untouched.
- To-Do List date header font: increase one step (xs to sm).
- My Round Tables date header font: reduce to match the To-Do list header (same size and weight).

## Technical notes
- `src/components/layout/AccountMenu.tsx`: restore prior markup for both role blocks.
- `src/components/doctor/DoctorAccessRequests.tsx`: add `OTHER_PRACTITIONER_ACCESS` list (label + allowed flag) and render it in the right column.
- `src/components/ui/section-accordion.tsx`: add `SECTION_TRIGGER_GREY_CLASS` (neutral grey bg, foreground text, count pill stays readable).
- `src/components/dashboard/CompactTodoList.tsx`: swap the date-level trigger to the grey class, header text `text-sm`.
- `src/components/common/ListGroupToolbar.tsx`: new optional `headerTone?: "green" | "grey"` prop; `DoctorRoundTables` passes `grey` when compact and header text drops to `text-sm font-medium`.
- Update `mem://design/todo-accordion-and-row-spec` to record the grey date bar and larger header font so it stays locked.
