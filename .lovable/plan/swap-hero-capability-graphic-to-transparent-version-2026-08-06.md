# Swap hero capability graphic to transparent version

Replace the capability wave image on the landing hero with the newly uploaded transparent-background PNG so it blends with the page background instead of sitting on a white block.

## Changes

- Upload `capabilitywave-transparent.png` as a CDN asset pointer at `src/assets/holarc-capabilities-wave.png.asset.json`.
- In `src/pages/Landing.tsx`, import the new pointer instead of `holarc-capabilities-wave.jpg.asset.json` and use its URL for the capability graphic. Keep the existing alt text, sizing, and negative-margin positioning unchanged.
- Delete the old `holarc-capabilities-wave.jpg` asset pointer (via the assets CLI) once nothing references it.
