# Uploads

Centralised storage upload helpers (Phase 5).

## `useUpload(bucket, options?)`

A single hook that wraps every Supabase Storage bucket used by the app:

| Bucket             | Public | Default use |
|--------------------|--------|-------------|
| `logos`            | ✅     | Practice logos |
| `avatars`          | ✅     | User avatars |
| `patient-media`    | ✅     | Captured photos / drawings |
| `session-audio`    | ❌     | Session recordings (5 MB cap) |
| `cpd-certificates` | ❌     | CPD documents |
| `health-photos`    | ❌     | Patient health photos (private) |

Returns `{ upload, isUploading, error }`. `upload(file, path)` resolves to
`{ path, url, isPublic }` — the `url` is a public URL for public buckets
or a signed URL (default 1-hour TTL) for private ones.

Existing components keep their inline `supabase.storage.from(...)` calls
to avoid churn; new code should prefer this hook.
