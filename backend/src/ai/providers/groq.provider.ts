import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiRequest } from './ai.provider';
import { AI_PROVIDER_PRESETS, resolveAiConnection } from './ai-config';
import { requestChatCompletion } from './chat-completions';

/**
 * Groq — the default provider. Open-weight models (gpt-oss, Qwen, Llama …) served on Groq's
 * LPUs through its OpenAI-compatible endpoint:
 * https://api.groq.com/openai/v1/chat/completions
 *
 * The default model is `openai/gpt-oss-120b`: Groq shut `llama-3.3-70b-versatile` and
 * `llama-3.1-8b-instant` down for Free/Developer keys on 16 August 2026 and answers 404 for
 * them, so a stale `GROQ_MODEL` is retried once on `openai/gpt-oss-20b` instead of failing.
 * Current ids: https://console.groq.com/docs/models
 *
 * The key is read on the server (`GROQ_API_KEY`, or `AI_API_KEY` as a fallback) and never
 * leaves the backend. Create one at https://console.groq.com → API Keys.
 */
@Injectable()
export class GroqProvider extends AiProvider {
  private readonly logger = new Logger(GroqProvider.name);
  readonly name = 'groq';
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
    this.baseUrl = connection.baseUrl || AI_PROVIDER_PRESETS.groq.baseUrl;
    this.configuredModel = connection.model || AI_PROVIDER_PRESETS.groq.model;
    this.apiKey = connection.key;
    // Retried only when it differs from the configured model, so it costs nothing by default.
    this.fallbackModel = AI_PROVIDER_PRESETS.groq.fallbackModel;
    this.maxTokens = Number(config.get<string | number>('AI_MAX_TOKENS') ?? 1024) || 1024;
    this.timeoutMs = Number(config.get<string | number>('AI_TIMEOUT_MS') ?? 45_000) || 45_000;
  }

  get model(): string {
    return this.answeredWith ?? this.configuredModel;
  }

  complete(req: AiRequest): Promise<string> {
    return requestChatCompletion({
      label: 'Groq',
      logger: this.logger,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      model: this.configuredModel,
      fallbackModel: this.fallbackModel,
      messages: req.messages,
      temperature: 0.7,
      maxTokens: this.maxTokens,
      timeoutMs: this.timeoutMs,
      hideReasoning: true,
      onModelUsed: (model) => {
        this.answeredWith = model;
      },
    });
  }
}
