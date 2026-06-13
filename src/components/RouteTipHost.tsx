import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import { tipForPath } from "@/lib/screenTips";
import { useScreenTip } from "@/hooks/useScreenTip";
import { ScreenTip } from "./ScreenTip";

const HIDDEN_PREFIXES = ["/auth", "/verify-email", "/forgot-password", "/reset-password", "/auth/challenge", "/sos-track", "/track/"];

/**
 * Single mount point inside the authed layouts. Reads the current route,
 * finds a matching tip and renders it the very first time the user lands here.
 */
export function RouteTipHost() {
  const { pathname } = useLocation();
  const tip = useMemo(() => {
    if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
    return tipForPath(pathname);
  }, [pathname]);

  const { shouldShow, dismiss } = useScreenTip(tip?.id ?? null);

  if (!tip || !shouldShow) return null;
  return <ScreenTip title={tip.title} body={tip.body} onDismiss={dismiss} />;
}
