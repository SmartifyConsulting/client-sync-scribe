# Restore spacing between Session records

## Fix
- Make every session record link a block-level list item so the existing vertical spacing in the grouped list can take effect.
- Preserve the current card styling, grouping accordions, navigation, colours, and record content.

## Verification
- Confirm clear, consistent space appears between consecutive records in expanded date and patient groups.
- Check desktop and mobile widths to ensure the spacing remains visible without affecting row alignment or clickability.

## Technical detail
`ListGroupToolbar` already renders its records inside a `space-y-4` container. The rendered `SessionCard` root is currently an inline React Router link, and vertical margins do not affect inline elements. Applying block layout at the session record root fixes the underlying CSS behavior rather than adding more ineffective padding.