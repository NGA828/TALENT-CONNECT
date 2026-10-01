export type AiProviderId = 'groq' | 'grok' | 'openai-compatible' | 'offline';
export type LiveAiProviderId = Exclude<AiProviderId, 'offline'>;

/** Minimal read-only view of ConfigService, so the selection helpers stay testable without Nest. */
export interface EnvReader {
  get<T = string>(key: string): T | undefined;
}

export const AI_PROVIDER_LABELS: Record<AiProviderId, string> = {
  groq: 'Groq',
  grok: 'Grok (xAI)',
  'openai-compatible': 'OpenAI-compatible endpoint',
  offline: 'Offline assistant',
};

/**
 * Everything a vendor needs. Key/base-URL/model variables are read in order, so the
 * provider-specific name wins and the generic `AI_*` name stays as a fallback.
 * Careful: **Groq** (api.groq.com, `GROQ_API_KEY`, open models on LPUs) and **Grok**
 * (api.x.ai, `XAI_API_KEY`, xAI's model) are two different services.
 */
export const AI_PROVIDER_PRESETS: Record<
  LiveAiProviderId,
  { baseUrl: string; model: string; fallbackModel?: string; keys: string[]; baseUrlVars: string[]; modelVars: string[] }
> = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    // Groq retired llama-3.3-70b-versatile and llama-3.1-8b-instant for Free/Developer keys on
    // 16 August 2026 (they answer 404 "model does not exist"), so the default is Groq's own
    // recommended replacement. `fallbackModel` is retried once when the configured model 404s,
    // which keeps an outdated GROQ_MODEL/AI_MODEL in someone's .env from breaking the assistant.
    model: 'openai/gpt-oss-120b',
    fallbackModel: 'openai/gpt-oss-20b',
    keys: ['GROQ_API_KEY', 'AI_API_KEY'],
    baseUrlVars: ['GROQ_BASE_URL', 'AI_BASE_URL'],
    modelVars: ['GROQ_MODEL', 'AI_MODEL'],
  },
  grok: {
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-4.7',
    keys: ['XAI_API_KEY', 'AI_API_KEY'],
    baseUrlVars: ['XAI_BASE_URL', 'AI_BASE_URL'],
    modelVars: ['XAI_MODEL', 'AI_MODEL'],
  },
  'openai-compatible': {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    keys: ['AI_API_KEY'],
    baseUrlVars: ['AI_BASE_URL'],
    modelVars: ['AI_MODEL'],
  },
};

const PROVIDER_ALIASES: Record<string, AiProviderId> = {
  groq: 'groq',
  groqcloud: 'groq',
  'groq-cloud': 'groq',
  grok: 'grok',
  xai: 'grok',
  'x-ai': 'grok',
  'x.ai': 'grok',
  openai: 'openai-compatible',
  openrouter: 'openai-compatible',
  'openai-compatible': 'openai-compatible',
  compatible: 'openai-compatible',
  offline: 'offline',
  none: 'offline',
  disabled: 'offline',
  template: 'offline',
};

/** `AI_PROVIDER` accepts a vendor name; anything unknown falls back to the generic OpenAI-compatible adapter. */
export function selectAiProvider(providerName?: string): AiProviderId {
  const requested = (providerName ?? 'groq').trim().toLowerCase();
  return PROVIDER_ALIASES[requested] ?? 'openai-compatible';
}

/** First non-empty variable of the list, trimmed. */
function firstSet(config: EnvReader, names: string[]): { value: string; name: string } | null {
  for (const name of names) {
    const value = config.get<string>(name);
    if (value && String(value).trim()) return { value: String(value).trim(), name };
  }
  return null;
}

/** The API key for a live provider, with the variable it came from (for logs and `npm run ai:check`). */
export function resolveAiKey(config: EnvReader, id: AiProviderId): { key: string; source: string } | null {
  if (id === 'offline') return null;
  const found = firstSet(config, AI_PROVIDER_PRESETS[id].keys);
  return found ? { key: found.value, source: found.name } : null;
}

export interface AiConnection {
  /** The adapter that will answer: the requested live provider, or `offline` when no key is configured. */
  id: AiProviderId;
  requested: AiProviderId;
  live: boolean;
  key: string;
  keySource?: string;
  baseUrl: string;
  model: string;
}

/** Resolves provider + credentials + endpoint in one place (used by the module, the providers and `ai:check`). */
export function resolveAiConnection(config: EnvReader): AiConnection {
  const requested = selectAiProvider(config.get<string>('AI_PROVIDER'));
  if (requested === 'offline') return { id: 'offline', requested, live: false, key: '', baseUrl: '', model: 'rule-based' };

  const preset = AI_PROVIDER_PRESETS[requested];
  const baseUrl = firstSet(config, preset.baseUrlVars)?.value ?? preset.baseUrl;
  const model = firstSet(config, preset.modelVars)?.value ?? preset.model;
  const resolved = resolveAiKey(config, requested);
  if (!resolved) return { id: 'offline', requested, live: false, key: '', baseUrl, model };

  return { id: requested, requested, live: true, key: resolved.key, keySource: resolved.source, baseUrl, model };
}
