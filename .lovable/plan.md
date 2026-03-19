

# Alphabet Separator, Moolas Logo, Hospital Admission Procedure Dropdown, Dashboard Stats Row

## 1. Alphabet Separator — Letter Badge Instead of Full-Width Bar

**`src/pages/Patients.tsx`** (lines 883-887):

Replace the full-width red bar with a compact letter badge. The `<tr>` row stays but with a minimal cell containing a small red circular badge with white text:

```tsx
<tr id={`patient-group-${letter}`}>
  <td colSpan={6} className="px-4 py-1">
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#E01837] text-white text-xs font-bold">
      {letter}
    </span>
  </td>
</tr>
```

## 2. Moolas Logo — Display Uploaded Logo Where Moolas Is Shown

The Moolas logo (`src/assets/moolas-logo.jpg`) is not currently imported anywhere. Add it as the icon in the key Moolas display areas:

- **`src/pages/patient/PatientDashboard.tsx`** (line 350-351): Replace the `<Award>` icon in the Moolas Hero Card with the Moolas logo image
- **`src/pages/Dashboard.tsx`** (line 334-339): Replace the `Award` icon in the Total Moolas StatsCard — pass a custom rendered image instead, or show the logo alongside the stat
- **`src/pages/PatientProfile.tsx`** (line 315): Replace the `Ⓜ` emoji with the Moolas logo image
- **`src/pages/patient/MyRewards.tsx`**: Add Moolas logo in the rewards header area

## 3. Hospital Admission — Procedure Dropdown with AI Auto-Population

**`src/components/sessions/HospitalAdmissionEditor.tsx`** (lines 456-496):

Replace the plain text `<Input>` for procedure description with a searchable dropdown that:
- Calls `lookup-medical-codes` with `codeSystem: 'NHRPL'` as the user types (debounced)
- Shows an alphabetically sorted dropdown list of procedure suggestions
- AI auto-populates the selection when `sessionId` is provided — on mount, fetch the session transcript/summary and invoke AI to extract the likely procedure, then pre-select it
- Selected procedure still triggers NHRPL code auto-fill as it does currently

Implementation:
- Add state for procedure suggestions and a loading indicator
- Use the existing `useCodeSearch` hook pattern for debounced search
- On component mount with `sessionId`, call `summarize-session` or read session notes to extract procedure context, then auto-search and pre-select the best match
- Sort suggestions alphabetically by description

## 4. Dashboard Stats — Single Row (Not Single Column)

**`src/pages/Dashboard.tsx`** (line 323):

Change `grid-cols-1` to a horizontal single-row layout:

```tsx
<div className="grid gap-5 grid-cols-2 lg:grid-cols-5">
```

This puts all 5 stats cards in one row on large screens, 2 per row on medium.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Patients.tsx` | Red badge letter instead of full-width red bar |
| `src/pages/Dashboard.tsx` | Stats grid to `grid-cols-2 lg:grid-cols-5`, Moolas logo |
| `src/pages/patient/PatientDashboard.tsx` | Moolas logo in hero card |
| `src/pages/PatientProfile.tsx` | Moolas logo replacing emoji |
| `src/pages/patient/MyRewards.tsx` | Moolas logo in rewards header |
| `src/components/sessions/HospitalAdmissionEditor.tsx` | Searchable procedure dropdown with AI auto-populate |

