

# Fix: Update Resend `from` Address to Verified Domain

The issue is simple — the edge function sends from `onboarding@resend.dev` (Resend's test domain), which only allows sending to the account owner's email. Since `smartify.co.za` is already verified in Resend, we just need to update the `from` address.

## Change

**File**: `supabase/functions/send-user-invitation/index.ts`
- Change `from: "MediPad <onboarding@resend.dev>"` → `from: "MediPad <noreply@smartify.co.za>"`

Also check and update the same pattern in:
- `supabase/functions/send-patient-invitation/index.ts`
- `supabase/functions/send-document-email/index.ts`
- `supabase/functions/send-invoice-report/index.ts`

Any other edge function using `onboarding@resend.dev` will be updated to use `noreply@smartify.co.za`.

After updating, redeploy all affected edge functions.

