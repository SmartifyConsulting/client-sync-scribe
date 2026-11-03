# Companion interface monitoring and repair worker

Prepared 4 November 2026. Companion release: 1.7.0.

## What is implemented

- App-wide connection recording, including quoting and confirmed passive sessions in configured portals. Dates come from the existing authenticated database RPC; no password is transmitted to that RPC. Open App Integrations tabs refresh after records change in another Holarc tab.
- Current release discovery from the public repository rather than a version frozen in the app build. Rechecks on focus and every minute. Downloads use the same repository package. A failed check shows last-known version and leaves downloading available.
- All active, configured, enabled App Integrations entries register their HTTPS origins with the Companion. Verified same-provider redirects learned during an authorised login remain in that origin registry until the configured origin changes.
- Local daily checks using Chrome alarms (24-hour period), startup catch-up, and checks on registered portal loads. Chrome must be running; closed or inaccessible portals are marked unavailable. No new portal windows, password retries or unattended logins are used for monitoring.
- Immediate structural incident capture on an unknown login dialog, stalled login, or a recognised quote-mapping failure. Missing client inputs and unsupported journeys do not trigger automatic repair jobs. The affected operation pauses rather than guessing a click.
- Baseline comparisons and bounded local incident queue. Input values, HTML, screenshots, query strings and arbitrary page text are excluded. Labels use a fixed vocabulary; unknown labels become unmapped. Cross-origin iframe content is not inspected; inaccessible frame counts expose limited coverage.
- Authenticated, schema-validated shared incident queue, deduplicated by app/version/evidence. Broker reporters may read only incidents they reported. Direct browser writes and anonymous table reads are forbidden.
- GitHub repair worker: first incident dispatch plus daily fallback at 04:00 UTC (06:00 South Africa). One queued incident is claimed per run. A Codex job with no Supabase or GitHub publishing credentials receives only structural evidence. A separate validation job restricts paths, preserves existing tests, requires a new regression test and runs the independent suite. A separate publishing job creates a draft PR. No automatic merge, release or browser installation occurs.

## Repair scope and limits

The worker can prepare unambiguous adapter repairs. It cannot reliably infer the meaning of an arbitrary new message from structural evidence alone. Missing evidence, agreements, consent, account locks, CAPTCHA, MFA and unfamiliar destinations go to needs_review. The current finite vocabulary captures changes to known controls and structure; it is not a complete visual diff or full journey test of every product.

The sensor covers configured web apps. Workflow-failure triggers exist in the Companion's implemented login and quote adapters; unrelated workflows that have no adapter are covered only by the passive structural checks. Pages in a different browser/profile and closed portals cannot be scanned from this extension.

## Deployment status

The shared tables and RLS policies were applied to the project database and verified: RLS enabled, anonymous reads denied, direct authenticated inserts denied.

The reporting Edge Function could not be deployed from this machine: Supabase CLI returned 403 (account lacks necessary endpoint privileges). Local feature tests do not imply backend activation. Until deployment succeeds, incidents remain in the browser queue and the UI says the shared repair queue is not connected.

## Activation steps for a project/repository owner

1. Publish the updated app from GitHub through Lovable and update the installed Companion to 1.7.0. No Lovable AI chat credits are required for these code changes.
2. Deploy the committed function with an authorised Supabase project account:

   supabase functions deploy companion-interface-incident --project-ref oroobhkkttqgyhaulnqc

3. In the Edge Function environment, add COMPANION_REPAIR_GITHUB_TOKEN: a repository-scoped credential allowed to dispatch this repository's repair workflow. Never put it in a frontend VITE variable or the extension.
4. In GitHub repository Settings → Secrets and variables → Actions, add OPENAI_API_KEY, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as encrypted secrets. The service-role key is used only by the isolated queue prepare/result jobs, not by the AI job. Do not send keys through chat or commit them.
5. Enable GitHub Actions' repository permission to create pull requests if organisation policy currently forbids it. The workflow publishes draft PRs; it does not approve or merge its own work.
6. Set repository variable COMPANION_REPAIR_ENABLED=true after the secrets and backend function are ready. This explicit activation gate prevents incomplete setup from making API calls or claiming incidents indefinitely.
7. Run Companion interface repair manually once with a synthetic incident, verify an expected regression before accepting its patch, and then verify the first real incident. An insufficient-evidence result must remain needs_review rather than generate a speculative patch.

AI API usage and GitHub Actions consumption are separate from Lovable credits. No paid AI repair call was made during local implementation/testing.

## Updating a repaired release

After a repair is reviewed and merged, update extension-insurer/manifest.json and package the production extension with scripts/package-companion.ps1. The package includes interfaceMonitor.js. Commit the matching public/holarc-insurer-addon.zip in the same release commit. The app's live release check then notices the new version. Until Chrome Web Store distribution is completed, brokers still replace the unpacked files and reload the existing extension.

## Tests and evidence

Tests use synthetic DOMs, mocked browser APIs and an isolated local app. Coverage includes daily scheduling, origin restrictions, one incident for repeated observations, first-observation unexpected dialogs, no input-value reads, passive connection metadata, endpoint vocabulary validation, narrow patch acceptance/rejection, route-independent recording, duplicate results and the date/time chip. Existing login/OTP/quote/PDF tests remain required.

Sources for the implementation:
- https://developer.chrome.com/docs/extensions/reference/api/alarms
- https://learn.chatgpt.com/docs/github-action
