import { buildMessagesFromCall } from '../services/vapiTranscript';

const TS = '2026-05-30T12:00:00.000Z';

describe('buildMessagesFromCall', () => {
  it('uses VAPI structured messages and drops system turns', () => {
    const result = buildMessagesFromCall(
      [
        { role: 'system', message: 'You are a coach' },
        { role: 'bot', message: 'How can I help?' },
        { role: 'user', message: 'Just chatting' },
      ],
      '',
      TS,
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ role: 'assistant', content: 'How can I help?', timestamp: TS });
    expect(result[1]).toMatchObject({ role: 'user', content: 'Just chatting' });
    expect(result[0].id).toBeTruthy();
  });

  it('maps assistant role and content field as well as message field', () => {
    const result = buildMessagesFromCall(
      [
        { role: 'assistant', content: 'Hi there' },
        { role: 'user', content: 'Hey' },
      ],
      '',
      TS,
    );
    expect(result.map((m) => m.role)).toEqual(['assistant', 'user']);
    expect(result[0].content).toBe('Hi there');
  });

  it('falls back to parsing a multi-line transcript when no structured messages', () => {
    const result = buildMessagesFromCall(
      undefined,
      'AI: Good morning!\nUser: Hello\nAI: How did you sleep?',
      TS,
    );
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.role)).toEqual(['assistant', 'user', 'assistant']);
    expect(result[1].content).toBe('Hello');
  });

  it('falls back to transcript when structured messages are empty', () => {
    const result = buildMessagesFromCall([], 'User: only line', TS);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ role: 'user', content: 'only line' });
  });

  it('returns [] for an empty transcript and no structured messages', () => {
    expect(buildMessagesFromCall(undefined, '', TS)).toEqual([]);
  });

  it('skips unprefixed transcript lines', () => {
    const result = buildMessagesFromCall(undefined, 'random noise\nUser: real', TS);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('real');
  });
});
