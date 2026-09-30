/**
 * Quick check for the AI assistant configuration: `npm run ai:check`.
 *
 * It loads backend/.env, says which provider and model would answer, then makes one
 * small live request so a freshly pasted Grok key can be verified in seconds.
 */
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { AI_KEY_ENV_VARS, AI_PROVIDER_LABELS, resolveAiKey, selectAiProvider } from '../src/ai/providers/ai-config';
import { GrokProvider } from '../src/ai/providers/grok.provider';
import { OpenAiCompatibleProvider } from '../src/ai/providers/openai-compatible.provider';

const config = { get: (key: string) => process.env[key] } as unknown as ConfigService;

async function main() {
  const key = resolveAiKey(config);
  const source = AI_KEY_ENV_VARS.find((name) => (process.env[name] ?? '').trim());
  const id = selectAiProvider(config.get<string>('AI_PROVIDER'), key);

  console.log(`Provider : ${id} (AI_PROVIDER=${process.env.AI_PROVIDER ?? 'unset'})`);
  console.log(`API key  : ${key ? `found in ${source} (${key.slice(0, 6)}…)` : 'none'}`);

  if (id === 'offline') {
    console.log('\nThe assistant would answer with the built-in offline template writer.');
    console.log('Add XAI_API_KEY=xai-... to backend/.env (create a key at https://console.x.ai) and run this again.');
    process.exitCode = 1;
    return;
  }

  const provider = id === 'grok' ? new GrokProvider(config) : new OpenAiCompatibleProvider(config);
  const baseUrl = (config.get<string>('AI_BASE_URL') ?? (id === 'grok' ? 'https://api.x.ai/v1' : 'https://openrouter.ai/api/v1')).replace(/\/+$/, '');
  console.log(`Endpoint : ${baseUrl}`);
  console.log(`Model    : ${provider.model}`);
  console.log(`\nSending one test message to ${AI_PROVIDER_LABELS[id]}…`);

  const reply = await provider.complete({
    task: 'GENERAL',
    context: { name: 'Test Talent', specialization: 'Photographer', skills: ['portraits'], location: 'Douala' },
    messages: [
      { role: 'system', content: 'You are Connect AI, the assistant inside Talent Connect, a Cameroonian events platform. Answer in one short sentence.' },
      { role: 'user', content: 'Confirm you are online and name the model answering.' },
    ],
  });

  console.log(`\n✔ Reply from ${provider.model}:\n${reply}`);
}

void main().catch((e: Error) => {
  console.error(`\n✖ The provider call failed: ${e.message}`);
  process.exitCode = 1;
});
