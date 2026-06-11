## Goal

Restore the avatar / Settings / Sign Out block to the bottom of the viewport in both sidebars, even if that means the sidebar extends past (below) the footer's top divider.

## Change

Revert the sidebar height cap so each fixed sidebar spans the full viewport again. The flex `mt-auto` account section will then sit at the true bottom.

### `src/components/layout/Sidebar.tsx`
- `h-[calc(100vh-var(--footer-height))]` → `h-screen`

### `src/components/layout/ProviderSidebar.tsx`
- `h-[calc(100vh-var(--footer-height))]` → `h-screen`

No changes to the footer, `--footer-height`, or layouts.
