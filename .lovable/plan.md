

# Digital Signature Fonts, Styling Controls & Drag-Drop Cleanup

## 1. Replace Signature Fonts

Replace `SIGNATURE_FONTS` array in `Profile.tsx` with 11 new Google Fonts. Each font now only defines `value`, `label`, and `fontFamily` — size/weight/italic are user-controlled separately.

New fonts: Allura, Great Vibes, Herr Von Muellerhoff, Homemade Apple, Kalam, Mr Dafoe, Petit Formal Script, Pinyon Script, Reenie Beanie, Rock Salt, Sacramento.

**`index.html`**: Update the Google Fonts `<link>` to include all 11 fonts (with italic variants for those that support it):
```
family=Allura&family=Great+Vibes&family=Herr+Von+Muellerhoff&family=Homemade+Apple&family=Kalam:wght@400;700&family=Mr+Dafoe&family=Petit+Formal+Script&family=Pinyon+Script&family=Reenie+Beanie&family=Rock+Salt&family=Sacramento
```

## 2. Add Size, Bold, Italic Controls

### Database Migration
Add 3 new columns to `profiles`:
```sql
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS signature_font_size integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS signature_bold boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature_italic boolean DEFAULT false;
```

### Profile.tsx Changes

- Add `signature_font_size`, `signature_bold`, `signature_italic` to `formData` state (defaults: 24, false, false)
- Load from profile, save via autosave (same debounce pattern)
- **Color**: Keep the existing dropdown but add more options: Black, Teal (#104861), Navy (#1a2744), Dark Red (#8B0000), Dark Green (#006400)
- **Size**: Add a slider (range 16–48, step 2) with the current size displayed
- **Bold/Italic**: Two toggle buttons (B and I) next to the size slider
- **Preview**: Update the signature preview `<p>` to use all dynamic styles:
  ```
  fontSize: `${formData.signature_font_size}px`
  fontWeight: formData.signature_bold ? 'bold' : 'normal'
  fontStyle: formData.signature_italic ? 'italic' : 'normal'
  ```

### Layout
Reorganize the signature controls from 2-column grid to:
- Row 1: Font selector (full width) — each option rendered in its own font
- Row 2: Color selector | Size slider with value label
- Row 3: Bold toggle | Italic toggle

## 3. Remove Drag-and-Drop from Non-Patient Tabs

The `TemplateSectionEditor.tsx` component has drag-and-drop for image uploads. It's used in `HeaderFooterTemplateForm.tsx` and `TemplateForm.tsx` (document templates, not patient-related).

The component already has a `showImageUpload` prop. The drag-drop zone only renders when `showImageUpload && !value.imageUrl`. The simplest approach: no changes needed to `TemplateSectionEditor` — just pass `showImageUpload={false}` from template forms.

However, re-reading the request: "Remove the drag and drop feature from all the tabs except the Patient tab" — this refers to the **Profile page tabs**. The Patient tab has `PatientImport` which uses drag-and-drop for CSV import. There is no drag-and-drop on other Profile tabs (Practice, Pricing, Certificates). The `TemplateSectionEditor` drag-drop is on a different page (Documents). So this part is already satisfied — no drag-and-drop exists on non-Patient Profile tabs. No changes needed here.

Actually, let me re-check: there's a stray `<PatientImport />` at line 878 outside the tabs. That should be removed as it duplicates the one inside the Patients tab.

## Files Modified

| File | Change |
|------|--------|
| `index.html` | Add 11 Google Fonts to the fonts link |
| `src/pages/Profile.tsx` | Replace `SIGNATURE_FONTS`, add size/bold/italic/color controls, remove stray `<PatientImport />` at line 878 |
| Database migration | Add `signature_font_size`, `signature_bold`, `signature_italic` columns |

