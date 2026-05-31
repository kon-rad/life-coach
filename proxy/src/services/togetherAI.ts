export interface CallAnalysis {
  summary: string;
  score: number;
  scoreRationale: string;
  microActions?: Array<{ id: string; title: string }>;
}

export async function analyzeCall(
  transcript: string,
  callType: 'midday' | 'evening' | 'weekly' | 'free',
  projectTitle: string,
): Promise<CallAnalysis> {
  const apiKey = process.env.TOGETHER_AI_API_KEY;
  if (!apiKey) throw new Error('TOGETHER_AI_API_KEY is not set');

  const isMidday = callType === 'midday';

  const prompt = isMidday
    ? `You are analyzing a midday coaching call transcript. The user's project is: "${projectTitle}".

Extract the 3 micro-actions the coach and user agreed on for today, plus score the quality of the planning session.

Transcript:
${transcript}

Respond with valid JSON only, no markdown:
{
  "summary": "one sentence summary of the call",
  "score": <integer 1-10 rating the clarity and ambition of the plan>,
  "scoreRationale": "one sentence explaining the score",
  "microActions": [
    {"id": "<uuid>", "title": "<action 1>"},
    {"id": "<uuid>", "title": "<action 2>"},
    {"id": "<uuid>", "title": "<action 3>"}
  ]
}`
    : `You are analyzing a ${callType === 'evening' ? 'evening reflection' : 'coaching'} call transcript. The user's project is: "${projectTitle}".

Score how well the user did today and summarize the call.

Transcript:
${transcript}

Respond with valid JSON only, no markdown:
{
  "summary": "one sentence summary of the call",
  "score": <integer 1-10 rating today's effort and progress>,
  "scoreRationale": "one sentence explaining the score"
}`;

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.2,
    }),
  });

  if (!response.ok) throw new Error(`Together AI request failed: ${response.status}`);

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? '{}';

  try {
    const parsed = JSON.parse(raw) as Partial<CallAnalysis>;
    return {
      summary: parsed.summary ?? '',
      score: typeof parsed.score === 'number' ? Math.min(10, Math.max(0, parsed.score)) : 5,
      scoreRationale: parsed.scoreRationale ?? '',
      microActions: parsed.microActions,
    };
  } catch {
    return { summary: raw.slice(0, 200), score: 5, scoreRationale: 'Unable to parse score.' };
  }
}

export async function complete(prompt: string): Promise<string> {
  const apiKey = process.env.TOGETHER_AI_API_KEY;
  if (!apiKey) throw new Error('TOGETHER_AI_API_KEY is not set');

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    }),
  });

  if (!response.ok) throw new Error(`Together AI request failed: ${response.status}`);

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

export interface TogetherMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function streamChat(
  messages: TogetherMessage[],
  onDelta: (delta: string) => void,
): Promise<string> {
  const apiKey = process.env.TOGETHER_AI_API_KEY;
  if (!apiKey) throw new Error('TOGETHER_AI_API_KEY is not set');

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      messages,
      stream: true,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Together AI request failed: ${response.status}`);
  }

  if (!response.body) throw new Error('No response body');

  let fullText = '';
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice('data: '.length).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          onDelta(delta);
          fullText += delta;
        }
      } catch {
        // malformed SSE line — skip
      }
    }
  }

  return fullText;
}

export interface RetrospectiveReport {
  wentWell: string;
  improve: string;
  onePercent: string;
  summary: string;
}

export async function generateRetrospective(prompt: string): Promise<RetrospectiveReport> {
  const apiKey = process.env.TOGETHER_AI_API_KEY;
  if (!apiKey) throw new Error('TOGETHER_AI_API_KEY is not set');

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 700,
      temperature: 0.3,
    }),
  });
  if (!response.ok) throw new Error(`Together AI request failed: ${response.status}`);

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? '{}';
  try {
    const p = JSON.parse(raw) as Partial<RetrospectiveReport>;
    return {
      wentWell: p.wentWell ?? '',
      improve: p.improve ?? '',
      onePercent: p.onePercent ?? '',
      summary: p.summary ?? '',
    };
  } catch {
    return { wentWell: '', improve: '', onePercent: '', summary: raw.slice(0, 400) };
  }
}
