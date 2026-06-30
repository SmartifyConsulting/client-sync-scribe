# SOS Severity Modal — Headcount Steppers

Replace the Yes/No/Skip questions on step 2 of `SeverityPicker` with three tap-to-adjust counters using − / + buttons.

## UI changes (`src/modules/holarchelp/components/SeverityPicker.tsx`)

Step 2 ("Quick check") becomes three stepper rows:

1. **People needing help** — total count (min 1, default 1)
2. **Breathing** — count (min 0, default 0)
3. **Unconscious** — count (min 0, default 0)

Each row:
```text
[ Label                ]
[  −   ]   42   [  +   ]
```

- Large 44px square − / + buttons (touch-friendly, no keyboard entry).
- Center shows the current number in a bold, large font.
- Disable − at min; cap + at the "people needing help" total for the breathing/unconscious rows (auto-clamp if total decreased).
- Replace `YesNoSkip` with a new `CountStepper` subcomponent in the same file.

## Data changes

- Extend `SeverityResult` to:
  ```ts
  export type SeverityResult = {
    severity: Severity;
    peopleCount: number;
    breathingCount: number;
    unconsciousCount: number;
    // kept for backwards compatibility, derived:
    conscious: boolean | null;
    breathing: boolean | null;
  };
  ```
- Derive legacy `conscious`/`breathing` booleans so existing consumers keep working:
  - `breathing = breathingCount > 0 ? true : (unconsciousCount > 0 ? false : null)`
  - `conscious = (peopleCount - unconsciousCount) > 0 ? true : (unconsciousCount > 0 ? false : null)`
- For `moderate` severity, submit with `peopleCount: 1` and zero counts (skips step 2 as today).

## i18n

Add keys under `severityPicker`:
- `peopleNeedHelp`, `breathingCount`, `unconsciousCount`, `decrease`, `increase` (aria-labels).

Wire English first; other 24 locales fall back to English until a follow-up translation pass.

## Out of scope

- No DB schema changes (counts ride along in the existing in-memory result; persistence wiring is unchanged).
- No changes to step 1 severity tiles.
