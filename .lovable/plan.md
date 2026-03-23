

# Plan: Reset Body Font Size & Reduce Muted Description Text

## 1. Reset Body Font Size

**File**: `src/index.css` (line 162)

Remove `font-size: 7.35px;` from the `body` rule, restoring the browser default of **16px**. This will affect all `rem`-based sizes across the app (everything will scale up proportionally).

## 2. Reduce `text-sm text-muted-foreground` Globally

With 856 occurrences across 59 files, a per-file find-and-replace is impractical. Instead, add a CSS utility rule in `src/index.css` that targets the combination:

```css
.text-muted-foreground.text-sm {
  font-size: 0.625rem; /* ~10px at 16px base, two steps below text-sm (0.875rem) */
}
```

This single rule downsizes all `text-sm text-muted-foreground` elements by two steps without touching any component files.

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Remove `font-size: 7.35px` from body; add CSS override for `.text-muted-foreground.text-sm` |

## Risk Note

Resetting to 16px base will significantly enlarge all rem-based text and spacing. If the 7.35px was set to achieve a compact clinical UI, this change will alter the entire look. Button sizes, padding, and layout will all scale up.

