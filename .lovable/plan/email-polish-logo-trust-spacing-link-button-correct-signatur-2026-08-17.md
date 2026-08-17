# Email polish: logo trust, spacing, link button, correct signature

## 1. Make the logo appear without "show images"

Mail clients (Gmail, Outlook) block remote images until the recipient trusts the sender — no app-side setting can force this. Once a recipient clicks "Always display images from this sender", every later email from the same address shows images automatically.

What we can do to make it work on the very first email:

- Send the logo as an **inline (CID) attachment** instead of a remote URL. Inline attachments are part of the message body, so most clients render them without a remote-image prompt.
- Keep the remote URL as the fallback `src` only if inline is unavailable.
- Keep sending from one consistent verified sender address so the recipient's "always trust" choice sticks.

Implementation: the shared branded email builder gets an option to reference `cid:holarc-logo`, and the send helper attaches the logo bytes (inline, `content_id: holarc-logo`) to every branded email. The same applies to the logo baked into the document/invoice HTML.

## 2. Padding under the header

Add roughly two blank lines of vertical space between the logo band and the document title so the header breathes.

## 3. Remove the raw URL

Drop the plain-text URL line under the "View this document in Holarc Health" button. The button alone stays.

## 4. Correct signature font

The signature currently falls back to a generic handwriting/system font because the chosen script fonts (Great Vibes, Allura, etc.) aren't available inside the email. Fix by:

- Loading the selected signature font from Google Fonts in the email head and inlining the font stack on the signature element, so clients that support web fonts render the real font.
- Because Gmail strips web fonts, additionally render the signature **as an image**: the app generates a small PNG of the typed signature in the doctor's chosen font, colour and size, and the email embeds that image inline (same CID mechanism as the logo). This guarantees Dr Dean Allie's Great Vibes signature looks identical in every client.
- Uploaded signature images keep working unchanged.

Also verified: the signature in the test email is pulled from the sending doctor's profile — the test send used Dr Dean Allie's stored signature record, so once the font rendering is fixed it will match what each doctor selected in My Practice.

## Technical notes

- `supabase/functions/_shared/brandEmail.ts`: header spacing, remove URL paragraph, `cid:` logo support.
- `supabase/functions/_shared/email.ts`: attach the logo (and signature image, when supplied) as inline attachments with content IDs.
- `supabase/functions/_shared/signature.ts`: Google Fonts link + correct font stack; accept a pre-rendered signature image.
- Client callers (`Invoices.tsx`, document send buttons) pass the doctor's rendered signature image alongside the existing payload.
- Re-deploy `send-document-email` and re-send a test invoice to georgia.adams@smartify.co.za to verify.
