import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiRequest } from './ai.provider';
import { AI_PROVIDER_PRESETS, resolveAiConnection } from './ai-config';
import { requestChatCompletion } from './chat-completions';

/**
 * Groq — the default provider. Open-weight models (Llama, gpt-oss, Qwen, Kimi …) served
 * on Groq's LPUs through its OpenAI-compatible endpoint:
 * https://api.groq.com/openai/v1/chat/completions
 *
 * The key is read on the server (`GROQ_API_KEY`, or `AI_API_KEY` as a fallback) and never
 * leaves the backend. Create one at https://console.groq.com → API Keys.
 */
@Injectable()
export class GroqProvider extends AiProvider {
  private readonly logger = new Logger(GroqProvider.name);
  readonly name = 'groq';
  readonly live = true;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly maxTokens: number;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    super();
    const connection = resolveAiConnection(config);
    this.baseUrl = connection.baseUrl || AI_PROVIDER_PRESETS.groq.baseUrl;
    this.model = connection.model || AI_PROVIDER_PRESETS.groq.model;
    this.apiKey = connection.key;
    this.maxTokens = Number(config.get<string | number>('AI_MAX_TOKENS') ?? 1024) || 1024;
    this.timeoutMs = Number(config.get<string | number>('AI_TIMEOUT_MS') ?? 45_000) || 45_000;
  }

  complete(req: AiRequest): Promise<string> {
    return requestChatCompletion({
      label: 'Groq',
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
