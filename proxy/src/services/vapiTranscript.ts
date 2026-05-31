import * as crypto from 'crypto';

// Stored conversation message — identical shape to text-chat messages so voice
// and text history are persisted and rendered the same way.
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// A single turn from VAPI's structured message history.
export interface VapiArtifactMessage {
  role?: string; // 'user' | 'bot' | 'assistant' | 'system'
  message?: string;
  content?: string;
}

// Convert a VAPI call into our Message[] shape. Prefer VAPI's structured
// per-turn messages; fall back to parsing the flat transcript string
// ("User: ..." / "AI: ..." lines) so we always store role-tagged turns.
export function buildMessagesFromCall(
  artifactMessages: VapiArtifactMessage[] | undefined,
  transcript: string,
  timestamp: string,
): Message[] {
  if (artifactMessages && artifactMessages.length > 0) {
    const messages = artifactMessages
      .filter((m) => m.role && m.role !== 'system')
      .map((m) => ({
        id: crypto.randomUUID(),
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: (m.message ?? m.content ?? '').trim(),
        timestamp,
      }))
      .filter((m) => m.content.length > 0);
    if (messages.length > 0) return messages;
  }

  return transcript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^user\s*:/i.test(line)) {
        return { role: 'user' as const, content: line.replace(/^user\s*:/i, '').trim() };
      }
      if (/^(ai|assistant|bot)\s*:/i.test(line)) {
        return {
          role: 'assistant' as const,
          content: line.replace(/^(ai|assistant|bot)\s*:/i, '').trim(),
        };
      }
      return null;
    })
    .filter((m): m is { role: 'user' | 'assistant'; content: string } => !!m && m.content.length > 0)
    .map((m) => ({ id: crypto.randomUUID(), role: m.role, content: m.content, timestamp }));
}
