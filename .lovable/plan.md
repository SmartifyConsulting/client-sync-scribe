

# Plan: Fix "new row violates row-level security policy" on baseline upload

## Root cause

The error is **not** on `prescription_pill_references` — it's on the **`patient-media` storage bucket**.

When Shannon taps **Set up baseline** and the camera frames upload, the request:

```
POST /storage/v1/object/patient-media/pill-references/{user_id}/...-tablet.jpg
→ 403 "new row violates row-level security policy"
```

The bucket only has two RLS policies:
- INSERT: `Authenticated users can upload media` (permissive on `bucket_id`)
- DELETE: `Users can delete their media`

It's missing **SELECT** and **UPDATE** policies. The client uploads with `upsert: true` (in `PillBaselineCapture.tsx` lines 233 & 242), which makes Storage attempt an UPDATE-or-INSERT — and the missing UPDATE policy causes the 403. The same gap will eventually break any read of the uploaded image via `getPublicUrl` for authenticated reads.

## Fix — single short migration

Add the two missing policies on `storage.objects` for the `patient-media` bucket. We keep the existing relaxed pattern (any authenticated user can interact with `patient-media`, matching the existing INSERT/DELETE policies) so this doesn't tighten or loosen behaviour beyond what's already implied.

```sql
-- Allow authenticated users to update their patient-media uploads
-- (needed because PillBaselineCapture uploads with upsert: true)
CREATE POLICY "Users can update their media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING  (bucket_id = 'patient-media')
  WITH CHECK (bucket_id = 'patient-media');

-- Allow authenticated users to read patient-media objects
CREATE POLICY "Users can read their media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'patient-media');
```

Bucket is already marked **public** (per `<storage-buckets>`), so anonymous reads via `getPublicUrl` keep working; the new SELECT policy covers authenticated SDK reads consistently.

## Belt-and-braces client tweak

In `src/components/rewards/PillBaselineCapture.tsx`, the per-tablet path is already unique per timestamp, so `upsert: true` isn't strictly required. Drop it to `upsert: false` for the sequence frames (lines 240-243) so a stray duplicate path can't silently overwrite an unrelated dose's frame. Keep `upsert: true` on the close-up still (line 233) because the AI re-prompting flow may resubmit it. With the new UPDATE policy in place, both paths work either way.

## Files touched

| File | Change |
|---|---|
| New migration | Add `UPDATE` and `SELECT` policies on `storage.objects` for `bucket_id = 'patient-media'`, scoped to `authenticated`. |
| `src/components/rewards/PillBaselineCapture.tsx` | Set `upsert: false` on the sequence-frame uploads (one-line change inside `Promise.all`). |

## Out of scope

- Tightening the bucket to per-user folder enforcement (would change existing INSERT/DELETE behaviour and break other features that already write to `patient-media`).
- Changing the edge function (it uses the service role key and bypasses RLS).
- Re-running Shannon's failed baseline — once the policies exist she can simply tap **Set up baseline** again.

