/**
 * Loads the Google Maps JavaScript API once, with `loading=async` + a global
 * callback so `google.maps.Map` is guaranteed to be ready when the returned
 * promise resolves. Subsequent callers receive the cached promise.
 */
declare global {
  interface Window {
    google?: any;
    __lovableInitGmaps?: () => void;
    __lovableGmapsAuthError?: string;
    gm_authFailure?: () => void;
  }
}

let loaderPromise: Promise<typeof window.google> | null = null;

export function loadGoogleMaps(): Promise<typeof window.google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  if (loaderPromise) return loaderPromise;

  const browserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
    | string
    | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
    | string
    | undefined;

  if (!browserKey) {
    return Promise.reject(
      new Error(
        "Google Maps browser key missing. Connect the Google Maps Platform connector in Lovable.",
      ),
    );
  }

  loaderPromise = new Promise((resolve, reject) => {
    window.gm_authFailure = () => {
      window.__lovableGmapsAuthError =
        "Google Maps could not load because billing, API access, or domain restrictions are not correctly configured for this key.";
      window.dispatchEvent(new CustomEvent("lovable:gmaps-auth-failure"));
    };

    window.__lovableInitGmaps = () => {
      if (window.google?.maps?.Map) resolve(window.google);
      else reject(new Error("Google Maps loaded but maps namespace missing"));
    };

    const params = new URLSearchParams({
      key: browserKey,
      loading: "async",
      callback: "__lovableInitGmaps",
      libraries: "geometry",
      v: "weekly",
    });
    if (channel) params.set("channel", channel);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });

  return loaderPromise;
}
