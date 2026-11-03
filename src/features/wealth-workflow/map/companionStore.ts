/** Only an approved Chrome Web Store listing can be used as the install target. */
export function companionStoreUrl(value = import.meta.env.VITE_COMPANION_STORE_URL): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "chromewebstore.google.com" || url.port || url.username || url.password ||
      !/^\/detail\/(?:[^/]+\/)?[a-p]{32}\/?$/.test(url.pathname)) return null;
    return `${url.origin}${url.pathname}`;
  } catch { return null; }
}
