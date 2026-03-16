

# Resend Invitation to leadanalyst@smartify.co.za

## Problem
A pending invitation record already exists from the earlier failed attempt (when the `from` address was wrong). The edge function blocks duplicate pending invitations, so the email can't be resent.

## Fix
1. **Delete the stale pending invitation** — Run a SQL migration to remove the old record (`id: 22db8a42-ef69-435c-b257-f9fd676bf179`) that never actually delivered an email.
2. **Re-invoke the edge function** — Call `send-user-invitation` again with `recipientEmail: leadanalyst@smartify.co.za` to create a fresh invitation and send the email using the now-correct `noreply@smartify.co.za` sender.

No code changes needed — just a data cleanup and a re-invocation.

