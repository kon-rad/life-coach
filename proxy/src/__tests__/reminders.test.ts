import { localHourMinuteWeekday, usersDueAt, ReminderUser } from '../services/reminders';

describe('localHourMinuteWeekday', () => {
  it('converts an instant to local h/m/weekday for a timezone', () => {
    // 2026-06-01T15:30:00Z = 11:30 in America/New_York (EDT, UTC-4), Monday (weekday 1)
    const r = localHourMinuteWeekday(new Date('2026-06-01T15:30:00Z'), 'America/New_York');
    expect(r).toEqual({ hour: 11, minute: 30, weekday: 1 });
  });
});

describe('usersDueAt', () => {
  const base: ReminderUser = {
    uid: 'u1', fcmToken: 'tok',
    settings: {
      middayReminderHour: 11, middayReminderMinute: 30,
      eveningReminderHour: 20, eveningReminderMinute: 0,
      weeklyPlanningWeekday: 0, weeklyPlanningHour: 19, weeklyPlanningMinute: 0,
      timeZone: 'America/New_York', streakReminders: true,
    },
  };

  it('returns a midday reminder when local time matches within the tick window', () => {
    // 15:30 UTC -> 11:30 EDT == midday slot
    const due = usersDueAt([base], new Date('2026-06-01T15:30:00Z'), 5);
    expect(due).toEqual([{ uid: 'u1', fcmToken: 'tok', kind: 'midday' }]);
  });

  it('returns a weekly reminder on the configured weekday/time', () => {
    // Sunday 2026-06-07, 19:00 EDT = 23:00 UTC, weekday 0
    const due = usersDueAt([base], new Date('2026-06-07T23:00:00Z'), 5);
    expect(due).toEqual([{ uid: 'u1', fcmToken: 'tok', kind: 'weekly' }]);
  });

  it('returns nothing outside any slot', () => {
    expect(usersDueAt([base], new Date('2026-06-01T18:00:00Z'), 5)).toEqual([]);
  });

  it('skips users without an fcm token', () => {
    const noTok = { ...base, fcmToken: '' };
    expect(usersDueAt([noTok], new Date('2026-06-01T15:30:00Z'), 5)).toEqual([]);
  });
});
