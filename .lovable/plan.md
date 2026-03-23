

# Fix: Digital Signature Font Preview in Dropdown

## What It Does
Each font option in the dropdown will render in its actual Google Font typeface at a larger size, so you can see exactly what each signature style looks like before selecting it.

## Technical Change

### File: `src/pages/MyPractice.tsx` (line 729)

Replace the single-line `SelectContent` with an expanded version that adds:
- `max-h-[300px]` on `SelectContent` for scrollability
- `py-3` padding on each `SelectItem` for breathing room
- Font size increased from `18px` to `22px` with `lineHeight: '1.4'`

```tsx
// Before (line 729):
<SelectContent>{SIGNATURE_FONTS.map(f => <SelectItem ...><span style={{ fontFamily: f.fontFamily, fontSize: '18px' }}>{f.label}</span></SelectItem>)}</SelectContent>

// After:
<SelectContent className="max-h-[300px]">
  {SIGNATURE_FONTS.map(f => (
    <SelectItem key={f.value} value={f.value} className="py-3">
      <span style={{ fontFamily: f.fontFamily, fontSize: '22px', lineHeight: '1.4' }}>
        {f.label}
      </span>
    </SelectItem>
  ))}
</SelectContent>
```

The inline `style` attribute with `fontFamily` ensures each item renders in its actual font. The `fontSize: '22px'` overrides the `text-[10px]` class on `SelectItem`, making the font differences clearly visible. All fonts are already loaded via Google Fonts in `index.html`.

### Files Modified

| File | Change |
|------|--------|
| `src/pages/MyPractice.tsx` | Expand font dropdown items with larger preview size and padding |

