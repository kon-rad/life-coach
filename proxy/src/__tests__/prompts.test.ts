import { buildWeeklyPrompt, buildEveningPrompt, CallPromptContext } from '../prompts';

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

describe('long-term goals injection', () => {
  it('includes the goals (with target dates) when provided', () => {
    const p = buildEveningPrompt({
      ...base,
      goals: [
        { title: 'Run a marathon', description: 'sub-4 hours', dueDate: '2026-12-01' },
        { title: 'Ship the app', description: '', dueDate: '' },
      ],
    });
    expect(p).toMatch(/long-term goals/i);
    expect(p).toMatch(/Run a marathon/);
    expect(p).toMatch(/sub-4 hours/);
    expect(p).toMatch(/2026-12-01/);
    expect(p).toMatch(/Ship the app/);
  });

  it('omits the goals section entirely when there are none', () => {
    expect(buildEveningPrompt({ ...base })).not.toMatch(/long-term goals/i);
    expect(buildEveningPrompt({ ...base, goals: [] })).not.toMatch(/long-term goals/i);
  });

  it('also injects goals into the weekly first-session prompt', () => {
    const p = buildWeeklyPrompt({
      ...base,
      isFirstSession: true,
      goals: [{ title: 'Get healthy', description: '', dueDate: '' }],
    });
    expect(p).toMatch(/Get healthy/);
  });
});
