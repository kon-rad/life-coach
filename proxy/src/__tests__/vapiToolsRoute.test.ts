import request from 'supertest';
import { app } from '../index';

const VAPI_SECRET = 'test-tools-secret';

beforeAll(() => {
  process.env.VAPI_WEBHOOK_SECRET = VAPI_SECRET;
});

jest.mock('../services/firebase', () => ({
  adminAuth: {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user1' }),
  },
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ exists: false }),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../services/vapiTools', () => ({
  handleToolCall: jest.fn().mockResolvedValue('tool result'),
}));

const { handleToolCall: mockHandleToolCall } = jest.requireMock('../services/vapiTools') as {
  handleToolCall: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockHandleToolCall.mockResolvedValue('tool result');
});

function makeToolsBody(toolCallList: Array<{ id: string; function: { name: string; arguments: unknown } }>) {
  return {
    message: {
      type: 'tool-calls',
      call: { metadata: { userId: 'user1' } },
      toolCallList,
    },
  };
}

describe('POST /webhooks/vapi/tools — security', () => {
  it('returns 401 when x-vapi-secret header is missing', async () => {
    const res = await request(app)
      .post('/webhooks/vapi/tools')
      .send(makeToolsBody([{ id: 'tc1', function: { name: 'complete_task', arguments: { taskId: 't1', isCompleted: true } } }]));
    expect(res.status).toBe(401);
  });

  it('returns 401 when x-vapi-secret header is wrong', async () => {
    const res = await request(app)
      .post('/webhooks/vapi/tools')
      .set('x-vapi-secret', 'wrong-secret')
      .send(makeToolsBody([{ id: 'tc1', function: { name: 'complete_task', arguments: { taskId: 't1', isCompleted: true } } }]));
    expect(res.status).toBe(401);
  });
});

describe('POST /webhooks/vapi/tools — valid tool-calls message', () => {
  it('returns results array with toolCallId and result from handleToolCall', async () => {
    const res = await request(app)
      .post('/webhooks/vapi/tools')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(makeToolsBody([{ id: 'tc42', function: { name: 'complete_task', arguments: { taskId: 't1', isCompleted: true } } }]));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      results: [{ toolCallId: 'tc42', result: 'tool result' }],
    });
    expect(mockHandleToolCall).toHaveBeenCalledWith('user1', 'complete_task', { taskId: 't1', isCompleted: true });
  });

  it('handles multiple tool calls in one request', async () => {
    mockHandleToolCall
      .mockResolvedValueOnce('result A')
      .mockResolvedValueOnce('result B');

    const res = await request(app)
      .post('/webhooks/vapi/tools')
      .set('x-vapi-secret', VAPI_SECRET)
      .send(makeToolsBody([
        { id: 'tc1', function: { name: 'set_day_tasks', arguments: { date: '2026-06-01', tasks: ['A', 'B', 'C'] } } },
        { id: 'tc2', function: { name: 'set_week_tasks', arguments: { tasks: ['X', 'Y', 'Z'] } } },
      ]));

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0]).toEqual({ toolCallId: 'tc1', result: 'result A' });
    expect(res.body.results[1]).toEqual({ toolCallId: 'tc2', result: 'result B' });
  });

  it('acknowledges non-tool-calls message types silently', async () => {
    const res = await request(app)
      .post('/webhooks/vapi/tools')
      .set('x-vapi-secret', VAPI_SECRET)
      .send({ message: { type: 'status-update', call: { metadata: { userId: 'user1' } } } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(mockHandleToolCall).not.toHaveBeenCalled();
  });
});
