# Data-sharing panel restyle + profile pill colours

## Sharing panel (permission transparency)

Left column — one stacked list:
- Green ticks: everything shared with the care team (AI session summaries, patient information, medical overview, documents and their sub-items).
- Directly underneath, in the same column, the red crosses: full transcriptions, raw audio recordings, AI diagnostics, clinical drawings, invoices and billing, medical certificates.

Right column — single list titled "What other practitioners can access from your session":
- Same one-column treatment: green tick rows for what other practitioners can see, red cross rows for what stays private to this practice.

Both columns drop the bullet/disc markers and use a tick or cross icon per row (green for allowed, red for not). Sub-items stay indented under their parent row.

Panel border becomes dark orange.

## Profile switcher pills

In the sidebar profile switcher popover:
- The currently selected role pill (Doctor or Patient) is filled dark orange with readable foreground text.
- The Patient pill, when not selected, uses a darker grey background so it reads clearly against the popover.

## Technical notes

- `src/components/permissions/PermissionTransparencyModal.tsx`: restructure `content` so each column renders one flat list of `{icon, label}` rows; merge shared + private per side; apply `border-2` dark-orange border on the panel wrapper (works in both `inline` and dialog modes).
- Add dark-orange and darker-grey semantic tokens to `src/index.css` and `tailwind.config.ts` (HSL) rather than hardcoded hex/colour utilities.
- `src/components/layout/AccountMenu.tsx` (and `ProviderProfileMenu.tsx` where the same pills render): swap `bg-primary/10` for the new selected-orange token, and give the patient pill the darker-grey background.
