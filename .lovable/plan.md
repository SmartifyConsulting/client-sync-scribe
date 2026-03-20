

# Plan: Update Patient Email Addresses

Two patient records need email updates in the database.

## Changes

| Patient | Current Email | New Email |
|---------|--------------|-----------|
| Lisa Anderson (id: `4d85050f-...`) | lisa.a@email.com | developer@smartify.co.za |
| James Anderson (id: `d03197b0-...`) | j.anderson@email.com | director@smartify.co.za |

## Implementation

Use the database insert tool to run two UPDATE statements on the `patients` table to set the new email addresses. No schema changes or code changes needed.

## Files Modified

None — this is a data-only update in the backend.

