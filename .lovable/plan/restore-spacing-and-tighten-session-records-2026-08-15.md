# Restore spacing and tighten Session records

## Fix
- Make every session record link a block-level list item so the existing vertical spacing in the grouped list can take effect.
- Reduce each record's height so rows read as compact list items rather than oversized cards: tighter vertical padding and a smaller row text size, keeping the icon, duration and status pill on one line.
- Preserve the current card styling, grouping accordions, navigation, colours, and record content.


## Verification
- Confirm clear, consistent space appears between consecutive records in expanded date and patient groups.
- Confirm records are visibly shorter than before while text stays legible and rows remain easy to tap.
- Check desktop and mobile widths to ensure the spacing remains visible without affecting row alignment or clickability.


## Technical detail
`ListGroupToolbar` already renders its records inside a `space-y-4` container. The rendered `SessionCard` root is currently an inline React Router link, and vertical margins do not affect inline elements. Applying block layout at the session record root fixes the underlying CSS behavior rather than adding more ineffective padding.