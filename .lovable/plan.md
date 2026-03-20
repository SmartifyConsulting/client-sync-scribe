

# Add Procedure Dropdown to DocumentEditor for Hospital Admission Templates

## Problem

The searchable procedure dropdown (with AI auto-population and NHRPL code lookup) only exists in `HospitalAdmissionEditor`, which is accessed from a session context. When a doctor creates a Hospital Admission form from the **Documents page** or **Patient Profile** using the generic `DocumentEditor`, there is no procedure dropdown — just a plain text area.

## Solution

Enhance `DocumentEditor` to detect when the template is a Hospital Admission type (by name or category containing "admission") and render a searchable procedure dropdown above the content textarea.

### Changes to `src/components/documents/DocumentEditor.tsx`

1. **Detect admission template**: Check if `template.name` contains "Hospital Admission" or "Admission"
2. **Add procedure search state**: `procedureDescription`, `procedureSuggestions`, `loading`, dropdown visibility
3. **Add debounced search**: Call `lookup-medical-codes` with `codeSystem: 'NHRPL'` as user types (300ms debounce)
4. **Render dropdown**: When admission template detected, show a searchable procedure input with alphabetically sorted suggestions above the content area
5. **On selection**: Insert/replace `[ProcedureDescription]` placeholder in the content with the selected procedure, and also replace any `[ProcedureCode]` with the NHRPL code
6. **Pass template category**: Update the `Template` interface to include an optional `category` field for more reliable detection

### UI Flow

```text
DocumentEditor (Hospital Admission template)
├── Patient Selection (existing)
├── Document Name (existing)
├── Procedure Search Input  ← NEW
│   └── Alphabetical dropdown of NHRPL procedures
├── Content Textarea (existing, with procedure auto-filled)
└── Save Button (existing)
```

### Files Modified

| File | Change |
|------|--------|
| `src/components/documents/DocumentEditor.tsx` | Add procedure dropdown for admission templates |
| `src/pages/Documents.tsx` | Pass `category` to DocumentEditor template prop |
| `src/pages/PatientProfile.tsx` | Pass `category` to DocumentEditor template prop |

