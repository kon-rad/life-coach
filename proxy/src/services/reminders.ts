export interface ReminderSettings {
  middayReminderHour: number; middayReminderMinute: number;
  eveningReminderHour: number; eveningReminderMinute: number;
  weeklyPlanningWeekday: number; weeklyPlanningHour: number; weeklyPlanningMinute: number;
  timeZone: string; streakReminders: boolean;
}
export interface ReminderUser { uid: string; fcmToken: string; settings: ReminderSettings; }
export type ReminderKind = 'midday' | 'evening' | 'weekly';
export interface DueReminder { uid: string; fcmToken: string; kind: ReminderKind; }

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

export function localHourMinuteWeekday(now: Date, timeZone: string): { hour: number; minute: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'long',
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0; // some envs emit 24 for midnight
  return { hour, minute: parseInt(get('minute'), 10), weekday: WEEKDAY_INDEX[get('weekday')] ?? 0 };
}

/** Minutes-of-day distance; true when target is within [now, now+windowMinutes). */
function withinWindow(curH: number, curM: number, tH: number, tM: number, windowMinutes: number): boolean {
  const cur = curH * 60 + curM;
  const tgt = tH * 60 + tM;
  return tgt >= cur && tgt < cur + windowMinutes;
}

export function usersDueAt(users: ReminderUser[], now: Date, windowMinutes: number): DueReminder[] {
  const out: DueReminder[] = [];
  for (const u of users) {
    if (!u.fcmToken) continue;
    const s = u.settings;
    if (!s || !s.timeZone) continue;
    const { hour, minute, weekday } = localHourMinuteWeekday(now, s.timeZone);
    if (withinWindow(hour, minute, s.middayReminderHour, s.middayReminderMinute, windowMinutes)) {
      out.push({ uid: u.uid, fcmToken: u.fcmToken, kind: 'midday' });
    } else if (withinWindow(hour, minute, s.eveningReminderHour, s.eveningReminderMinute, windowMinutes)) {
      out.push({ uid: u.uid, fcmToken: u.fcmToken, kind: 'evening' });
    } else if (weekday === s.weeklyPlanningWeekday &&
               withinWindow(hour, minute, s.weeklyPlanningHour, s.weeklyPlanningMinute, windowMinutes)) {
      out.push({ uid: u.uid, fcmToken: u.fcmToken, kind: 'weekly' });
    }
  }
  return out;
}

export const REMINDER_COPY: Record<ReminderKind, { title: string; body: string }> = {
  midday: { title: 'Midday check-in ☀️', body: 'Quick check-in: how are today\'s 3 tasks going?' },
  evening: { title: 'Evening debrief 🌙', body: 'Review today and plan tomorrow with your coach.' },
  weekly: { title: 'Weekly planning 📅', body: 'Retro the week and set your 3 tasks for next week.' },
};
