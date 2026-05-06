# Vula Vault Branding Overlay — Chrome Extension

The 6Dot50 login page (`secure.6dot50.com/lite/default`) sends `X-Frame-Options: SAMEORIGIN`, so it cannot be iframed and overlaid from inside our app. Instead, we ship a tiny Chrome extension the demo presenter installs once. It runs only on that one URL and paints Vula Vault branding on top — without touching any inputs or the underlying NEXT button's click handler.

## What the user sees

1. On `/vula/wallet` we add a **"Download Demo Branding Overlay"** button alongside the existing "Continue to secure sign-in" CTA.
2. Clicking it downloads `vula-vault-overlay.zip`.
3. The page shows 4-step install instructions (Unzip → `chrome://extensions` → Developer mode → Load unpacked).
4. Once installed, every visit to `secure.6dot50.com/lite/default` is automatically rebranded.

## What the extension overlays

All overlays use fixed positioning, `z-index: 2147483647`, `pointer-events: none` on backdrops, and `pointer-events: auto` only on the visible logo/button surfaces. The blue NEXT overlay forwards clicks to the original orange NEXT button via `.click()` so submission still works.

- **Top logo overlay** — centered, white rounded backing card with soft shadow, premium Vula Vault wordmark + symbol. Covers the existing 6Dot50 logo.
- **Bottom-left logo overlay** — smaller Vula Vault mark on a frosted glass chip.
- **NEXT button overlay** — measures the original orange button with `getBoundingClientRect()`, positions an identically-sized blue gradient button on top (soft blue→teal gradient, rounded-xl, subtle drop shadow, hover lift, "NEXT" in premium sans). A `ResizeObserver` + `window.resize` listener keeps it perfectly aligned on mobile/desktop and on layout shifts.
- **Fade-in** — 250ms opacity + 4px translate-y on load.
- **Glassmorphism** — `backdrop-filter: blur(12px)` + translucent white on the logo chips.

Click forwarding pattern:
```js
blueBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  originalNextBtn.click();
});
```

## Files to add

```
extension/
├── manifest.json          # MV3, content_scripts on secure.6dot50.com/lite/*
├── overlay.js             # Injects DOM, tracks original NEXT button position
├── overlay.css            # Glassmorphism + gradient styles
├── vula-logo.png          # Reused from src/assets/vula-vouchers-logo-v3.png
├── vula-symbol.png        # Reused from src/assets/vula-symbol.png
└── icon.png               # 128px Vula icon

public/vula-vault-overlay.zip   # Packaged via `nix run nixpkgs#zip`

src/pages/VulaWallet.tsx         # Add download button + install steps accordion
```

## Build steps

1. Create `extension/` with manifest, content script, CSS, and copied logo assets.
2. Content script:
   - On `DOMContentLoaded`, inject top logo, bottom-left logo, fade-in wrapper.
   - Find original NEXT button by text match (`button, input[type=submit]` whose value/text === "NEXT", case-insensitive).
   - Create blue overlay button, position absolutely over original using `getBoundingClientRect()` + `window.scrollX/Y`.
   - Reposition on `resize`, `scroll`, and via `ResizeObserver` on `<body>`.
3. Package: `cd /dev-server/extension && nix run nixpkgs#zip -- -r /dev-server/public/vula-vault-overlay.zip .`
4. In `VulaWallet.tsx`, add a secondary CTA "Download Demo Branding Overlay" using the fetch+blob download pattern (direct `<a download>` fails in preview auth), plus a collapsible "How to install" section with the 4 Chromium steps.

## Out of scope

- Modifying any 6Dot50 form fields, validation, or submission logic.
- Auto-installing the extension (Chrome requires Web Store publishing for one-click).
- Production rollout — this is explicitly a demo aid, labeled as such in the UI.
