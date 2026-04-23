# Uploads feature (placeholder)

Future home of all file/storage logic.

Will consolidate scattered storage-bucket calls (`patient-media`, `session-audio`, `health-photos`, `cpd-certificates`, `logos`, `avatars`) behind a single `useUpload(bucket, options)` hook while preserving:

- 5MB limit for audio/video uploads
- 100MB patient storage allocation
- private-bucket signed URL behaviour (see `src/utils/storageUrls.ts`, `src/utils/audioUrl.ts`)

**Phase 1 is additive only — no existing upload code has been moved.**
