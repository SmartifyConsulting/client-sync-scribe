# Wealth Live Workspace: close the gaps and verify

The Live Workspace from this brief is already built: the Live tab, the five sections, the client view, live updates, notifications and the annual review item. This plan covers only what the brief asks for that is still missing, then tests it all end to end.

## Gaps to close
1. **Client question awaiting response (NOW).** Show the client's latest unanswered message from the existing Messages list as a NOW item, with a "Reply" action that opens the existing message thread.
2. **Quote expiring (NOW).** Where a recommendation or quote has an expiry date, show "Quote expires in X days" when it is 7 days away or less. If there is no expiry date on record, leave this item out rather than inventing one.
3. **Provider response received (NOW).** When an application moves out of underwriting (accepted, declined or issued), show it as a NOW item for the wealth manager until they open it.
4. **Operations notification.** When an application becomes ready for submission, send the existing notification to the other firm members (practice members) as well as the owning wealth manager.
5. **Annual review cycle context.** When an annual review is due:
   - The item shows the previous cycle's accepted recommendation and issued policy (the "previous financial position").
   - It adds a "Schedule consultation" action that opens the existing appointment booking for this client.
6. **Blocked wording.** Show each blocked item as "<Stage>: Reason: <plain requirement>". Use the plain wording from the rules table instead of raw engine text, for example "Current ROA not signed".

## Verification (end to end, in the preview)
Create a test client and walk them through the workflow, checking both the wealth manager's Live tab and the client's own profile at each step:
- Normal path: Consultation, then recommendation drafted, presented, accepted, ROA signed, compliance done, application submitted, issued, and the annual review item appearing.
- Blocked path: the application has no signed ROA. BLOCKED should list it. Once the ROA is signed, the item should move to NEXT without a page refresh.
- Changes requested: a new version appears and the old one shows as superseded.
- Declined: the case closes and NOW is empty.
- Send reminder, Mark done, and View workflow each open the right group in the Workflow Map. Back to Live keeps the same client.
- The client view never shows compliance or internal steps.

Record any defects found and fix them in the same pass.

## Technical details
- `useLiveWorkspace.ts`: add message, quote-expiry and provider-response items, plus prior-cycle context for the annual review. It reads only; no workflow state is stored.
- `rules.ts`: add plain "reason" text for each blocker.
- Migration (only if needed):
  - Extend `wealth_notify_transition()` so an application becoming ready also notifies practice members.
  - Add `messages` to the live updates channel for this client.
- Stage changes still go only through the `wealth_*` database functions.
