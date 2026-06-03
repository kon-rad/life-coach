/**
 * Week-aware voice-usage accounting. Usage is metered per ISO week (matching the
 * weekly+daily product model) and stamped with a `usageWeekId` so it self-heals at
 * week boundaries without a cron — a stale stamp means "this is last week's count,
 * treat as 0". The legacy `voiceMinutesUsedThisWeek` field (which, despite its name,
 * stored seconds) is read as a fallback for docs written before the rename.
 */
import { weekId } from './weeks';

export interface VoiceUsageDoc {
  voiceSecondsUsedThisWeek?: number;
  /** Legacy field — held seconds despite the "Minutes" name. */
  voiceMinutesUsedThisWeek?: number;
  totalVoiceSecondsUsed?: number;
  usageWeekId?: string;
}

export interface VoiceUsageUpdate {
  voiceSecondsUsedThisWeek: number;
  totalVoiceSecondsUsed: number;
  usageWeekId: string;
}

/** Seconds of voice consumed in the ISO week containing `now`, 0 if the stamp is stale. */
export function usedSecondsThisWeek(uid: string, data: VoiceUsageDoc, now: Date): number {
  if (data.usageWeekId && data.usageWeekId !== weekId(uid, now)) return 0;
  // VAPI reports fractional call durations, so stored usage can be fractional. The iOS
  // client decodes these as `Int`; a fractional JSON number fails the whole decode. Always
  // return whole seconds.
  return Math.round(data.voiceSecondsUsedThisWeek ?? data.voiceMinutesUsedThisWeek ?? 0);
}

/** Firestore update that adds `durationSeconds` to this-week + lifetime usage, week-aware. */
export function accumulatedUsageUpdate(
  uid: string,
  data: VoiceUsageDoc,
  durationSeconds: number,
  now: Date,
): VoiceUsageUpdate {
  // Round so Firestore never stores a fractional second count — otherwise it round-trips
  // back to the iOS client's `Int` fields and breaks the profile/stats decode.
  return {
    voiceSecondsUsedThisWeek: Math.round(usedSecondsThisWeek(uid, data, now) + durationSeconds),
    totalVoiceSecondsUsed: Math.round((data.totalVoiceSecondsUsed ?? 0) + durationSeconds),
    usageWeekId: weekId(uid, now),
  };
}
