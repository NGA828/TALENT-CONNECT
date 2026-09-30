/**
 * Quick check for the AI assistant configuration: `npm run ai:check`.
 *
 * It loads backend/.env, says which provider, endpoint, model and key variable would be used,
 * then makes one small live request so a freshly pasted key can be verified in seconds.
 */
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER_LABELS, selectAiProvider, resolveAiConnection } from '../src/ai/providers/ai-config';
import { GroqProvider } from '../src/ai/providers/groq.provider';
import { GrokProvider } from '../src/ai/providers/grok.provider';
import { OpenAiCompatibleProvider } from '../src/ai/providers/openai-compatible.provider';

const config = { get: (key: string) => process.env[key] } as unknown as ConfigService;

async function main() {
  const connection = resolveAiConnection(config);
  const requested = selectAiProvider(config.get<string>('AI_PROVIDER'));

  console.log(`Provider : ${requested} (AI_PROVIDER=${process.env.AI_PROVIDER ?? 'unset → groq'})`);
  console.log(`Endpoint : ${connection.baseUrl}`);
  console.log(`Model    : ${connection.model}`);
  console.log(`API key  : ${connection.live ? `found in ${connection.keySource} (${connection.key.slice(0, 4)}…)` : 'none'}`);

  if (!connection.live) {
    const hint = requested === 'groq' ? 'GROQ_API_KEY=gsk_...' : requested === 'grok' ? 'XAI_API_KEY=xai-...' : 'AI_API_KEY=...';
    console.log('\nThe assistant would answer with the built-in offline template writer.');
    console.log(`Add ${hint} to backend/.env${requested === 'groq' ? ' (create a key at https://console.groq.com)' : ''} and run this again.`);
    process.exitCode = 1;
    return;
  }

  const provider =
    connection.id === 'groq' ? new GroqProvider(config) : connection.id === 'grok' ? new GrokProvider(config) : new OpenAiCompatibleProvider(config);
  console.log(`\nSending one test message to ${AI_PROVIDER_LABELS[connection.id]}…`);

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
