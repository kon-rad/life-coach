// proxy/src/services/weeks.ts
// All math is done in UTC against the date's calendar day.

export interface WeekParts { year: number; week: number; }
export interface WeekRange { year: number; week: number; startDate: string; endDate: string; }

function toUTCDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** ISO 8601 week number + week-year (weeks start Monday; week 1 contains the first Thursday). */
export function isoWeekParts(date: Date): WeekParts {
  const d = toUTCDate(date);
  // Shift to the Thursday of this week so the year is the ISO week-year.
  const day = (d.getUTCDay() + 6) % 7; // 0=Mon .. 6=Sun
  d.setUTCDate(d.getUTCDate() - day + 3);
  const week = d;
  const firstThursday = new Date(Date.UTC(week.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const weekNo = 1 + Math.round((week.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return { year: week.getUTCFullYear(), week: weekNo };
}

function pad2(n: number): string { return n < 10 ? `0${n}` : `${n}`; }

export function weekId(uid: string, date: Date): string {
  const { year, week } = isoWeekParts(date);
  return `${uid}_${year}-W${pad2(week)}`;
}

export function weekIdForDate(uid: string, isoDate: string): string {
  return weekId(uid, new Date(`${isoDate}T12:00:00Z`));
}

/** Monday..Sunday range for the week containing `date`. */
export function weekRange(date: Date): WeekRange {
  const d = toUTCDate(date);
  const day = (d.getUTCDay() + 6) % 7; // 0=Mon
  const monday = addDays(d, -day);
  const sunday = addDays(monday, 6);
  const { year, week } = isoWeekParts(monday);
  return { year, week, startDate: ymd(monday), endDate: ymd(sunday) };
}

/** The week immediately after the one containing `date`. */
export function upcomingWeekRange(date: Date): WeekRange {
  const current = weekRange(date);
  const nextMonday = addDays(new Date(`${current.startDate}T12:00:00Z`), 7);
  return weekRange(nextMonday);
}
