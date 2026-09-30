export type AiProviderId = 'grok' | 'openai-compatible' | 'offline';

/**
 * Key environment variables a server administrator may use, in priority order.
 * `XAI_API_KEY` is the name xAI's own console and SDKs use, so it is accepted first.
 */
export const AI_KEY_ENV_VARS = ['AI_API_KEY', 'XAI_API_KEY', 'GROK_API_KEY'] as const;

/** Minimal read-only view of ConfigService, so the selection helpers stay testable without Nest. */
export interface EnvReader {
  get<T = string>(key: string): T | undefined;
}

const PROVIDER_ALIASES: Record<string, AiProviderId> = {
  grok: 'grok',
  xai: 'grok',
  'x-ai': 'grok',
  'x.ai': 'grok',
  openai: 'openai-compatible',
  'openai-compatible': 'openai-compatible',
  openrouter: 'openai-compatible',
  compatible: 'openai-compatible',
  offline: 'offline',
  none: 'offline',
  disabled: 'offline',
  template: 'offline',
};

/** Reads the API key from the first configured variable, trimmed; '' when the assistant must stay offline. */
export function resolveAiKey(config: EnvReader): string {
  for (const name of AI_KEY_ENV_VARS) {
    const value = config.get<string>(name);
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
}

/**
 * Chooses the adapter that answers: `grok` (xAI, the default), a generic OpenAI-compatible
 * endpoint, or the built-in offline assistant. `AI_PROVIDER` accepts the vendor name
 * (`grok`, `xai`, `openrouter`, `openai-compatible`, …); anything unknown falls back to the
 * generic OpenAI-compatible adapter. Without a key the assistant always stays offline.
 */
export function selectAiProvider(providerName: string | undefined, apiKey: string): AiProviderId {
  const requested = (providerName ?? 'grok').trim().toLowerCase();
  const mapped = PROVIDER_ALIASES[requested] ?? 'openai-compatible';
  if (mapped === 'offline') return 'offline';
  return apiKey ? mapped : 'offline';
}

export const AI_PROVIDER_LABELS: Record<AiProviderId, string> = {
  grok: 'Grok (xAI)',
  'openai-compatible': 'OpenAI-compatible endpoint',
  offline: 'Offline assistant',
};
