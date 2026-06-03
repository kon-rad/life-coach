import { generateRetrospective, scoreDay } from '../services/togetherAI';

describe('generateRetrospective', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; process.env.TOGETHER_AI_API_KEY = ''; });

  it('parses the JSON report from the model', async () => {
    process.env.TOGETHER_AI_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({
        wentWell: 'Shipped the API.', improve: 'Start earlier.',
        onePercent: 'Plan the night before.', summary: 'Solid week overall.',
      }) } }] }),
    }) as unknown as typeof fetch;

    const r = await generateRetrospective('PROMPT TEXT');
    expect(r).toEqual({
      wentWell: 'Shipped the API.', improve: 'Start earlier.',
      onePercent: 'Plan the night before.', summary: 'Solid week overall.',
    });
  });

  it('falls back to safe defaults on unparseable output', async () => {
    process.env.TOGETHER_AI_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
    }) as unknown as typeof fetch;

    const r = await generateRetrospective('PROMPT TEXT');
    expect(r.summary.length).toBeGreaterThan(0);
    expect(r.wentWell).toBe('');
  });
});

describe('scoreDay', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; process.env.TOGETHER_AI_API_KEY = ''; });

  it('parses score, summary, and advice from the model', async () => {
    process.env.TOGETHER_AI_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({
        score: 8, summary: 'Got the big task done.', advice: 'Protect your mornings.',
      }) } }] }),
    }) as unknown as typeof fetch;

    const r = await scoreDay('PROMPT TEXT');
    expect(r).toEqual({ score: 8, summary: 'Got the big task done.', advice: 'Protect your mornings.' });
  });

  it('clamps and rounds the score, and falls back safely on bad output', async () => {
    process.env.TOGETHER_AI_API_KEY = 'test-key';
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({ score: 14.6, summary: 's', advice: 'a' }) } }] }),
      })
      .mockResolvedValueOnce({
        ok: true, json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
      }) as unknown as typeof fetch;

    const clamped = await scoreDay('PROMPT TEXT');
    expect(clamped.score).toBe(10);

    const fallback = await scoreDay('PROMPT TEXT');
    expect(fallback.score).toBe(5);
    expect(fallback.advice).toBe('');
  });
});
