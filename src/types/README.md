# Shared types

Project-wide TypeScript interfaces extracted from inline use across hooks/components.

Phase 4 will populate this with: `Patient`, `Session`, `Document`, `Invoice`, `Prescription`, `Profile`, `Appointment`, `Reward`.

Where possible, types should be derived from `src/integrations/supabase/types.ts` (auto-generated — never edit) using helpers like:

```ts
import type { Database } from "@/integrations/supabase/types";
export type Patient = Database["public"]["Tables"]["patients"]["Row"];
```
