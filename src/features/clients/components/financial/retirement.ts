export type RetirementInfo = { dob?: string | null; employer?: string | null; occupation?: string | null };

/** Display inference only: never clears or replaces saved financial amounts. */
export function inferRetired(info?: RetirementInfo | null, today = new Date()): boolean {
  if (!info) return false;
  const employment = [info.employer, info.occupation].filter(Boolean).join(" ").toLowerCase();
  if (/\b(not retired|not yet retired|semi[- ]?retired)\b/.test(employment)) return false;
  if (/\b(retired|pensioner|retiree)\b/.test(employment)) return true;
  const absent = /^(none|n\/a|na|not applicable|unemployed|not employed|not working|-)?$/i;
  if ([info.employer, info.occupation].some(value => value?.trim() && !absent.test(value.trim()))) return false;
  const match = info.dob?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const birth = new Date(year, month - 1, day);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return false;
  const age = today.getFullYear() - year - (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day) ? 1 : 0);
  return age >= 65;
}
