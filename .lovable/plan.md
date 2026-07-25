## Fix: My Sessions screen

Bring `src/pages/MySessions.tsx` in line with the requested pattern (matching My Practice / Hospital Admissions styling).

### Changes

1. **Unified table frame**  
   Wrap the `Accordion` in a single `rounded-lg border bg-card overflow-hidden` container with `divide-y` between items, removing the current `space-y-3` gaps. Each `AccordionItem` becomes a flat row inside one shared frame (same as My Practice).

2. **Green bar by default (white font)**  
   The accordion trigger currently only turns green when open. Update it so the bar is `bg-primary text-white` at all times, with the chevron and count also white. Remove the `data-[state=open]` conditional green styling since it is now the default.
   - Hover: slightly darker green (`hover:bg-primary/90`) instead of grey.
   - Count badge: white pill with primary text so it stays legible on the green bar.
   - Chevron stays on the right (default Radix behavior).

3. **Heading parity**  
   Keep the page heading as `text-sm font-semibold` with the `text-xs text-muted-foreground` subtitle, matching Hospital Admissions.

4. **No logic changes**  
   Data fetching, bucketing, and session card rendering remain untouched.

### Files
- `src/pages/MySessions.tsx` — accordion frame + trigger styling only.
