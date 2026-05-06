## Why the map is empty

Every approved hospital (67) and ambulance (16) in the database is `ownership = 'private'`. The Nearby page filters to **public-only** providers when the patient has no medical aid info on their profile, so the map and list come back empty.

## Fix — show all, label ownership

Remove the public-only filter on the patient-facing Nearby view and instead surface each provider's ownership as a small badge so patients can decide for themselves.

### Changes

**`src/modules/holarchelp/pages/HolarcHelpNearby.tsx`**
- Remove the `hasMedicalAid` query, the `filteredProviders` filter, and the green "Showing public providers only" notice.
- Pass the full approved list straight into `<ProviderMap>` and the nearest list.
- On each list row, add a small pill next to the type label: **Public** (green) or **Private** (slate).
- Keep distance sort, 30-item cap, and the existing empty state.

**`src/modules/holarchelp/components/ProviderMap.tsx`** (only if it doesn't already)
- No filter changes; just confirm it accepts the unfiltered array. The existing `accepting_patients` grey-out behaviour remains untouched.

### Out of scope
- No DB backfill, no admin ownership editor, no schema changes.
- SOS dispatch logic untouched (it already considers all approved providers).
- Icon scale / other screens unchanged.

### Verification
- Reload `/patient/holarchelp/nearby` as a patient with no medical aid → map shows all 83 markers, list shows nearest 30 with Public/Private badges.