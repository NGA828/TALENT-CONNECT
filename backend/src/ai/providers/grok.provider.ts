import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiRequest } from './ai.provider';
import { resolveAiKey } from './ai-config';
import { requestChatCompletion } from './chat-completions';

const DEFAULT_BASE_URL = 'https://api.x.ai/v1';
const DEFAULT_MODEL = 'grok-4.7';

/**
 * xAI's Grok, called over its OpenAI-compatible chat completions endpoint
 * (https://api.x.ai/v1/chat/completions). The key is read from the server
 * (`AI_API_KEY`, `XAI_API_KEY` or `GROK_API_KEY`) and never leaves the backend.
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
    this.baseUrl = (config.get<string>('AI_BASE_URL') ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.apiKey = resolveAiKey(config);
    this.model = config.get<string>('AI_MODEL') ?? DEFAULT_MODEL;
    this.maxTokens = Number(config.get<string | number>('AI_MAX_TOKENS') ?? 900) || 900;
    this.timeoutMs = Number(config.get<string | number>('AI_TIMEOUT_MS') ?? 60_000) || 60_000;
  }

  complete(req: AiRequest): Promise<string> {
    return requestChatCompletion({
      label: 'Grok',
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
