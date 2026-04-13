

# Healthcare Provider Screen Cleanup

## Changes

### File: `src/pages/patient/MyDoctors.tsx`

1. **Reduce specialty badge font** — Change `text-xs` to `text-[10px]` on all Badge elements (lines 137-138, 237-238)

2. **Remove Phone column** — Remove the Phone `<TableHead>` and `<TableCell>` from both the search results table (lines 217, 243) and the connected doctors table (lines 284, 142)

3. **Move practice number under doctor name** — In the Provider cell, add `PR#: {practice_number}` in small muted text below the doctor's name. Remove the separate Practice # column from both tables (lines 218, 244, 285, 143)

4. **Update DoctorTableRow component** — Same changes: remove phone cell, remove practice # cell, add practice # under name

### File: `src/components/patient/InviteDoctorDialog.tsx`

5. **Simplify invite button** — Line 233-236: Remove "Invite Healthcare Provider" text, keep only `UserPlus` icon (which already has the person+plus design). Make button `size="icon"` or `size="sm"` with just the icon.

| File | Changes |
|------|---------|
| `src/pages/patient/MyDoctors.tsx` | Smaller badge font, remove phone/practice columns, show PR# under name |
| `src/components/patient/InviteDoctorDialog.tsx` | Icon-only invite button |

