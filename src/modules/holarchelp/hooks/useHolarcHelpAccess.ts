/**
 * HolarcHelp (SOS) is enabled by default for every authenticated user.
 * The previous global kill-switch and per-user flag are intentionally bypassed
 * for now; admin gating will be reintroduced in a later iteration.
 */
export function useHolarcHelpAccess() {
  return { enabled: true, loading: false };
}

