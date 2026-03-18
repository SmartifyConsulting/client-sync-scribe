

# Fix Dashboard Icons & Standardize Tab Styling

## 1. Dashboard Icon Backgrounds

**Problem:** Mic and Bell buttons use `bg-secondary` (light grey `hsl(220 14% 96%)`) with `text-white` icons — invisible.

**Fix in `src/pages/Dashboard.tsx` (lines 187, 198):**
- Replace `bg-secondary` → `bg-terracotta`
- Replace `hover:bg-secondary/90` → `hover:bg-terracotta-dark`

## 2. Standardize All Tabs to Teal Style

Currently tabs are inconsistent:

| File | Current Style |
|------|--------------|
| `PatientProfile.tsx` | `bg-primary` (teal) with white text — correct |
| `MyRewards.tsx` | `bg-primary` (teal) — correct |
| `GamificationAdmin.tsx` | `bg-primary` (teal) — correct |
| `Documents.tsx` | `bg-primary` (teal) — correct |
| **`Profile.tsx`** | **Default grey (no bg class)** — needs fix |
| **`HealthAlbum.tsx`** | **Default grey (no bg class)** — needs fix |
| **`CompactTodoList.tsx`** | **`bg-muted/50` (grey)** — needs fix |

**Fix:** Update the three inconsistent files to match the established teal tab pattern:

- **`Profile.tsx` (lines 453, 495):** Add `bg-primary` to `TabsList`, add `data-[state=active]:bg-white data-[state=active]:text-black text-white` to each `TabsTrigger`
- **`HealthAlbum.tsx` (line 209):** Same teal pattern on `TabsList` and triggers
- **`CompactTodoList.tsx` (line 331):** Same teal pattern (compact sizing preserved)

### Standard Tab Classes

```tsx
// TabsList
className="bg-primary"

// TabsTrigger
className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
```

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Icon backgrounds → `bg-terracotta` |
| `src/pages/Profile.tsx` | Tabs → teal style |
| `src/pages/patient/HealthAlbum.tsx` | Tabs → teal style |
| `src/components/dashboard/CompactTodoList.tsx` | Tabs → teal style |

