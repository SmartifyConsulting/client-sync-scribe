# Shared types

Project-wide TypeScript interfaces, derived from the auto-generated Supabase
schema (`src/integrations/supabase/types.ts` — never edit) and exposed under a
single import surface.

## Usage

```ts
import type {
  Patient,
  Session,
  DocumentRecord,
  Invoice,
  Prescription,
  Profile,
  Appointment,
  PatientReward,
  HospitalAdmission,
  ServiceResult,
} from "@/types";
```

For Insert / Update payloads:

```ts
import type { PatientInsert, InvoiceUpdate } from "@/types";
```

For arbitrary tables not yet exported:

```ts
import type { Row, Insert, Update } from "@/types";
type Message = Row<"messages">;
```

## Why

Phase 4 of the refactor centralises shapes that were previously redefined
inline in 30+ hooks and components. Existing local interfaces are left
untouched — this file is purely additive. New code should prefer importing
from `@/types`.

## Note

`DocumentRecord` is named to avoid colliding with the global `Document`
DOM type. All other names mirror their table singular form.
