import { buildWeeklyPrompt, CallPromptContext } from '../prompts';

const base: CallPromptContext = {
  profile: { name: 'Ada', bio: '', coachingStyle: 'balanced', occupation: '', motivation: '' },
  weekTasks: [],
  weekNumber: 23,
  weekStartDate: '2026-06-01',
  weekEndDate: '2026-06-07',
  todayTasks: [],
  recentHistory: 'No recent history.',
};

describe('buildWeeklyPrompt', () => {
  it('first session: welcomes the user, asks for THIS week, and uses set_week_tasks', () => {
    const p = buildWeeklyPrompt({ ...base, isFirstSession: true });
    expect(p).toMatch(/first session/i);
    expect(p).toMatch(/this week/i);
    expect(p).toMatch(/set_week_tasks/);
    // It should NOT run a retrospective of a week that hasn't happened yet.
    expect(p).not.toMatch(/retrospective of the ending week/i);
  });

  it('normal session: runs a retrospective and plans the upcoming week', () => {
    const p = buildWeeklyPrompt({ ...base, isFirstSession: false });
    expect(p).toMatch(/retrospective/i);
    expect(p).toMatch(/upcoming week/i);
    expect(p).toMatch(/set_week_tasks/);
  });
});
