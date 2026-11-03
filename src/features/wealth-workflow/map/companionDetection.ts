import { useEffect, useState } from "react";
import companionManifest from "../../../../extension-insurer/manifest.json";

export const LATEST_COMPANION_VERSION = companionManifest.version;

export function useCompanionVersion() {
  const read = () => document.documentElement.dataset.holarcAddonVersion || null;
  const [version, setVersion] = useState(read);
  useEffect(() => {
    const update = () => setVersion(read());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-holarc-addon-version"] });
    update();
    return () => observer.disconnect();
  }, []);
  return version;
}

export const companionPresent = () => document.documentElement.dataset.holarcAddon === "1";

export function useCompanionInstalled() {
  const [installed, setInstalled] = useState(companionPresent);
  useEffect(() => {
    const update = () => setInstalled(companionPresent());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-holarc-addon"] });
    update();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  return installed;
}

/** Older installed Companions are supported by their existing DOM marker. */
export function checkCompanion(): Promise<boolean> {
  if (companionPresent()) return Promise.resolve(true);
  return new Promise(resolve => {
    const finish = () => { clearTimeout(timer); observer.disconnect(); resolve(companionPresent()); };
    const observer = new MutationObserver(() => { if (companionPresent()) finish(); });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-holarc-addon"] });
    const timer = setTimeout(finish, 1800);
    if (companionPresent()) finish();
  });
}
