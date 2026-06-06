import { handleToolCall } from '../services/vapiTools';
import { weekRange, upcomingWeekRange } from '../services/weeks';

jest.mock('../services/firebase', () => ({
  db: { collection: jest.fn().mockReturnThis(), doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(),
    get: jest.fn(), set: jest.fn().mockResolvedValue(undefined), update: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../services/encryption', () => ({
  encryptJSON: jest.fn((o: unknown) => Promise.resolve(`enc(${JSON.stringify(o)})`)),
  decryptJSON: jest.fn((c: string) => Promise.resolve(JSON.parse(c.replace(/^enc\(/, '').replace(/\)$/, '')))),
}));
const { db } = jest.requireMock('../services/firebase') as { db: Record<string, jest.Mock> };

describe('handleToolCall', () => {
  beforeEach(() => jest.clearAllMocks());

  it('set_day_tasks writes 3 tasks for the date and links weekId', async () => {
    db.get.mockResolvedValue({ exists: false });
    const r = await handleToolCall('user1', 'set_day_tasks',
      { date: '2026-06-02', tasks: ['A', 'B', 'C'] });
    expect(db.set).toHaveBeenCalled();
    expect(r.result).toMatch(/3 tasks/i);
  });

  it('set_day_tasks reports the touched date so past-day edits can be rescored', async () => {
    db.get.mockResolvedValue({ exists: false });
    const r = await handleToolCall('user1', 'set_day_tasks',
      { date: '2026-06-02', tasks: ['A'] });
    expect(r.touchedDate).toBe('2026-06-02');
  });

  it('set_day_tasks supports more than 3 tasks for a day', async () => {
    db.get.mockResolvedValue({ exists: false });
    const r = await handleToolCall('user1', 'set_day_tasks',
      { date: '2026-06-02', tasks: ['A', 'B', 'C', 'D', 'E'] });
    const arg = db.set.mock.calls[0][0] as { tasks: string };
    const tasks = JSON.parse(arg.tasks.replace(/^enc\(/, '').replace(/\)$/, '')) as unknown[];
    expect(tasks).toHaveLength(5);
    expect(r.result).toMatch(/5 tasks/i);
  });

  it('set_week_tasks writes the CURRENT week on the first session (no weeks exist yet)', async () => {
    db.get.mockResolvedValue({ empty: true, docs: [] }); // weeks query: user has no weeks
    const r = await handleToolCall('user1', 'set_week_tasks', { tasks: ['X', 'Y', 'Z'] });
    expect(db.set).toHaveBeenCalled();
    const arg = db.set.mock.calls[0][0] as { startDate: string };
    expect(arg.startDate).toBe(weekRange(new Date()).startDate);
    expect(r.result).toMatch(/this week/i);
    expect(r.touchedDate).toBeUndefined();
  });

  it('set_week_tasks writes the UPCOMING week when the user already has weeks', async () => {
    db.get.mockResolvedValue({ empty: false, docs: [{ id: 'user1_2026-W01' }] });
    const r = await handleToolCall('user1', 'set_week_tasks', { tasks: ['X', 'Y', 'Z'] });
    expect(db.set).toHaveBeenCalled();
    const arg = db.set.mock.calls[0][0] as { startDate: string };
    expect(arg.startDate).toBe(upcomingWeekRange(new Date()).startDate);
    expect(r.result).toMatch(/week/i);
  });

  it('complete_task toggles a matching day task and reports its date', async () => {
    const tasks = [{ id: 't1', title: 'A', isCompleted: false, completedAt: null }];
    // first get: week doc doesn't exist, second: sessions query returns doc
    db.get
      .mockResolvedValueOnce({ exists: false })  // week doc
      .mockResolvedValueOnce({                   // sessions query
        docs: [{
          data: () => ({ date: '2026-06-02', tasks: `enc(${JSON.stringify(tasks)})` }),
          ref: { update: db.update },
        }],
      });
    const r = await handleToolCall('user1', 'complete_task', { taskId: 't1', isCompleted: true });
    expect(r.result).toMatch(/marked/i);
    expect(r.touchedDate).toBe('2026-06-02');
  });

  it('complete_task toggles a matching week task and returns a week-task confirmation', async () => {
    const weekTasks = [{ id: 'w1', title: 'Weekly goal', isCompleted: false, completedAt: null }];
    // week doc exists and contains the matching task; db.collection().doc() returns db (mockReturnThis)
    // so toggleInDoc will call db.update directly
    db.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ tasks: `enc(${JSON.stringify(weekTasks)})` }),
    });
    const r = await handleToolCall('user1', 'complete_task', { taskId: 'w1', isCompleted: true });
    expect(r.result).toMatch(/week task/i);
    // Week-task toggles never queue a day rescore.
    expect(r.touchedDate).toBeUndefined();
    // db.update is called by toggleInDoc via weekRef (which is db itself due to mockReturnThis)
    expect(db.update).toHaveBeenCalledTimes(1);
    const updateArg = db.update.mock.calls[0][0] as { tasks: string };
    expect(updateArg.tasks).toBeDefined();
    // Verify the task was toggled to completed in the encrypted payload
    const updated = JSON.parse(updateArg.tasks.replace(/^enc\(/, '').replace(/\)$/, '')) as Array<{ id: string; isCompleted: boolean }>;
    expect(updated.find((t) => t.id === 'w1')?.isCompleted).toBe(true);
  });

  it('returns an error string for an unknown tool', async () => {
    const r = await handleToolCall('user1', 'nope', {});
    expect(r.result).toMatch(/unknown/i);
  });
});
