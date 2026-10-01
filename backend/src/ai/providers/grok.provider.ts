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
  private readonly configuredModel: string;
  /** Model that answered last; differs from the configured one only after a vendor refused it. */
  private answeredWith?: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fallbackModel: string | undefined;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    super();
    const connection = resolveAiConnection(config);
    this.baseUrl = connection.baseUrl || AI_PROVIDER_PRESETS.grok.baseUrl;
    this.configuredModel = connection.model || AI_PROVIDER_PRESETS.grok.model;
    this.apiKey = connection.key;
    this.fallbackModel = AI_PROVIDER_PRESETS.grok.fallbackModel;
    this.maxTokens = Number(config.get<string | number>('AI_MAX_TOKENS') ?? 900) || 900;
    this.timeoutMs = Number(config.get<string | number>('AI_TIMEOUT_MS') ?? 60_000) || 60_000;
  }

  get model(): string {
    return this.answeredWith ?? this.configuredModel;
  }

  complete(req: AiRequest): Promise<string> {
    return requestChatCompletion({
      label: 'Grok (xAI)',
      logger: this.logger,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      model: this.configuredModel,
      fallbackModel: this.fallbackModel,
      messages: req.messages,
      temperature: 0.7,
      maxTokens: this.maxTokens,
      timeoutMs: this.timeoutMs,
      onModelUsed: (model) => {
        this.answeredWith = model;
      },
    });
  }
}
