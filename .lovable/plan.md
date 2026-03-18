

# Auto-Seed Missing Default Templates

## Problem
The `fetchTemplates` function only seeds defaults when `data.length === 0`. Existing users who already have templates never get new defaults (like "Hospital Admission Form") added.

## Solution

**File: `src/hooks/useTemplates.ts`** (lines 347-353)

After fetching existing templates, compare the fetched template names against the `defaultTemplates` list. For any default template whose `name` is not found in the user's existing templates, insert it. This runs silently on every fetch, so new defaults appear automatically.

Replace the current `else if (data && data.length > 0)` block:

```typescript
} else if (data && data.length > 0) {
  const parsedTemplates = data.map((t) => ({
    ...t,
    logo_position: t.logo_position as { x: number; y: number } | null,
  }));
  
  // Check for missing default templates and seed them
  const existingNames = new Set(data.map(t => t.name));
  const missingDefaults = defaultTemplates.filter(dt => !existingNames.has(dt.name));
  
  if (missingDefaults.length > 0) {
    const toInsert = missingDefaults.map(t => ({ ...t, user_id: user.id }));
    const { data: newData } = await supabase.from("templates").insert(toInsert).select();
    if (newData) {
      const newParsed = newData.map(t => ({
        ...t,
        logo_position: t.logo_position as { x: number; y: number } | null,
      }));
      setTemplates([...parsedTemplates, ...newParsed]);
      return;
    }
  }
  
  setTemplates(parsedTemplates);
}
```

No database migration needed. No other files affected.

