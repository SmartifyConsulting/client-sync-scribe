

# Fix: Sample Voice Should Speak in Primary Language

## Root Cause
OpenAI TTS determines the spoken language from the **text content**, not a language parameter. The sample text is hardcoded in English, so it always speaks English regardless of the user's primary language setting.

## Solution
Add a map of sample texts translated into each supported primary language. When the user clicks "Sample Voice", use the text matching their selected primary language.

### File: `src/pages/MyPractice.tsx`

Add a `SAMPLE_TEXTS` constant mapping language codes to translated versions of "Welcome to Holarch Health - your 360 degree healthcare holarchy":

```typescript
const SAMPLE_TEXTS: Record<string, string> = {
  en: "Welcome to Holarch Health - your 360 degree healthcare holarchy",
  af: "Welkom by Holarch Health - jou 360 grade gesondheidsholarchie",
  zu: "Siyakwamukela ku-Holarch Health - i-holarchy yakho yezempilo yamadigri angu-360",
  xh: "Wamkelekile kwi-Holarch Health - i-holarchy yakho yezempilo yeedegri ezingama-360",
  st: "Rea u amohela ho Holarch Health - holarchy ea hau ea bophelo bo botle ea digri tse 360",
  tn: "O amogelesegile mo Holarch Health - holarchy ya gago ya boitekanelo ya digri di le 360",
  fr: "Bienvenue chez Holarch Health - votre holarchie de santé à 360 degrés",
  pt: "Bem-vindo ao Holarch Health - sua holarquia de saúde de 360 graus",
  es: "Bienvenido a Holarch Health - su holarquía de salud de 360 grados",
  de: "Willkommen bei Holarch Health - Ihre 360-Grad-Gesundheitsholarchie",
  // ... remaining languages
};
```

Then change the sample text lookup from the hardcoded string to:
```typescript
const sampleText = SAMPLE_TEXTS[primaryLanguage] || SAMPLE_TEXTS.en;
```

Where `primaryLanguage` is the current value of the Primary Language dropdown (already stored as `profile?.preferred_language`).

### Files Modified

| File | Change |
|------|--------|
| `src/pages/MyPractice.tsx` | Add translated sample texts map, use primary language to select text |

