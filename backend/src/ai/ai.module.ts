import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiProvider } from './providers/ai.provider';
import { AI_PROVIDER_LABELS, resolveAiConnection } from './providers/ai-config';
import { GrokProvider } from './providers/grok.provider';
import { GroqProvider } from './providers/groq.provider';
import { OfflineAssistantProvider } from './providers/offline.provider';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';

const logger = new Logger('AiModule');

@Module({
  controllers: [AiController],
  providers: [
    OfflineAssistantProvider,
    GroqProvider,
    GrokProvider,
    OpenAiCompatibleProvider,
    {
      /**
       * Groq (api.groq.com) is the default. The assistant goes live as soon as a key is
       * configured — `GROQ_API_KEY` for Groq, `XAI_API_KEY` for xAI's Grok, `AI_API_KEY`
       * for a generic OpenAI-compatible endpoint (OpenAI, OpenRouter, a proxy …).
       * `AI_PROVIDER` picks the vendor: `groq` (default), `grok`, `openai-compatible` or `offline`.
       * With no key the offline template assistant answers and the UI says so.
       */
      provide: AiProvider,
      inject: [ConfigService, OfflineAssistantProvider, GroqProvider, GrokProvider, OpenAiCompatibleProvider],
      useFactory: (
        config: ConfigService,
        offline: OfflineAssistantProvider,
        groq: GroqProvider,
        grok: GrokProvider,
        compatible: OpenAiCompatibleProvider,
      ) => {
        const connection = resolveAiConnection(config);
        if (!connection.live) {
          logger.log(
            connection.requested === 'offline'
              ? 'AI assistant: offline template assistant (AI_PROVIDER=offline).'
              : `AI assistant: offline template assistant — ${connection.requested === 'groq' ? 'set GROQ_API_KEY in backend/.env' : 'set the API key for your provider in backend/.env'} to switch on ${AI_PROVIDER_LABELS[connection.requested]}.`,
          );
          return offline;
        }
        const provider = connection.id === 'groq' ? groq : connection.id === 'grok' ? grok : compatible;
        logger.log(`AI assistant: live via ${AI_PROVIDER_LABELS[connection.id]} (model ${provider.model}).`);
        return provider;
      },
    },
    AiService,
  ],
})
export class AiModule {}
