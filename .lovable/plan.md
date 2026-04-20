

# Plan: Add "Admissions" tab to doctor's PatientProfile + enlarge Vula icon

## 1. Add "Admissions" tab next to "Session History"

**File:** `src/pages/PatientProfile.tsx`

- Import the existing `AdmissionsView` component:
  ```tsx
  import { AdmissionsView } from "@/components/admissions/AdmissionsView";
  ```
- In the `<TabsList>` (after the `sessions` `TabsTrigger`, line 343), add:
  ```tsx
  <TabsTrigger value="admissions" className="rounded-lg px-4 py-2.5 text-white hover:text-white/80 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm">
    Admissions
  </TabsTrigger>
  ```
- After the `sessions` `<TabsContent>` block, add:
  ```tsx
  <TabsContent value="admissions" className="space-y-4">
    <AdmissionsView
      patientId={patient.id}
      patientHeight={(patient as any).height_cm}
      patientWeight={(patient as any).weight_kg}
      canEdit={true}
    />
  </TabsContent>
  ```
  (Doctors viewing this page have edit affordances — `canEdit={true}` enables Add Vitals/Medication/Lab/Imaging buttons.)

## 2. Enlarge Vula icon to 50% of card height, center-vertical, right-aligned

**File:** `src/pages/PatientProfile.tsx` (lines 311–319)

The Vula stat card is a small p-2 stat tile. Restructure so the Vula symbol sits on the right side of the card, vertically centered, at ~50% of card height (cards in this row are roughly h-14 → icon ≈ `h-7 w-7`).

Replace the current Vula card markup with a two-column flex layout:

```tsx
<div className="rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-2 shadow-sm border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-between gap-2">
  <div className="flex flex-col min-w-0">
    <p className="text-[10px] font-medium text-muted-foreground">Vulas</p>
    <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">{lollipopCount}</p>
  </div>
  <img
    src={vulaSymbol}
    alt="Vulas"
    className="h-7 w-7 md:h-8 md:w-8 object-contain shrink-0"
  />
</div>
```

This makes the icon ~50% of the card's vertical height, vertically centered (`items-center`), and right-aligned (`justify-between` pushes it to the right edge), matching the user's screenshot intent.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/PatientProfile.tsx` | Add Admissions tab + content; resize/reposition Vula icon in stats card |

