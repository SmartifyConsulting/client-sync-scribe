import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import { tipForPath } from "@/lib/screenTips";
import { useScreenTip } from "@/hooks/useScreenTip";
import { useAuth, isFirstSigninSession } from "@/hooks/useAuth";
import { ScreenTip } from "./ScreenTip";

const HIDDEN_PREFIXES = ["/auth", "/verify-email", "/forgot-password", "/reset-password", "/auth/challenge", "/sos-track", "/track/"];

/**
 * Single mount point inside the authed layouts. Renders a route-specific tip
 * ONLY during the user's very first sign-in session — for every role. After
 * the user signs out and back in, no tips ever appear again on any route.
 */
export function RouteTipHost() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const tip = useMemo(() => {
    if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
    return tipForPath(pathname);
  }, [pathname]);

  const firstSession = isFirstSigninSession(user?.id);
  const { shouldShow, dismiss } = useScreenTip(firstSession ? (tip?.id ?? null) : null);

  if (!tip || !shouldShow || !firstSession) return null;
  return <ScreenTip title={tip.title} body={tip.body} onDismiss={dismiss} />;
}
