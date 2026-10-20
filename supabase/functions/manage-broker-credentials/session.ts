export const REAUTH_TTL_MS = 15 * 60 * 1000;
export const isExpired = (expiresAt: number, now = Date.now()) => !Number.isFinite(expiresAt) || now >= expiresAt;