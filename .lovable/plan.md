

# Plan: Fix preview font + Round Table typography

Two unrelated tweaks in a small set of files.

## 1. Document preview fonts don't match the template

**Root cause.** Templates store `font_family` as a logical key like `"sans"`, `"open-sans"`, `"lora"`, `"roboto"`, `"playfair"`, etc. The template editor previews these correctly because it uses Tailwind classes (`font-sans`, `font-open-sans`, `font-lora`) that resolve to the real loaded font families in `tailwind.config.ts` (Inter, Open Sans, Lora…).

But `DocumentPreview` (`src/components/sessions/DocumentPreview.tsx`) takes that same key and shoves it straight into a CSS `font-family` style:

```tsx
fontFamily: fontFamily || "system-ui, -apple-system, sans-serif"
```

CSS has no idea what `"sans"` or `"open-sans"` means — so the browser falls back to its default serif/sans, and the preview looks nothing like the template. Body text is also locked at `12pt` regardless of what the template chose, while header/footer cells are locked at `9pt`.

**Fix.**

a. Add a small `FONT_FAMILY_MAP` constant (mirrors the values in `tailwind.config.ts`):

```ts
const FONT_FAMILY_MAP: Record<string, string> = {
  sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  roboto: '"Roboto", sans-serif',
  "open-sans": '"Open Sans", sans-serif',
  lora: '"Lora", serif',
  merriweather: '"Merriweather", serif',
  playfair: '"Playfair Display", serif',
  "source-serif": '"Source Serif 4", serif',
  rockwell: 'Rockwell, Georgia, serif',
};
const resolveFont = (key?: string | null) =>
  (key && FONT_FAMILY_MAP[key]) || FONT_FAMILY_MAP.sans;
```

Use `resolveFont(fontFamily)` everywhere `DocumentPreview.tsx` currently writes a raw `fontFamily` string (the page wrapper, the body content `div`, and the `renderHeaderFooterSection` cells).

b. Pass the same resolved family into `printDocument(...)` so the printed/PDF output matches the on-screen preview.

c. Make body text size match the template editor's preview (which uses default body text, ~14px / `text-sm`) instead of the hard-coded `12pt`. Header/footer cell size stays small (`9pt` is already correct for letterhead).

d. In `DocumentPreviewWithLetterhead` inside `PatientProfile.tsx` (line 1215), also fall back to the document's *template* `font_family` when the header/footer template doesn't set one — currently it only reads `headerFooter?.font_family`. Add a tiny query (or extend `useDocumentHeaderFooter`) to also return `template.font_family`, and pass `template.font_family ?? headerFooter?.font_family` as `fontFamily`.

After this, what the user typed/styled in the template editor and what they see in the doctor-side preview will be visually identical (font family, weight cascade, italic/bold inline tags from `renderFormattedContent`).

## 2. Round Table fonts too big & inconsistent

The Round Table panels (used inside `PatientProfile.tsx`'s Round Table tab and the patient portal at `/patient/round-table`) use the app's default 14–16px sizes, while the rest of the clinical surfaces sit at the standardised 11–12px.

### `src/components/patients/RoundTable.tsx` (doctor-side)

| Element | Current | New |
|---|---|---|
| Header `h3` ("Round Table") | `font-semibold` (~16px) | `text-[12px] font-semibold` |
| Header subtitle | `text-xs` | `text-[11px]` |
| Avatar circle | `h-8 w-8` text-sm | `h-7 w-7 text-[11px]` |
| Doctor name | `font-medium` (~14px) | `text-[12px] font-semibold` |
| Specialty pill | `text-xs px-2 py-0.5` | `text-[10px] px-1.5 py-0` |
| Date line | `text-xs` | `text-[11px]` |
| Note body content | `text-sm` | `text-[12px]` |
| "New" indicator | `text-xs` | `text-[10px]` |
| Empty-state line | base | `text-[11px]` |
| Textarea placeholder/min-height | `min-h-[100px]` | keep height; `text-[12px]` for typed content |
| Delete icon button | `h-8 w-8 / h-4 w-4` | `h-7 w-7 / h-3.5 w-3.5` |

### `src/pages/patient/PatientRoundTable.tsx` (patient-side)

| Element | Current | New |
|---|---|---|
| Page title `h1` | `text-2xl font-bold` | `text-[16px] font-semibold` (matches other patient holarchive pages) |
| Subtitle | `text-[12px]` | `text-[11px]` |
| Empty-state title `h3` | `text-lg font-semibold` | `text-[13px] font-semibold` |
| Empty-state body | `text-sm` | `text-[11px]` |
| Avatar | `h-9 w-9 text-xs` | `h-7 w-7 text-[11px]` |
| Doctor name | `text-sm font-medium` | `text-[12px] font-semibold` |
| Date | `text-xs` | `text-[11px]` |
| Note body | `text-sm` | `text-[12px]` |

Spacing stays the same — only typographic scale changes.

## Files touched

| File | Change |
|---|---|
| `src/components/sessions/DocumentPreview.tsx` | Add `FONT_FAMILY_MAP`, resolve key → real CSS family in body + header/footer cells + print call; switch body from `12pt` to `14px`. |
| `src/hooks/useDocumentHeaderFooter.ts` | Also return the matched template's `font_family` so callers can prefer it. |
| `src/pages/PatientProfile.tsx` | In `DocumentPreviewWithLetterhead`, pass `template.font_family ?? headerFooter.font_family` as `fontFamily`. |
| `src/components/patients/RoundTable.tsx` | Shrink all typography per table above. |
| `src/pages/patient/PatientRoundTable.tsx` | Shrink all typography per table above. |

## Out of scope

- Changing how templates store `font_family` (key-based storage stays — only the *render* layer is fixed).
- Touching the template editor's own preview (already correct).
- Loading new web fonts; the app already loads all eight families.
- Round Table real-time / read-tracking logic.

