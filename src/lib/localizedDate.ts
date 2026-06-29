const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const MONTH_SHORT_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const DAY_SHORT_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

type Translate = (key: string, options?: Record<string, unknown>) => string | string[] | Record<string, string>;

const value = (t: Translate, key: string, fallback: string) => {
  const translated = t(key, { defaultValue: fallback });
  return typeof translated === "string" ? translated : fallback;
};

export const getCalendarMonthName = (t: Translate, date: Date) =>
  value(t, `calendar.months.${MONTH_KEYS[date.getMonth()]}`, MONTH_KEYS[date.getMonth()]);

export const getCalendarShortMonthName = (t: Translate, date: Date) =>
  value(t, `calendar.monthsShort.${MONTH_SHORT_KEYS[date.getMonth()]}`, MONTH_SHORT_KEYS[date.getMonth()]);

export const getCalendarWeekdayName = (t: Translate, date: Date) =>
  value(t, `calendar.days.${DAY_KEYS[date.getDay()]}`, DAY_KEYS[date.getDay()]);

export const getCalendarShortWeekdayName = (t: Translate, date: Date) =>
  value(t, `calendar.daysShort.${DAY_SHORT_KEYS[date.getDay()]}`, DAY_SHORT_KEYS[date.getDay()]);

export const getCalendarMonthNames = (t: Translate) =>
  MONTH_KEYS.map((key) => value(t, `calendar.months.${key}`, key));

export const getCalendarShortMonthNames = (t: Translate) =>
  MONTH_SHORT_KEYS.map((key) => value(t, `calendar.monthsShort.${key}`, key));

export const getCalendarWeekdayNames = (t: Translate, mondayFirst = false) => {
  const names = DAY_KEYS.map((key) => value(t, `calendar.days.${key}`, key));
  return mondayFirst ? [...names.slice(1), names[0]] : names;
};

export const getCalendarShortWeekdayNames = (t: Translate, mondayFirst = false) => {
  const names = DAY_SHORT_KEYS.map((key) => value(t, `calendar.daysShort.${key}`, key));
  return mondayFirst ? [...names.slice(1), names[0]] : names;
};

export const getCalendarNarrowWeekdayNames = (t: Translate) => {
  const translated = t("calendar.daysNarrow", { returnObjects: true });
  if (Array.isArray(translated) && translated.length >= 7) return translated.slice(0, 7).map(String);
  return getCalendarShortWeekdayNames(t).map((day) => day.slice(0, 1));
};

export const formatCalendarMonthYear = (t: Translate, date: Date) =>
  `${getCalendarMonthName(t, date)} ${date.getFullYear()}`;

export const formatCalendarShortMonthYear = (t: Translate, date: Date) =>
  `${getCalendarShortMonthName(t, date)} ${date.getFullYear()}`;

export const formatCalendarShortMonthDay = (t: Translate, date: Date) =>
  `${getCalendarShortMonthName(t, date)} ${date.getDate()}`;

export const formatCalendarShortMonthDayYear = (t: Translate, date: Date) =>
  `${formatCalendarShortMonthDay(t, date)}, ${date.getFullYear()}`;

export const formatCalendarMonthDayYear = (t: Translate, date: Date) =>
  `${getCalendarMonthName(t, date)} ${date.getDate()}, ${date.getFullYear()}`;

export const formatCalendarWeekdayMonthDay = (t: Translate, date: Date) =>
  `${getCalendarWeekdayName(t, date)}, ${getCalendarMonthName(t, date)} ${date.getDate()}`;

export const formatCalendarWeekRange = (t: Translate, start: Date, end: Date) =>
  `${formatCalendarShortMonthDay(t, start)} – ${formatCalendarShortMonthDayYear(t, end)}`;