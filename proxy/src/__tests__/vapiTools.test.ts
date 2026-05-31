import { handleToolCall } from '../services/vapiTools';

jest.mock('../services/firebase', () => ({
  db: { collection: jest.fn().mockReturnThis(), doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
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
    expect(r).toMatch(/3 tasks/i);
  });

  it('set_week_tasks writes the upcoming week', async () => {
    db.get.mockResolvedValue({ exists: false });
    const r = await handleToolCall('user1', 'set_week_tasks', { tasks: ['X', 'Y', 'Z'] });
    expect(db.set).toHaveBeenCalled();
    expect(r).toMatch(/week/i);
  });

  it('complete_task toggles a matching day task', async () => {
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
    expect(r).toMatch(/marked/i);
  });

  it('returns an error string for an unknown tool', async () => {
    const r = await handleToolCall('user1', 'nope', {});
    expect(r).toMatch(/unknown/i);
  });
});
