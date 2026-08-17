# Revert the orange profile switcher pills

Undo the dark-orange styling just applied to the role pills at the top of the account menu and restore the original look.

## Change

In `src/components/layout/AccountMenu.tsx`:
- Doctor pill: back to the light teal `bg-primary/10` rounded block with teal stethoscope icon, `text-foreground` name and `text-muted-foreground` role label.
- Patient / other-role block: back to the plain `px-2 py-1.5` text block with bottom border, no pill background.
- Remove the rounded-full pill shape, the `bg-dark-orange` / `bg-pill-grey` classes and the added padding wrappers.

The `dark-orange` and `pill-grey` tokens stay in the design system since the invitation panel border still uses dark orange.

## Not changed

The two-column heading alignment in the doctor invitation card stays as is.
