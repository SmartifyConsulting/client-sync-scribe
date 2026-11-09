const storageKey = (userId: string) => `holarc-live-workspaces:${userId}`;

export function workspaceVisits(userId: string): Record<string, number> {
  try {
    const values = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "{}");
    return Object.fromEntries(Object.entries(values ?? {}).filter(([, at]) => typeof at === "number" && Number.isFinite(at))) as Record<string, number>;
  } catch {
    return {};
  }
}

export function recordWorkspaceVisit(userId: string, workflowId: string) {
  try {
    const previous = workspaceVisits(userId);
    delete previous[workflowId];
    const recent = Object.entries(previous).slice(-199);
    localStorage.setItem(storageKey(userId), JSON.stringify(Object.fromEntries([...recent, [workflowId, Date.now()]])));
  } catch {
    // The dashboard can still use the saved workflow update time.
  }
}
