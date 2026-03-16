

# Plan: Enhanced Hospital Admission Form with Dynamic Code Lookup

## Overview
Upgrade the existing `HospitalAdmissionEditor.tsx` to support dynamic ICD-10, NHRPL, and custom code systems with live search against public APIs. Add a country field to the doctor's profile so the system knows which code tables to query. Create an edge function to proxy code lookups.

## 1. Add Country to Doctor Profile

**Database migration**: Add `country` column to `profiles` table.

```sql
ALTER TABLE public.profiles ADD COLUMN country text DEFAULT 'ZA';
```

**Profile.tsx**: Add a country selector dropdown (South Africa, United States, United Kingdom, Australia, etc.) in the doctor's profile settings.

## 2. Create Edge Function for Code Lookup

**`supabase/functions/lookup-medical-codes/index.ts`**

This edge function uses Lovable AI (Gemini Flash) to look up medical codes based on the user's typed query and country. The function:
- Accepts `{ query, codeSystem, country }` (e.g., `{ query: "hypert", codeSystem: "ICD-10", country: "ZA" }`)
- Uses Gemini to return matching codes with descriptions from the relevant country's standard
- Returns `[{ code: "I10", description: "Essential (primary) hypertension" }, ...]`

This approach avoids needing to maintain full code databases while still providing accurate, country-specific results. The AI model has comprehensive knowledge of ICD-10, CPT, NHRPL (South Africa), OPCS (UK), and MBS (Australia) codes.

## 3. Rewrite HospitalAdmissionEditor with Autosearch

**`src/components/sessions/HospitalAdmissionEditor.tsx`** -- Major rewrite:

### Code Entry System
Each code section (ICD-10, NHRPL, and custom) gets an autosearch input:
- As the doctor types (debounced 400ms), call the edge function
- Show a dropdown of matching codes with code + description
- On select, populate both code and description fields automatically
- Allow manual entry as fallback

### Dynamic Code Systems
- Add a "Code Systems" section with ICD-10 and NHRPL pre-configured
- Add "Add Code System" button allowing doctors to add custom systems (e.g., CPT, OPCS, MBS)
- Each code system has its own section with add/remove entries
- The country from the doctor's profile determines which variant of codes to search

### NHRPL Section Upgrade
- Change from a single text input to a dynamic list (like ICD-10) with autosearch
- Each NHRPL entry gets code + description with search

### UI Structure
```
[Admission Details]  (unchanged)
[Diagnosis - ICD-10 Codes]  (with autosearch)
[Procedure Details]
  - Date, Description (unchanged)
  - NHRPL Codes (dynamic list with autosearch)
[Additional Code Systems]  (dynamic, user-added)
[Special Instructions]  (unchanged)
```

## 4. Profile Country Selector

In `src/pages/Profile.tsx`, add a country select field in the practice info section. Countries: South Africa (ZA), United States (US), United Kingdom (GB), Australia (AU), Canada (CA), India (IN), plus an "Other" option with manual text entry.

## Files to Modify/Create

| File | Change |
|------|--------|
| SQL Migration | Add `country` column to `profiles` |
| `supabase/functions/lookup-medical-codes/index.ts` | New edge function for AI-powered code lookup |
| `src/components/sessions/HospitalAdmissionEditor.tsx` | Add autosearch for ICD-10, NHRPL, and custom code systems |
| `src/pages/Profile.tsx` | Add country selector |

## Edge Function Detail

The edge function calls Lovable AI with a structured prompt:
```
Given the medical code system "{codeSystem}" for country "{country}",
return the top 8 matching codes for the search query "{query}".
Return as JSON array: [{ "code": "...", "description": "..." }]
```

This leverages the AI's training data which includes comprehensive medical coding standards globally.

