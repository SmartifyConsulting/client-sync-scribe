

# Self-Host Signature Fonts & Show Doctor's Name in Dropdown

## What It Does
- Bundles the 10 uploaded `.ttf` font files directly into the app (no Google Fonts dependency for signatures)
- Each dropdown item shows the **doctor's actual name** rendered in that font, instead of the font name
- The trigger also shows the doctor's name in the selected font

## Technical Changes

### 1. Copy font files to `public/fonts/signatures/`
Copy all 10 uploaded `.ttf` files into `public/fonts/signatures/` so they're served as static assets.

### 2. Register fonts via `@font-face` in `src/index.css`
Add `@font-face` declarations for each font, e.g.:
```css
@font-face {
  font-family: 'Allura';
  src: url('/fonts/signatures/Allura-Regular.ttf') format('truetype');
  font-display: swap;
}
/* ... repeat for all 10 fonts */
```
Note: "Kalam" was not uploaded, so it stays as a Google Font or gets removed from the list.

### 3. Update dropdown to show doctor's name (`src/pages/MyPractice.tsx`)
- In the `SelectContent`, change each item's label from `f.label` to `combinedFullName || f.label` (falls back to font name if no name entered)
- In the `SelectTrigger`, also show `combinedFullName` in the selected font
- The font preview box already shows the doctor's name — no change needed there

```tsx
<SelectContent className="max-h-[300px]">
  {SIGNATURE_FONTS.map(f => (
    <SelectItem key={f.value} value={f.value} className="py-3">
      <span style={{ fontFamily: f.fontFamily, fontSize: '22px', lineHeight: '1.4' }}>
        {combinedFullName || f.label}
      </span>
    </SelectItem>
  ))}
</SelectContent>
```

### 4. Remove Google Font imports for signature fonts from `index.html`
Remove the signature-specific fonts (Allura, Great Vibes, etc.) from the Google Fonts `<link>` tag since they're now self-hosted. Keep other fonts (Rochester, Lora, etc.) that are used elsewhere.

## Files Modified

| File | Change |
|------|--------|
| `public/fonts/signatures/*.ttf` | Copy 10 uploaded font files |
| `src/index.css` | Add 10 `@font-face` declarations |
| `src/pages/MyPractice.tsx` | Show doctor's name instead of font name in dropdown items |
| `index.html` | Remove signature fonts from Google Fonts link |

