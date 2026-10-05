const COMMON_WEAK = [
  "password", "password1", "12345678", "123456789", "qwertyui", "qwerty123",
  "letmein1", "welcome1", "admin123", "iloveyou", "abc12345", "00000000",
];

/** Returns a single, specific, actionable message for the first basic security
 *  rule a password fails — or null if it passes. Checked in priority order so
 *  the user always sees the most important thing to fix first. */
export function getPasswordError(password: string, context?: { name?: string; email?: string }): string | null {
  if (!password) return "Please enter a password.";
  if (password.length < 8) return "Your password needs to be at least 8 characters long.";
  if (!/[A-Za-z]/.test(password)) return "Your password needs at least one letter.";
  if (!/\d/.test(password)) return "Your password needs at least one number.";
  if (/^(.)\1+$/.test(password)) return "Your password can't just be one character repeated.";
  if (COMMON_WEAK.includes(password.toLowerCase())) return "That password is too common and easy to guess. Please choose a less predictable one.";

  const lower = password.toLowerCase();
  const name = context?.name?.trim().toLowerCase();
  const emailLocal = context?.email?.split("@")[0]?.toLowerCase();
  if (name && name.length >= 3 && lower.includes(name)) return "Please don't use your name in your password.";
  if (emailLocal && emailLocal.length >= 3 && lower.includes(emailLocal)) return "Please don't use part of your email in your password.";

  return null;
}
