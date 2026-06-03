// proxy/scripts/registerVapiTools.ts
// Run: cd proxy && npx ts-node scripts/registerVapiTools.ts
// Requires VAPI_PRIVATE_API_KEY, VAPI_ASSISTANT_ID, VAPI_WEBHOOK_SECRET, and the
// public tools URL (defaults to https://api.soularc.xyz/webhooks/vapi/tools).
import 'dotenv/config';
import { TOOL_DEFINITIONS } from '../src/prompts';

const API = 'https://api.vapi.ai';
const key = process.env.VAPI_PRIVATE_API_KEY!;
const assistantId = process.env.VAPI_ASSISTANT_ID!;
const serverUrl = process.env.VAPI_TOOLS_URL ?? 'https://api.soularc.xyz/webhooks/vapi/tools';
const secret = process.env.VAPI_WEBHOOK_SECRET!;

async function main() {
  const toolIds: string[] = [];
  for (const def of TOOL_DEFINITIONS) {
    const resp = await fetch(`${API}/tool`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'function',
        function: def.function,
        server: { url: serverUrl, secret },
      }),
    });
    if (!resp.ok) throw new Error(`Create tool ${def.function.name} failed: ${resp.status} ${await resp.text()}`);
    const created = (await resp.json()) as { id: string };
    console.log(`Created ${def.function.name} -> ${created.id}`);
    toolIds.push(created.id);
  }

  // `model` is a provider-discriminated union — PATCHing it with ONLY `toolIds` drops the
  // provider/model/messages and breaks the assistant (same failure class as the
  // assistantOverrides.model 400). Fetch the current model and merge toolIds into it.
  const getResp = await fetch(`${API}/assistant/${assistantId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!getResp.ok) throw new Error(`Fetch assistant failed: ${getResp.status} ${await getResp.text()}`);
  const assistant = (await getResp.json()) as { model?: Record<string, unknown> };
  const model = { ...(assistant.model ?? {}), toolIds };

  const patch = await fetch(`${API}/assistant/${assistantId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    // Ensure call recording is on so the end-of-call-report carries artifact.recordingUrl,
    // which the webhook persists for in-app playback. (VAPI defaults this on, but be explicit.)
    body: JSON.stringify({ model, artifactPlan: { recordingEnabled: true } }),
  });
  if (!patch.ok) throw new Error(`Attach tools failed: ${patch.status} ${await patch.text()}`);
  console.log('Attached toolIds to assistant:', toolIds);
}

main().catch((e) => { console.error(e); process.exit(1); });
