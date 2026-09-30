import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiProvider } from './providers/ai.provider';
import { OfflineAssistantProvider } from './providers/offline.provider';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider';

@Module({
  controllers: [AiController],
  providers: [
    OfflineAssistantProvider,
    OpenAiCompatibleProvider,
    {
      // The live provider is only used when AI_API_KEY is configured on the server.
      provide: AiProvider,
      inject: [ConfigService, OfflineAssistantProvider, OpenAiCompatibleProvider],
      useFactory: (config: ConfigService, offline: OfflineAssistantProvider, live: OpenAiCompatibleProvider) =>
        config.get<string>('AI_API_KEY') ? live : offline,
    },
    AiService,
  ],
})
export class AiModule {}
