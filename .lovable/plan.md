

# Add My Calendar to Care Section

## Change

Add "My Calendar" as a top tab under the **🤝 Care** bottom nav section, alongside Providers, Sessions, and Round Table.

## Files Modified

| File | Change |
|------|--------|
| `src/components/layout/BottomNav.tsx` | No change needed (Care section already links to `?section=care`) |
| `src/components/patients/PatientDetailsEditor.tsx` | Add "My Calendar" tab trigger and tab content under the `care` section, rendering the patient calendar view (import from `PatientCalendar` or embed calendar component). Place it after "My Sessions" tab. |

## Care Section Top Tabs (Updated)

```text
🤝 Care → Providers | Sessions | My Calendar | Round Table
```

