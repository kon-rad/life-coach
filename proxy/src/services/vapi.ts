interface VapiCallResponse {
  id?: string;
  token?: string;
  webCallUrl?: string;
}

export async function createVapiCall(params: {
  assistantId: string;
  systemPromptOverride: string;
  userId: string;
}): Promise<{ vapiCallId: string; callToken: string }> {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) throw new Error('VAPI_API_KEY is not set');

  const response = await fetch('https://api.vapi.ai/call', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistantId: params.assistantId,
      assistantOverrides: {
        model: {
          systemPrompt: params.systemPromptOverride,
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`VAPI API request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as VapiCallResponse;
  return {
    vapiCallId: data.id ?? '',
    callToken: data.token ?? data.webCallUrl ?? '',
  };
}
