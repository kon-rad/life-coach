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
