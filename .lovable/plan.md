

# Fix Narration Voice Preview

## Root Cause

The preview button uses `supabase.functions.invoke('narrate-briefing', ...)` which defaults to parsing the response as JSON. But `narrate-briefing` returns raw binary audio (`audio/mpeg`). This corrupts the audio data, causing playback failure. The language selection is not the issue.

The working implementation in `TodaysBriefing.tsx` correctly uses `fetch()` with `.blob()` to handle the binary audio response.

## Fix: `src/pages/Profile.tsx` (lines 870-888)

Replace `supabase.functions.invoke()` with direct `fetch()` call, matching the pattern used in `TodaysBriefing.tsx`:

```typescript
onClick={async () => {
  const voice = (profile as any)?.narration_voice || "nova";
  toast({ title: "Generating preview...", description: `Playing sample with "${voice}" voice` });
  try {
    const langCode = profile?.preferred_language || "en";
    const sampleText = SAMPLE_TEXTS[langCode] || SAMPLE_TEXTS.en;
    
    // Create Audio element immediately for mobile gesture unlock
    const audio = new Audio();
    audio.play().catch(() => {});
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/narrate-briefing`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ text: sampleText, voice }),
      }
    );
    if (!response.ok) throw new Error('Failed to generate preview');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    audio.src = url;
    await audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  } catch (err: any) {
    toast({ title: "Preview failed", description: err.message || "Could not generate voice preview", variant: "destructive" });
  }
}}
```

**Key changes:**
1. Use `fetch()` + `.blob()` instead of `supabase.functions.invoke()` to correctly handle binary audio
2. Create `Audio` element and call `.play()` synchronously within the click handler to unlock audio on mobile browsers
3. Set `audio.src` after fetching, then play — matching the mobile audio unlock pattern

**Single file change:** `src/pages/Profile.tsx`

