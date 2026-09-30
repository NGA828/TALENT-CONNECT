import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiRequest } from './ai.provider';
import { AI_PROVIDER_PRESETS, resolveAiConnection } from './ai-config';
import { requestChatCompletion } from './chat-completions';

/**
 * Generic adapter for any other OpenAI-compatible `/chat/completions` endpoint
 * (OpenAI, OpenRouter, a proxy, a self-hosted gateway …). The key never leaves the backend.
 */
@Injectable()
export class OpenAiCompatibleProvider extends AiProvider {
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);
  readonly name = 'openai-compatible';
  readonly live = true;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    super();
    const connection = resolveAiConnection({ get: (key: string) => config.get(key) });
    this.baseUrl = connection.baseUrl || AI_PROVIDER_PRESETS['openai-compatible'].baseUrl;
    this.model = connection.model || AI_PROVIDER_PRESETS['openai-compatible'].model;
    this.apiKey = connection.key;
  }

  complete(req: AiRequest): Promise<string> {
    const attribution = this.baseUrl.includes('openrouter.ai')
      ? { 'HTTP-Referer': 'https://talent-connect.local', 'X-Title': 'Talent Connect' }
      : undefined;
    return requestChatCompletion({
      label: 'AI provider',
      logger: this.logger,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      model: this.model,
      messages: req.messages,
      temperature: 0.7,
      maxTokens: 900,
      timeoutMs: 30_000,
      headers: attribution,
    });
  }
}
