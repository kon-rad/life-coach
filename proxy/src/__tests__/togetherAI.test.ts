import { generateRetrospective } from '../services/togetherAI';

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
