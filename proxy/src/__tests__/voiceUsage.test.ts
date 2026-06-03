import { usedSecondsThisWeek, accumulatedUsageUpdate } from '../services/voiceUsage';
import { weekId } from '../services/weeks';

const UID = 'user1';
const NOW = new Date('2026-06-03T12:00:00Z'); // a Wednesday
const THIS_WEEK = weekId(UID, NOW);

describe('usedSecondsThisWeek', () => {
  it('returns stored seconds when usageWeekId matches the current week', () => {
    const data = { voiceSecondsUsedThisWeek: 1800, usageWeekId: THIS_WEEK };
    expect(usedSecondsThisWeek(UID, data, NOW)).toBe(1800);
  });

  it('returns 0 when usageWeekId is from a previous week (self-healing reset)', () => {
    const data = { voiceSecondsUsedThisWeek: 1800, usageWeekId: `${UID}_2026-W01` };
    expect(usedSecondsThisWeek(UID, data, NOW)).toBe(0);
  });

  it('falls back to legacy voiceMinutesUsedThisWeek field when no new field present', () => {
    // legacy field actually held seconds; no usageWeekId means "trust it" (pre-migration)
    const data = { voiceMinutesUsedThisWeek: 600 };
    expect(usedSecondsThisWeek(UID, data, NOW)).toBe(600);
  });

  it('returns 0 when nothing is recorded', () => {
    expect(usedSecondsThisWeek(UID, {}, NOW)).toBe(0);
  });

  it('rounds fractional stored seconds to a whole number', () => {
    // VAPI reports fractional call durations (e.g. 377.57s), so accumulated usage can be
    // fractional. The iOS client decodes these fields as `Int` and a fractional JSON number
    // fails the whole decode ("The data couldn't be read"). Seconds must be integers.
    const data = { voiceSecondsUsedThisWeek: 377.57000000000005, usageWeekId: THIS_WEEK };
    expect(usedSecondsThisWeek(UID, data, NOW)).toBe(378);
    expect(Number.isInteger(usedSecondsThisWeek(UID, data, NOW))).toBe(true);
  });
});

describe('accumulatedUsageUpdate', () => {
  it('adds duration to this-week usage and stamps the current weekId', () => {
    const data = { voiceSecondsUsedThisWeek: 300, usageWeekId: THIS_WEEK, totalVoiceSecondsUsed: 1000 };
    const update = accumulatedUsageUpdate(UID, data, 120, NOW);
    expect(update.voiceSecondsUsedThisWeek).toBe(420);
    expect(update.totalVoiceSecondsUsed).toBe(1120);
    expect(update.usageWeekId).toBe(THIS_WEEK);
  });

  it('resets this-week usage to just the new duration when the stored week is stale', () => {
    const data = { voiceSecondsUsedThisWeek: 9999, usageWeekId: `${UID}_2026-W01`, totalVoiceSecondsUsed: 9999 };
    const update = accumulatedUsageUpdate(UID, data, 120, NOW);
    expect(update.voiceSecondsUsedThisWeek).toBe(120);
    expect(update.totalVoiceSecondsUsed).toBe(9999 + 120); // lifetime total still accumulates
    expect(update.usageWeekId).toBe(THIS_WEEK);
  });

  it('stores whole seconds even when the duration is fractional', () => {
    // Firestore must never hold a fractional second count, or it round-trips back to the
    // iOS client (Int fields) and breaks the profile/stats decode.
    const data = { voiceSecondsUsedThisWeek: 300, usageWeekId: THIS_WEEK, totalVoiceSecondsUsed: 1000 };
    const update = accumulatedUsageUpdate(UID, data, 77.57000000000005, NOW);
    expect(update.voiceSecondsUsedThisWeek).toBe(378);
    expect(update.totalVoiceSecondsUsed).toBe(1078);
    expect(Number.isInteger(update.voiceSecondsUsedThisWeek)).toBe(true);
    expect(Number.isInteger(update.totalVoiceSecondsUsed)).toBe(true);
  });
});
