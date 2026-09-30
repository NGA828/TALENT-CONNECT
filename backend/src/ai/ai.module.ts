import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiProvider } from './providers/ai.provider';
import { AI_PROVIDER_LABELS, resolveAiKey, selectAiProvider } from './providers/ai-config';
import { GrokProvider } from './providers/grok.provider';
import { OfflineAssistantProvider } from './providers/offline.provider';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';

const logger = new Logger('AiModule');

@Module({
  controllers: [AiController],
  providers: [
    OfflineAssistantProvider,
    GrokProvider,
    OpenAiCompatibleProvider,
    {
      /**
       * The live provider is used as soon as an API key is configured on the server
       * (`AI_API_KEY`, `XAI_API_KEY` or `GROK_API_KEY`). `AI_PROVIDER` picks the vendor:
       * `grok` (default, xAI), `openai-compatible` (OpenAI, OpenRouter, …) or `offline`.
       */
      provide: AiProvider,
      inject: [ConfigService, OfflineAssistantProvider, OpenAiCompatibleProvider, GrokProvider],
      useFactory: (config: ConfigService, offline: OfflineAssistantProvider, compatible: OpenAiCompatibleProvider, grok: GrokProvider) => {
        const key = resolveAiKey(config);
        const requested = config.get<string>('AI_PROVIDER');
        const id = selectAiProvider(requested, key);
        if (id === 'offline') {
          logger.log(
            key
              ? 'AI assistant: offline template assistant (AI_PROVIDER=offline).'
              : 'AI assistant: offline template assistant — set XAI_API_KEY (or AI_API_KEY) in backend/.env to switch on Grok.',
          );
          return offline;
        }
        const provider = id === 'grok' ? grok : compatible;
        logger.log(`AI assistant: live via ${AI_PROVIDER_LABELS[id]} (model ${provider.model}).`);
        return provider;
      },
    },
    AiService,
  ],
})
export class AiModule {}
