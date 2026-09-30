import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiRequest } from './ai.provider';

/** Works with OpenAI, OpenRouter and any other OpenAI-compatible /chat/completions endpoint. The key never leaves the backend. */
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
    this.baseUrl = (config.get<string>('AI_BASE_URL') ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    this.apiKey = config.get<string>('AI_API_KEY') ?? '';
    this.model = config.get<string>('AI_MODEL') ?? 'openai/gpt-4o-mini';
  }

  async complete(req: AiRequest): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://talent-connect.local',
          'X-Title': 'Talent Connect',
        },
        body: JSON.stringify({ model: this.model, messages: req.messages, temperature: 0.7, max_tokens: 700 }),
      });
      if (!res.ok) {
        this.logger.warn(`AI provider responded ${res.status}`);
        throw new ServiceUnavailableException('The AI service is temporarily unavailable. Please try again in a moment.');
      }
      const json: any = await res.json();
      const text = json?.choices?.[0]?.message?.content;
      if (!text) throw new ServiceUnavailableException('The AI service returned an empty answer. Please try again.');
      return String(text).trim();
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      this.logger.warn(`AI request failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException('The AI service could not be reached. Please try again in a moment.');
    } finally {
      clearTimeout(timer);
    }
  }
}
