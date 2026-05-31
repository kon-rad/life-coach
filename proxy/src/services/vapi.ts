interface VapiCallResponse {
  id?: string;
  token?: string;
  webCallUrl?: string;
}

export async function createVapiCall(params: {
  assistantId: string;
  systemPromptOverride: string;
  userId: string;
  callType: string;
  conversationId: string;
}): Promise<{ vapiCallId: string; callToken: string }> {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) throw new Error('VAPI_API_KEY is not set');

  const response = await fetch('https://api.vapi.ai/call/web', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistantId: params.assistantId,
      // Inject the system prompt via a template variable. `assistantOverrides.model`
      // is a provider-discriminated union, so a partial `{ messages }` override (no
      // `provider`/`model`) is rejected with a 400. The VAPI assistant's system prompt
      // must be set to `{{systemPrompt}}` in the dashboard.
      assistantOverrides: {
        variableValues: { systemPrompt: params.systemPromptOverride },
      },
      metadata: {
        userId: params.userId,
        callType: params.callType,
        conversationId: params.conversationId,
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
