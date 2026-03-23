

# Plan: Personal Sub-tabs + Font Size Reduction for Labels/Inputs

## 1. Convert Preferences to a Sub-tab under Personal

Currently, Preferences (auto-email toggles, Patient Management, Language, Calendar) is rendered inline inside the Personal tab after a `<Separator>`. Change this to a **nested Tabs** component inside Personal:

**Sub-tabs under Personal:**
- **Details** — Name, Email, Phone, Specialty, Mailbox (current top section)
- **Preferences** — Auto-email toggles, Patient Management, Language, Calendar Integration (current bottom section)

This means wrapping the Personal `TabsContent` in a secondary `<Tabs>` with two `<TabsTrigger>` items and splitting the content accordingly.

## 2. Reduce Label and Input/Select Font Sizes by 30%

The current sizes are visually oversized relative to the 7.35px base:

| Component | Current | After 30% reduction |
|-----------|---------|---------------------|
| `Label` (`label.tsx`) | `text-sm` (14px) | `text-[10px]` |
| `Input` (`input.tsx`) | `text-base` (16px) | `text-[11px]` |
| `SelectTrigger` (`select.tsx`) | `text-base` (16px) | `text-[11px]` |

These are global component-level changes that will apply across the entire app.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Replace inline Preferences section with nested sub-tabs (Details + Preferences) inside Personal tab |
| `src/components/ui/label.tsx` | `text-sm` → `text-[10px]` |
| `src/components/ui/input.tsx` | `text-base` → `text-[11px]` |
| `src/components/ui/select.tsx` | `text-base` → `text-[11px]` in SelectTrigger |

