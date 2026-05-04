/// <reference types="google.maps" />
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const FALLBACK_PUBLIC_KEY = "AIzaSyBVPyyeFXazLu4ONaGE2_UlRPeFG0ciRLc";
const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export const GOOGLE_MAPS_API_KEY: string =
  envKey && envKey.length > 0 ? envKey : FALLBACK_PUBLIC_KEY;

const envMapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;
export const GOOGLE_MAPS_MAP_ID: string =
  envMapId && envMapId.length > 0 ? envMapId : "DEMO_MAP_ID";

let configured = false;
let loaderPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (!loaderPromise) {
    if (!configured) {
      setOptions({ key: GOOGLE_MAPS_API_KEY, v: "weekly" });
      configured = true;
    }
    loaderPromise = (async () => {
      await Promise.all([importLibrary("maps"), importLibrary("marker")]);
    })();
  }
  return loaderPromise;
}
