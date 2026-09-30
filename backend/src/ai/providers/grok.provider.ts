import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiRequest } from './ai.provider';
import { AI_PROVIDER_PRESETS, resolveAiConnection } from './ai-config';
import { requestChatCompletion } from './chat-completions';

/**
 * xAI's Grok, called over its OpenAI-compatible endpoint (https://api.x.ai/v1/chat/completions).
 * Not to be confused with Groq (api.groq.com), which is the default provider.
 * The key (`XAI_API_KEY`) is read on the server and never leaves the backend.
 */
@Injectable()
export class GrokProvider extends AiProvider {
  private readonly logger = new Logger(GrokProvider.name);
  readonly name = 'grok';
  readonly live = true;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    super();
    const connection = resolveAiConnection(config);
    this.baseUrl = connection.baseUrl || AI_PROVIDER_PRESETS.grok.baseUrl;
    this.model = connection.model || AI_PROVIDER_PRESETS.grok.model;
    this.apiKey = connection.key;
    this.maxTokens = Number(config.get<string | number>('AI_MAX_TOKENS') ?? 900) || 900;
    this.timeoutMs = Number(config.get<string | number>('AI_TIMEOUT_MS') ?? 60_000) || 60_000;
  }

  complete(req: AiRequest): Promise<string> {
    return requestChatCompletion({
      label: 'Grok (xAI)',
      logger: this.logger,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      model: this.model,
      messages: req.messages,
      temperature: 0.7,
      maxTokens: this.maxTokens,
      timeoutMs: this.timeoutMs,
    });
  }
}
