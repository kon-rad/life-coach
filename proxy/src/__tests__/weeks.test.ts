import { isoWeekParts, weekId, weekRange, upcomingWeekRange, weekIdForDate } from '../services/weeks';

describe('weeks helpers', () => {
  it('computes ISO week parts (Thursday rule)', () => {
    // 2026-01-01 is a Thursday -> ISO week 1 of 2026
    expect(isoWeekParts(new Date('2026-01-01T12:00:00Z'))).toEqual({ year: 2026, week: 1 });
    // 2026-06-01 is a Monday -> ISO week 23 of 2026
    expect(isoWeekParts(new Date('2026-06-01T12:00:00Z'))).toEqual({ year: 2026, week: 23 });
  });

  it('builds a weekId from uid + date', () => {
    expect(weekId('u1', new Date('2026-06-01T12:00:00Z'))).toBe('u1_2026-W23');
    expect(weekIdForDate('u1', '2026-06-03')).toBe('u1_2026-W23');
  });

  it('returns Monday..Sunday range for the week containing a date', () => {
    // Wednesday 2026-06-03
    expect(weekRange(new Date('2026-06-03T12:00:00Z'))).toEqual({
      year: 2026, week: 23, startDate: '2026-06-01', endDate: '2026-06-07',
    });
  });

  it('returns the next week for upcomingWeekRange (Sunday planning -> next Monday)', () => {
    // Sunday 2026-06-07 -> upcoming week starts Monday 2026-06-08
    expect(upcomingWeekRange(new Date('2026-06-07T19:00:00Z'))).toEqual({
      year: 2026, week: 24, startDate: '2026-06-08', endDate: '2026-06-14',
    });
  });
});
