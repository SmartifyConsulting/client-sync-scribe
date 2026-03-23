

# Plan: Separate Frames for Preferences Sub-sections & Fix Signature Font Preview

## Problem
1. Patient Management, Calendar Integration, and Digital Signature are all inside one bordered frame, separated only by `<Separator />`. User wants three distinct frames.
2. The signature font dropdown's trigger (selected value) doesn't show the font preview styled — only the dropdown items are styled with `fontFamily`.

## Changes

### File: `src/pages/Settings.tsx`

**1. Split into 3 separate frames**

Break the single `<div className="rounded-xl border border-primary bg-card p-4 shadow-sm space-y-4">` into three independent bordered frames:

- **Frame 1 — Patient Management**: Contains the `<h3>Patient Management</h3>` heading and the inactivity threshold setting. Only shown for doctors.
- **Frame 2 — Calendar Integration**: Contains the calendar heading and Google/Outlook connection rows.
- **Frame 3 — Digital Signature**: Contains the signature preview, font/color/size selectors, and bold/italic toggles. Only shown for doctors.

Language section stays in the main Preferences frame at the top (with the Settings2 icon and h2).

Remove the `<Separator />` dividers between these sections since they'll be separate cards.

**2. Fix font preview in SelectTrigger**

Currently the `<SelectTrigger><SelectValue /></SelectTrigger>` for fonts doesn't render the selected font styled. Replace it with a custom `SelectValue` that applies `fontFamily` to the displayed value:

```tsx
<SelectTrigger>
  <SelectValue>
    <span style={{ fontFamily: getSignatureFontFamily(sigFormData.signature_font), fontSize: '16px' }}>
      {SIGNATURE_FONTS.find(f => f.value === sigFormData.signature_font)?.label}
    </span>
  </SelectValue>
</SelectTrigger>
```

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Split preferences content into 3 separate bordered frames; fix font preview in select trigger |

